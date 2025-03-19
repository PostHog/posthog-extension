# PostHog for VS Code

Access PostHog insights, projects, and features directly from VS Code. This extension allows you to interact with your PostHog data without leaving your development environment.

## Features

- **Projects View**: Browse all your PostHog projects and copy project API tokens for integration
- **Insights View**: See all insights from your selected project with interactive visualizations
- **Session Recordings**: View and open session recordings to understand user behavior
- **Create Annotations**: Add annotations for releases or important events
- **Data Visualization**: View beautiful charts of your insight data using Chart.js
- **Multiple Environments**: Connect to US Cloud, EU Cloud, or self-hosted PostHog instances
- **Debug Tools**: Test your PostHog connection with detailed diagnostics

## Getting Started

1. Install the extension from the VS Code marketplace
2. Get your Personal API Key from PostHog:
   - Go to your PostHog instance
   - Click on your profile in the top right
   - Select "Settings" > "Personal API Keys"
   - Create a new key with appropriate scopes (at minimum: `projects:read`, `insights:read`)
3. In VS Code:
   - Open the PostHog explorer view in the activity sidebar
   - Click "Set PostHog API Key" or use the command palette to run "PostHog: Set API Key"
   - Choose your API host (US Cloud, EU Cloud, or custom) using the command palette
   - Start exploring your PostHog data!

## Requirements

- A PostHog account with valid API access
- VS Code 1.58.0 or higher
- Personal API Key with appropriate scopes

## Configuration

This extension contributes the following settings:

- `posthog.apiKey`: Your personal PostHog API key
- `posthog.apiHost`: PostHog API host (default: `https://us.posthog.com`)

## Extension Usage

### Projects

The PostHog explorer view shows all your projects. Click on a project to:

- Copy the project's API token for integration in your code
- View insights for that project
- View session recordings
- Create annotations

### Insights

After selecting a project, the Insights view displays all insights from that project. Click on an insight to:

- View a visual chart of the insight data
- See detailed information about the insight
- View the raw result data
- Open the insight in the PostHog web app

### Session Recordings

The Session Recordings view shows all recordings for the selected project. Click on a recording to open it in your browser.

### Annotations

You can create annotations for project events (like releases) directly from VS Code:

1. Select a project in the Projects view
2. Click "Create Annotation"
3. Enter the annotation text
4. Choose whether to use the current time or a custom date/time

### API Connection Management

The extension provides several commands to manage your PostHog API connection:

- **PostHog: Set API Key** - Configure your personal API key
- **PostHog: Set US Cloud API Host** - Connect to the US Cloud instance
- **PostHog: Set EU Cloud API Host** - Connect to the EU Cloud instance
- **PostHog: Set Custom API Host** - Connect to a self-hosted or custom instance
- **PostHog: Debug API Connection** - Test your connection and view detailed diagnostics

## Data Visualization

The extension uses Chart.js to create interactive visualizations for your PostHog insights:

- Time series data appears as line charts
- Funnel data appears as bar charts
- Breakdown data appears as pie charts
- All charts respect VS Code's theme settings

## Publishing the Extension

To publish this extension to the VS Code Marketplace:

1. Install the VSCE tool: `npm install -g @vscode/vsce`
2. Update the `package.json` with publisher info and other metadata
3. Create a Visual Studio Marketplace publisher account
4. Generate a Personal Access Token in Azure DevOps
5. Login with VSCE: `vsce login <publisher>`
6. Package the extension: `vsce package`
7. Publish the extension: `vsce publish`

For more detailed instructions, visit [Publishing Extensions](https://code.visualstudio.com/api/working-with-extensions/publishing-extension).

## License

This extension is licensed under the MIT License.

## Privacy

This extension interacts with the PostHog API using your personal API key. Your API key is stored securely in VS Code's configuration storage. No other data is collected by this extension.

## Release Notes

### 1.0.0

Initial release of the PostHog extension for VS Code:

- View all your PostHog projects
- Browse and visualize insights with Chart.js
- View session recordings
- Create annotations
- Connect to US or EU cloud instances
- Debug API connections
- Support for different chart types based on insight data

---

**Enjoy!**
