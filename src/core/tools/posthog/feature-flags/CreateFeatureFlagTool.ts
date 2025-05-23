import type { ToolUse } from '~/core/assistant-message'

import type { CreateFeatureFlagToolInput, CreateFeatureFlagToolOutput } from '../../schema'
import {
    BasePostHogToolConfigSchema,
    CreateFeatureFlagToolInputSchema,
    CreateFeatureFlagToolOutputSchema,
} from '../../schema'
import type { ToolOutput } from '../../types'
import { PostHogTool } from '../PostHogTool'

export class CreateFeatureFlagTool extends PostHogTool<CreateFeatureFlagToolInput, CreateFeatureFlagToolOutput> {
    autoApprove = false
    name = 'create_feature_flag'
    sayToolName = 'createFeatureFlag' as const
    description = 'Create a new feature flag'
    inputSchema = CreateFeatureFlagToolInputSchema
    outputSchema = CreateFeatureFlagToolOutputSchema

    static isValidConfig(config: unknown): boolean {
        const result = BasePostHogToolConfigSchema.safeParse(config)

        return result.success
    }

    static getToolDefinitionForPrompt() {
        return `Description: Create a feature flag in PostHog. You can then implement the feature flag in the codebase using the feature flag key.
Parameters:
- body: (required) A JSON object containing the feature flag's name, key, and active value.
Usage:
<create_feature_flag>
<body>
{
  "name": "Feature flag name",
  "key": "feature-flag-key",
  "active": true or false
}
</body>
</create_feature_flag>`
    }

    async execute(input: CreateFeatureFlagToolInput): Promise<ToolOutput<CreateFeatureFlagToolOutput>> {
        try {
            const data = await this.makeRequest<unknown>(
                `projects/${this.config.posthogProjectId}/feature_flags/`,
                'POST',
                {
                    key: input.body.key,
                    name: input.body.name,
                    active: input.body.active,
                    filters: {
                        groups: [
                            {
                                properties: [],
                                rollout_percentage: 100,
                                variant: null,
                            },
                        ],
                        multivariate: null,
                        payloads: {},
                    },
                    deleted: false,
                    is_simple_flag: false,
                    rollout_percentage: null,
                    ensure_experience_continuity: false,
                    experiment_set: null,
                    features: [],
                    rollback_conditions: [],
                    surveys: null,
                    performed_rollback: false,
                    tags: [],
                    is_remote_configuration: false,
                    has_encrypted_payloads: false,
                }
            )

            return {
                success: true,
                data: this.validateOutput(data),
            }
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
            }
        }
    }

    getToolUsageDescription(block: ToolUse): string {
        try {
            return `[create feature flag with key ${block.params.body ? JSON.parse(block.params.body)?.key : ''}]`
        } catch (error) {
            return `[create feature flag]`
        }
    }
}
