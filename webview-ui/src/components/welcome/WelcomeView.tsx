import { VSCodeButton, VSCodeLink } from '@vscode/webview-ui-toolkit/react'
import { useEffect, useState } from 'react'
import { useExtensionState } from '../../context/ExtensionStateContext'
import { validateApiConfiguration } from '../../utils/validate'
import { vscode } from '../../utils/vscode'
import ApiOptions from '../settings/ApiOptions'
import PostHogLogoWhite from '../../assets/PostHogLogoWhite'
import AutocompleteOptions from '../settings/AutocompleteOptions'

const WelcomeView = () => {
    const { apiConfiguration } = useExtensionState()
    const [apiErrorMessage, setApiErrorMessage] = useState<string | undefined>(undefined)
    const [showApiOptions, setShowApiOptions] = useState(false)

    const disableLetsGoButton = apiErrorMessage != null

    const handleSubmit = () => {
        vscode.postMessage({ type: 'apiConfiguration', apiConfiguration })
    }

    useEffect(() => {
        setApiErrorMessage(validateApiConfiguration(apiConfiguration))
    }, [apiConfiguration])

    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                padding: '0 0px',
                display: 'flex',
                flexDirection: 'column',
            }}
        >
            <div
                style={{
                    height: '100%',
                    padding: '0 20px',
                    overflow: 'auto',
                }}
            >
                <h2>Hi, I'm PostHog</h2>
                <div style={{ display: 'flex', justifyContent: 'center', margin: '20px 0' }}>
                    <PostHogLogoWhite className="size-16" />
                </div>
                <p>
                    I can do all kinds of tasks thanks to breakthroughs in{' '}
                    <VSCodeLink href="https://www.anthropic.com/claude/sonnet" style={{ display: 'inline' }}>
                        Claude 3.7 Sonnet's
                    </VSCodeLink>
                    agentic coding capabilities and access to tools that let me create & edit files, explore complex
                    projects, use a browser, and execute terminal commands <i>(with your permission, of course)</i>. I
                    can even use MCP to create new tools and extend my own capabilities.
                </p>

                <p style={{ color: 'var(--vscode-descriptionForeground)' }}>
                    Sign up for an account to get started for free, or use an API key that provides access to models
                    like Claude 3.7 Sonnet.
                </p>

                {!showApiOptions && (
                    <VSCodeButton
                        appearance="secondary"
                        onClick={() => setShowApiOptions(!showApiOptions)}
                        style={{ marginTop: 10, width: '100%' }}
                    >
                        Use your own API key
                    </VSCodeButton>
                )}

                <div style={{ marginTop: '18px' }}>
                    {showApiOptions && (
                        <div>
                            <ApiOptions showModelOptions={false} />
                            <AutocompleteOptions />
                            <VSCodeButton
                                onClick={handleSubmit}
                                disabled={disableLetsGoButton}
                                style={{ marginTop: '3px' }}
                            >
                                Let's go!
                            </VSCodeButton>
                            {apiErrorMessage && (
                                <p style={{ color: 'var(--vscode-errorForeground)' }}>{apiErrorMessage}</p>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default WelcomeView
