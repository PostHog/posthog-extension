import * as vscode from 'vscode'
import { Logger } from '../../services/logging/Logger'
import { MerkleTreeWalker } from './walker'
import { Codebase, CodebaseSyncStatus, ExtensionConfig, SyncStatus, TreeNode, UploadArtifactBody } from './types'

export class WorkspaceSync {
    private context: vscode.ExtensionContext
    private config: ExtensionConfig

    private workspacePath: string
    private branchHash: string
    private codebaseId: string | null

    constructor(context: vscode.ExtensionContext, config: ExtensionConfig, workspacePath: string, branchHash: string) {
        this.context = context
        this.config = config
        this.workspacePath = workspacePath
        this.branchHash = branchHash
        this.codebaseId = null
    }

    async init() {
        try {
            let codebaseId = await this.context.workspaceState.get<string>(this.codebaseIdKey)
            if (!codebaseId) {
                codebaseId = await this.createCodebase()
                await this.context.workspaceState.update(this.codebaseIdKey, codebaseId)
            }
            this.codebaseId = codebaseId
        } catch (e) {
            Logger.log(`Failed to initialize the CodebaseSync: ${e}.`)
        }
    }

    async *retrieveDivergingFiles() {
        Logger.log(`canSync: ${this.canSync}`)
        if (!this.canSync) {
            return
        }

        const merkleTree = await new MerkleTreeWalker(this.workspacePath).buildTree()
        const treeNodes = Array.from(merkleTree.toTreeNodes())
        const status = await this.checkSyncedCodebase(treeNodes)

        if (status.synced) {
            return
        }

        const hashToNodeMap = merkleTree.toLeafNodesMap()
        for (const nodeHash of status.diverging_files) {
            const node = hashToNodeMap.get(nodeHash)
            if (node) {
                yield node
            }
        }
    }

    private async createCodebase(): Promise<string> {
        const url = new URL(`/api/projects/${this.config.projectId}/codebases`, this.config.host)
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${this.config.apiKey}`,
            },
        })
        const data = (await response.json()) as Codebase
        return data.id
    }

    private async checkSyncedCodebase(treeNodes: TreeNode[]) {
        const url = new URL(
            `/api/projects/${this.config.projectId}/codebases/${this.codebaseId}/sync`,
            this.config.host
        )
        const response = await fetch(url, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${this.config.apiKey}`,
            },
            body: JSON.stringify({
                tree: treeNodes,
            }),
        })
        const data = (await response.json()) as CodebaseSyncStatus
        return data
    }

    async uploadArtifact(file: UploadArtifactBody) {
        const url = new URL(
            `/api/projects/${this.config.projectId}/codebases/${this.codebaseId}/upload_artifact`,
            this.config.host
        )

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${this.config.apiKey}`,
            },
            body: JSON.stringify(file),
        })

        if (!response.ok || response.status !== 202) {
            throw new Error(`Failed to upload artifact: ${response.statusText}`)
        }
    }

    private get codebaseIdKey(): string {
        return `codebase_key_${this.workspacePath}`
    }

    private get lastSyncKey(): string {
        return `codebase_${this.codebaseId}_sync_status`
    }

    private get lastSyncStatus(): SyncStatus | undefined {
        return this.context.workspaceState.get<SyncStatus>(this.lastSyncKey)
    }

    /**
     * Returns true if the codebase cab be synced.
     * Two conditions: timestamp has changed, or branch has changed.
     */
    private get canSync(): boolean {
        if (!this.codebaseId) {
            return false
        }

        const lastSyncStatus = this.lastSyncStatus
        if (!lastSyncStatus) {
            return true
        }

        const tenMinutesAgo = Date.now() - 1000 * 60 * 10 // 10m
        return lastSyncStatus.ts < tenMinutesAgo || lastSyncStatus.hash !== this.branchHash
    }
}
