import { useCallback, useEffect, useState } from 'react'
import { useEvent } from 'react-use'
import { ExtensionMessage } from '../../src/shared/ExtensionMessage'
import ChatView from './components/chat/ChatView'
import HistoryView from './components/history/HistoryView'
import SettingsView from './components/settings/SettingsView'
import WelcomeView from './components/welcome/WelcomeView'
import { ExtensionStateContextProvider, useExtensionState } from './context/ExtensionStateContext'
import McpView from './components/mcp/McpView'

const AppContent = () => {
    const { didHydrateState, showWelcome, telemetrySetting, vscMachineId } = useExtensionState()
    const [showSettings, setShowSettings] = useState(false)
    const [showHistory, setShowHistory] = useState(false)
    const [showMcp, setShowMcp] = useState(false)

    const handleMessage = useCallback((e: MessageEvent) => {
        const message: ExtensionMessage = e.data
        switch (message.type) {
            case 'action':
                switch (message.action!) {
                    case 'settingsButtonClicked':
                        setShowSettings(true)
                        setShowHistory(false)
                        setShowMcp(false)
                        break
                    case 'historyButtonClicked':
                        setShowSettings(false)
                        setShowHistory(true)
                        setShowMcp(false)
                        break
                    case 'mcpButtonClicked':
                        setShowSettings(false)
                        setShowHistory(false)
                        setShowMcp(true)
                        break
                    case 'chatButtonClicked':
                        setShowSettings(false)
                        setShowHistory(false)
                        setShowMcp(false)
                        break
                }
                break
        }
    }, [])

    useEvent('message', handleMessage)

    // useEffect(() => {
    // 	if (telemetrySetting === "enabled") {
    // 		posthog.identify(vscMachineId)
    // 		posthog.opt_in_capturing()
    // 	} else {
    // 		posthog.opt_out_capturing()
    // 	}
    // }, [telemetrySetting, vscMachineId])

    if (!didHydrateState) {
        return null
    }

    return (
        <>
            {showWelcome ? (
                <WelcomeView />
            ) : (
                <>
                    {showSettings && <SettingsView onDone={() => setShowSettings(false)} />}
                    {showHistory && <HistoryView onDone={() => setShowHistory(false)} />}
                    {showMcp && <McpView onDone={() => setShowMcp(false)} />}
                    {/* Do not conditionally load ChatView, it's expensive and there's state we don't want to lose (user input, disableInput, askResponse promise, etc.) */}
                    <ChatView
                        showHistoryView={() => {
                            setShowSettings(false)
                            setShowMcp(false)
                            setShowHistory(true)
                        }}
                        isHidden={showSettings || showHistory || showMcp}
                    />
                </>
            )}
        </>
    )
}

const App = () => {
    return (
        <ExtensionStateContextProvider>
            <AppContent />
        </ExtensionStateContextProvider>
    )
}

export default App
