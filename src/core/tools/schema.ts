import { z } from 'zod'

export const BasePostHogToolConfigSchema = z.object({
    posthogApiKey: z.string(),
    posthogHost: z.string(),
    posthogProjectId: z.string(),
})

export const CreateFeatureFlagToolInputSchema = z.object({
    body: z.object({
        key: z.string(),
        name: z.string(),
        active: z.boolean(),
    }),
})

export type CreateFeatureFlagToolInput = z.infer<typeof CreateFeatureFlagToolInputSchema>

export const CreateFeatureFlagToolOutputSchema = z.object({
    id: z.number(),
    name: z.string(),
    key: z.string(),
    active: z.boolean(),
})

export type CreateFeatureFlagToolOutput = z.infer<typeof CreateFeatureFlagToolOutputSchema>

export const ListFeatureFlagsToolInputSchema = z.object({
    query: z
        .object({
            active: z.boolean().optional(),
            search: z.string().optional(),
        })
        .optional(),
})

export const ListFeatureFlagsToolOutputSchema = z.object({
    results: z.array(z.object({}).passthrough()),
    count: z.number(),
})

export type ListFeatureFlagsToolInput = z.infer<typeof ListFeatureFlagsToolInputSchema>
export type ListFeatureFlagsToolOutput = z.infer<typeof ListFeatureFlagsToolOutputSchema>

export const UpdateFeatureFlagToolInputSchema = z.object({
    id: z.coerce.number(),
    body: z.object({
        active: z.boolean().optional(),
    }),
})

export type UpdateFeatureFlagToolInput = z.infer<typeof UpdateFeatureFlagToolInputSchema>

export const UpdateFeatureFlagToolOutputSchema = z.object({
    id: z.number(),
    active: z.boolean(),
})

export type UpdateFeatureFlagToolOutput = z.infer<typeof UpdateFeatureFlagToolOutputSchema>
