import { createCipheriv, createDecipheriv, createHmac, randomBytes } from 'node:crypto'

import { ConfigManager } from '~/shared/conf'

export class PathObfuscator {
    private readonly ALGO = 'aes-256-gcm'
    private readonly NONCE_LEN = 6
    private readonly TAG_LEN = 16

    private encryptionKey: Buffer | null = null

    constructor(private readonly configManager: ConfigManager) {}

    private async init() {
        const existingKey = await this.configManager.getSecretValue('encryptionKey')
        if (existingKey) {
            this.encryptionKey = Buffer.from(existingKey, 'hex')
        } else {
            // Generate a new random key (32 bytes)
            const newKey = randomBytes(32).toString('hex')

            // Store the key in VSCode's secret storage
            await this.configManager.setSecretValue('encryptionKey', newKey)

            this.encryptionKey = Buffer.from(newKey, 'hex')
        }
    }

    async obfuscatePath(path: string): Promise<string> {
        await this.init()

        // split by / or . but *keep* the delimiters in the output
        const parts = path.split(/([/.])/) // ["src", "/", "utils", ".", "ts"]
        return parts.map((p) => (p === '/' || p === '.' ? p : this.encryptSegment(p))).join('')
    }

    async revealPath(obfuscated: string): Promise<string> {
        await this.init()

        // We can split only on "/" because "." was kept as delimiter above
        return obfuscated
            .split('/')
            .map((segmentBlock) =>
                segmentBlock
                    .split('.') // <enc1>.<enc2>…
                    .map((segment) => this.decryptSegment(segment))
                    .join('.')
            )
            .join('/')
    }

    private get key() {
        if (!this.encryptionKey) {
            throw new Error('Path obfuscator is not initialized.')
        }
        return this.encryptionKey
    }

    private nonceFor(segment: string): Buffer {
        return createHmac('sha256', this.key).update(segment).digest().subarray(0, this.NONCE_LEN)
    }

    private encryptSegment(segment: string): string {
        const nonce6 = this.nonceFor(segment)
        const iv = Buffer.concat([nonce6, Buffer.alloc(6)])
        const cipher = createCipheriv(this.ALGO, this.key, iv)

        const cipherText = Buffer.concat([cipher.update(segment, 'utf8'), cipher.final(), cipher.getAuthTag()])

        return Buffer.concat([nonce6, cipherText]).toString('base64url')
    }

    private decryptSegment(encodedSegment: string): string {
        const buf = Buffer.from(encodedSegment, 'base64url')

        const nonce6 = buf.subarray(0, this.NONCE_LEN)
        const iv = Buffer.concat([nonce6, Buffer.alloc(6)])
        const payload = buf.subarray(this.NONCE_LEN)
        const cipherText = payload.subarray(0, payload.length - this.TAG_LEN)
        const authTag = payload.subarray(payload.length - this.TAG_LEN)

        const decipher = createDecipheriv(this.ALGO, this.key, iv)
        decipher.setAuthTag(authTag)

        return Buffer.concat([decipher.update(cipherText), decipher.final()]).toString('utf8')
    }
}
