export type AssistantMessageContent = TextContent | ToolUse

export { parseAssistantMessage } from './parse-assistant-message'

export interface TextContent {
    type: 'text'
    content: string
    partial: boolean
}

export const toolUseNames = [
    'execute_command',
    'read_file',
    'write_to_file',
    'replace_in_file',
    'search_files',
    'list_files',
    'list_code_definition_names',
    'browser_action',
    'use_mcp_tool',
    'access_mcp_resource',
    'ask_followup_question',
    'plan_mode_respond',
    'attempt_completion',
    'search_docs',
    'add_capture_calls',
] as const

// Converts array of tool call names into a union type ("execute_command" | "read_file" | ...)
export type ToolUseName = (typeof toolUseNames)[number]

export const toolParamNames = [
    'command',
    'requires_approval',
    'proceed_immediately',
    'path',
    'content',
    'diff',
    'regex',
    'file_pattern',
    'recursive',
    'action',
    'url',
    'coordinate',
    'text',
    'server_name',
    'tool_name',
    'arguments',
    'uri',
    'question',
    'options',
    'response',
    'result',
    'query',
    'paths',
    'tracking_conventions',
] as const

export type ToolParamName = (typeof toolParamNames)[number]

export interface ToolUse {
    type: 'tool_use'
    name: ToolUseName
    // params is a partial record, allowing only some or none of the possible parameters to be used
    params: Partial<Record<ToolParamName, string>>
    partial: boolean
}
