// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { PostHogClient } from './api/posthogClient';
import { ProjectsProvider } from './views/projectsProvider';
import { InsightsProvider } from './views/insightsProvider';
import { RecordingsProvider } from './views/recordingsProvider';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log('PostHog extension is now active');

  // Initialize API client
  const posthogClient = new PostHogClient();

  // Initialize tree view providers
  const projectsProvider = new ProjectsProvider(context);
  const insightsProvider = new InsightsProvider(context);
  const recordingsProvider = new RecordingsProvider(context);

  // Register tree views
  const projectsView = vscode.window.createTreeView('posthogProjects', {
    treeDataProvider: projectsProvider,
    showCollapseAll: true,
  });

  const insightsView = vscode.window.createTreeView('posthogInsights', {
    treeDataProvider: insightsProvider,
    showCollapseAll: true,
  });

  const recordingsView = vscode.window.createTreeView('posthogRecordings', {
    treeDataProvider: recordingsProvider,
    showCollapseAll: true,
  });

  // Register commands
  context.subscriptions.push(
    // Tree views
    projectsView,
    insightsView,
    recordingsView,

    // Set API Key command
    vscode.commands.registerCommand('posthog.setApiKey', async () => {
      const apiKey = await vscode.window.showInputBox({
        prompt: 'Enter your PostHog Personal API Key',
        placeHolder: 'phx_xxxxxxxxxxxxxxxxxxxx',
        password: true,
        ignoreFocusOut: true,
      });

      if (apiKey) {
        await posthogClient.updateApiKey(apiKey);

        // Try to verify the connection
        const isValid = await posthogClient.checkConnection();

        if (isValid) {
          vscode.window.showInformationMessage(
            'PostHog API key saved successfully!'
          );
          projectsProvider.refresh();
        } else {
          vscode.window.showErrorMessage(
            'Failed to connect to PostHog with the provided API key.'
          );
        }
      }
    }),

    // Set US API Host command
    vscode.commands.registerCommand('posthog.setUsApiHost', async () => {
      const usApiHost = 'https://us.posthog.com';
      await posthogClient.updateApiHost(usApiHost);
      vscode.window.showInformationMessage(
        `PostHog API host set to US Cloud: ${usApiHost}`
      );
      projectsProvider.refresh();
    }),

    // Set EU API Host command
    vscode.commands.registerCommand('posthog.setEuApiHost', async () => {
      const euApiHost = 'https://eu.posthog.com';
      await posthogClient.updateApiHost(euApiHost);
      vscode.window.showInformationMessage(
        `PostHog API host set to EU Cloud: ${euApiHost}`
      );
      projectsProvider.refresh();
    }),

    // Set Custom API Host command
    vscode.commands.registerCommand('posthog.setCustomApiHost', async () => {
      const customApiHost = await vscode.window.showInputBox({
        prompt: 'Enter your PostHog API host URL',
        placeHolder: 'https://your-instance.posthog.com',
        value: vscode.workspace.getConfiguration('posthog').get('apiHost'),
        ignoreFocusOut: true,
      });

      if (customApiHost) {
        await posthogClient.updateApiHost(customApiHost);
        vscode.window.showInformationMessage(
          `PostHog API host set to: ${customApiHost}`
        );
        projectsProvider.refresh();
      }
    }),

    // Debug API Connection command
    vscode.commands.registerCommand('posthog.debugConnection', async () => {
      const apiKey = vscode.workspace.getConfiguration('posthog').get('apiKey');
      const apiHost = vscode.workspace
        .getConfiguration('posthog')
        .get('apiHost');

      if (!apiKey) {
        vscode.window.showErrorMessage(
          'No API key configured. Please set your PostHog API key first.'
        );
        return;
      }

      vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: 'Testing PostHog API connection...',
          cancellable: false,
        },
        async () => {
          try {
            // Test connection with explicit test endpoint
            const isValid = await posthogClient.checkConnection();

            if (isValid) {
              vscode.window.showInformationMessage(
                `Successfully connected to PostHog API at ${apiHost}`
              );
            } else {
              const message = `Failed to connect to PostHog API at ${apiHost}. Please check your API key and host settings.`;
              const viewSettings = 'View Settings';
              const result = await vscode.window.showErrorMessage(
                message,
                viewSettings
              );

              if (result === viewSettings) {
                await vscode.commands.executeCommand(
                  'workbench.action.openSettings',
                  'posthog'
                );
              }
            }
          } catch (error) {
            console.error('Debug connection error:', error);
            vscode.window.showErrorMessage(
              `Connection test error: ${
                error instanceof Error ? error.message : String(error)
              }`
            );
          }
        }
      );
    }),

    // Copy Project Token command
    vscode.commands.registerCommand(
      'posthog.copyProjectToken',
      async (apiToken: string, projectName: string) => {
        await vscode.env.clipboard.writeText(apiToken);
        vscode.window.showInformationMessage(
          `Project API token for ${projectName} copied to clipboard!`
        );
      }
    ),

    // List Insights command
    vscode.commands.registerCommand(
      'posthog.listInsights',
      async (projectId: number, projectName: string) => {
        insightsProvider.setProject(projectId, projectName);
        recordingsProvider.setProject(projectId, projectName);
        await vscode.commands.executeCommand('posthogInsights.focus');
        vscode.window.showInformationMessage(
          `Viewing insights for project: ${projectName}`
        );
      }
    ),

    // View Insight Details command
    vscode.commands.registerCommand(
      'posthog.viewInsightDetails',
      async (projectId: number, insightId: number, insightName: string) => {
        const insight = await posthogClient.getInsightDetails(
          projectId,
          insightId
        );

        if (insight) {
          // Create and show a webview panel to display the insight details
          const panel = vscode.window.createWebviewPanel(
            'posthogInsightDetails',
            `PostHog Insight: ${insightName}`,
            vscode.ViewColumn.One,
            { enableScripts: true }
          );

          panel.webview.html = getInsightDetailsWebview(insight);
        } else {
          vscode.window.showErrorMessage(
            `Failed to get details for insight: ${insightName}`
          );
        }
      }
    ),

    // Create Annotation command
    vscode.commands.registerCommand(
      'posthog.createAnnotation',
      async (projectId: number, projectName: string) => {
        const content = await vscode.window.showInputBox({
          prompt: 'Enter annotation content',
          placeHolder: 'e.g., "Released version 1.2.3"',
          ignoreFocusOut: true,
        });

        if (content) {
          // Let the user choose if they want to use the current time or a custom date
          const dateOption = await vscode.window.showQuickPick(
            ['Current time', 'Custom date/time'],
            { placeHolder: 'Select when this annotation should be marked' }
          );

          let dateMarker: string | undefined = undefined;

          if (dateOption === 'Custom date/time') {
            const customDate = await vscode.window.showInputBox({
              prompt: 'Enter date and time (ISO format)',
              placeHolder: 'YYYY-MM-DDTHH:MM:SSZ (e.g., 2023-10-15T14:30:00Z)',
              ignoreFocusOut: true,
            });

            if (customDate) {
              dateMarker = customDate;
            }
          }

          const annotation = await posthogClient.createAnnotation(
            projectId,
            content,
            dateMarker
          );

          if (annotation) {
            vscode.window.showInformationMessage(
              `Annotation created successfully for project: ${projectName}`
            );
          } else {
            vscode.window.showErrorMessage(
              `Failed to create annotation for project: ${projectName}`
            );
          }
        }
      }
    ),

    // View Session Recordings command
    vscode.commands.registerCommand(
      'posthog.viewSessionRecordings',
      async (projectId: number, projectName: string) => {
        recordingsProvider.setProject(projectId, projectName);
        await vscode.commands.executeCommand('posthogRecordings.focus');
        vscode.window.showInformationMessage(
          `Viewing session recordings for project: ${projectName}`
        );
      }
    )
  );
}

function getInsightDetailsWebview(insight: any): string {
  // Extract relevant information from the insight
  const name =
    insight.name || insight.derived_name || `Insight ${insight.short_id}`;
  const description = insight.description || 'No description provided';

  // Format created date
  const createdDate = insight.created_at
    ? new Date(insight.created_at).toLocaleDateString()
    : 'Unknown date';

  // Format creator information
  const creator = insight.created_by
    ? `${insight.created_by.first_name} ${insight.created_by.last_name}`.trim()
    : 'Unknown user';

  // Generate tags HTML if available
  let tagsHtml = '';
  if (insight.tags && insight.tags.length > 0) {
    tagsHtml = `
      <div class="tags">
        ${insight.tags
          .map((tag: string) => `<span class="tag">${tag}</span>`)
          .join('')}
      </div>
    `;
  }

  // Generate a link to open the insight in PostHog
  const apiHost =
    vscode.workspace.getConfiguration('posthog').get('apiHost') ||
    'https://us.posthog.com';
  const insightLink = `${apiHost}/insights/${insight.short_id}`;

  // Prepare chart data
  let chartHtml = '';
  let chartScript = '';

  try {
    // Check if insight has result data
    if (insight.result && Array.isArray(insight.result)) {
      const hasValidData = insight.result.length > 0;

      if (hasValidData) {
        // Create a chart container
        chartHtml = `
          <div class="chart-container">
            <canvas id="insightChart" width="700" height="400"></canvas>
          </div>
        `;

        // Generate data for the chart
        const chartData = prepareChartData(insight);
        // Generate script for the chart
        if (chartData) {
          chartScript = `
            <script>
              // Wait for the DOM to be ready
              document.addEventListener('DOMContentLoaded', function() {
                const ctx = document.getElementById('insightChart').getContext('2d');
                
                // Create the chart
                const chart = new Chart(ctx, ${JSON.stringify(chartData)});
              });
            </script>
          `;
        }
      }
    }
  } catch (error) {
    console.error('Error creating chart:', error);
    chartHtml = '<p>Error rendering chart visualization</p>';
  }

  // Generate result visualization if possible
  let resultHtml = '';
  if (insight.result) {
    try {
      resultHtml = `
        <div class="result-preview">
          <h3>Result Data</h3>
          <pre class="json-result">${JSON.stringify(
            insight.result,
            null,
            2
          )}</pre>
        </div>
      `;
    } catch (error) {
      resultHtml = '<p>Error rendering result preview</p>';
    }
  }

  // Return complete HTML for the webview
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>PostHog Insight: ${name}</title>
      <!-- Import Chart.js -->
      <script src="https://cdn.jsdelivr.net/npm/chart.js@3.9.1/dist/chart.min.js"></script>
      <style>
        body {
          font-family: var(--vscode-font-family);
          padding: 20px;
          color: var(--vscode-foreground);
        }
        h1, h2, h3 {
          color: var(--vscode-editor-foreground);
        }
        .container {
          max-width: 800px;
          margin: 0 auto;
        }
        .info-table {
          width: 100%;
          border-collapse: collapse;
          margin: 20px 0;
        }
        .info-table td, .info-table th {
          padding: 8px 12px;
          text-align: left;
          border-bottom: 1px solid var(--vscode-panel-border);
        }
        .info-table th {
          width: 30%;
          color: var(--vscode-descriptionForeground);
        }
        .tag {
          display: inline-block;
          background-color: var(--vscode-badge-background);
          color: var(--vscode-badge-foreground);
          border-radius: 4px;
          padding: 2px 8px;
          margin-right: 5px;
          font-size: 12px;
        }
        .json-result {
          background-color: var(--vscode-textCodeBlock-background);
          padding: 10px;
          border-radius: 4px;
          overflow: auto;
          max-height: 400px;
          font-family: var(--vscode-editor-font-family);
          font-size: 12px;
        }
        .button {
          background-color: var(--vscode-button-background);
          color: var(--vscode-button-foreground);
          border: none;
          padding: 8px 16px;
          border-radius: 2px;
          cursor: pointer;
          font-size: 14px;
          margin-top: 20px;
          display: inline-block;
          text-decoration: none;
        }
        .chart-container {
          margin: 20px 0;
          padding: 15px;
          background-color: var(--vscode-editor-background);
          border-radius: 4px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>${name}</h1>
        <p>${description}</p>
        ${tagsHtml}
        
        <!-- Chart visualization -->
        ${chartHtml}
        
        <h2>Details</h2>
        <table class="info-table">
          <tr>
            <th>Created On</th>
            <td>${createdDate}</td>
          </tr>
          <tr>
            <th>Created By</th>
            <td>${creator}</td>
          </tr>
          <tr>
            <th>Last Refresh</th>
            <td>${insight.last_refresh || 'N/A'}</td>
          </tr>
          <tr>
            <th>Query Status</th>
            <td>${insight.query_status || 'N/A'}</td>
          </tr>
        </table>
        
        ${resultHtml}
        
        <a href="${insightLink}" class="button">Open in PostHog</a>
      </div>
      
      <!-- Chart.js script -->
      ${chartScript}
    </body>
    </html>
  `;
}

/**
 * Prepare chart data based on insight type and result data
 */
function prepareChartData(insight: any): any {
  let chartType = 'line';
  let labels: string[] = [];
  let datasets: any[] = [];

  try {
    // Determine insight type based on available data
    const hasDisplayType = insight.filters?.display || insight.query?.display;
    if (hasDisplayType) {
      // Map PostHog display types to Chart.js chart types
      const displayType = insight.filters?.display || insight.query?.display;
      switch (displayType) {
        case 'ActionsBarValue':
        case 'ActionsPie':
          chartType = 'pie';
          break;
        case 'ActionsBar':
          chartType = 'bar';
          break;
        case 'ActionsLineGraph':
        default:
          chartType = 'line';
          break;
      }
    }

    // Extract data based on result structure
    if (Array.isArray(insight.result)) {
      // Handle trend/time series data
      if (insight.result[0]?.days || insight.result[0]?.dates) {
        // It's a time series chart
        const timeField = insight.result[0]?.days ? 'days' : 'dates';
        labels = insight.result[0][timeField] || [];

        datasets = insight.result.map((series: any, index: number) => {
          // Generate a deterministic color based on index
          const hue = (index * 137) % 360; // Golden angle approximation for better distribution
          const color = `hsl(${hue}, 70%, 60%)`;

          return {
            label: series.label || `Series ${index + 1}`,
            data: series.data || series.count || [],
            backgroundColor: color,
            borderColor: color,
            borderWidth: 2,
            fill: false,
          };
        });
      }
      // Handle breakdown data
      else if (
        insight.result.some((item: any) => item.breakdown_value !== undefined)
      ) {
        const breakdownData = insight.result;
        const uniqueBreakdowns = [
          ...new Set(breakdownData.map((item: any) => item.breakdown_value)),
        ];

        labels = uniqueBreakdowns.map((value: any) => String(value || 'None'));

        const seriesData = uniqueBreakdowns.map((breakdown: any) => {
          const matchingItems = breakdownData.filter(
            (item: any) => item.breakdown_value === breakdown
          );
          return matchingItems.reduce(
            (sum: number, item: any) => sum + (item.count || 0),
            0
          );
        });

        datasets = [
          {
            label: 'Breakdown',
            data: seriesData,
            backgroundColor: labels.map(
              (_, i) => `hsl(${(i * 137) % 360}, 70%, 60%)`
            ),
            borderWidth: 1,
          },
        ];
      }
      // Handle funnel data
      else if (
        insight.filters?.insight === 'FUNNELS' ||
        insight.result.some((item: any) => item.action_id !== undefined)
      ) {
        chartType = 'bar';
        const steps = insight.result;

        labels = steps.map(
          (step: any, index: number) => step.name || `Step ${index + 1}`
        );

        const data = steps.map((step: any) => step.count || 0);

        datasets = [
          {
            label: 'Conversion',
            data: data,
            backgroundColor: 'rgba(66, 153, 225, 0.6)',
            borderColor: 'rgb(66, 153, 225)',
            borderWidth: 1,
          },
        ];
      }
      // Fallback for other types of results
      else {
        chartType = 'bar';
        labels = insight.result.map((_: any, i: number) => `Item ${i + 1}`);
        datasets = [
          {
            label: 'Values',
            data: insight.result.map((item: any) =>
              typeof item === 'number' ? item : item.count || item.value || 0
            ),
            backgroundColor: 'rgba(66, 153, 225, 0.6)',
            borderColor: 'rgb(66, 153, 225)',
            borderWidth: 1,
          },
        ];
      }
    }

    // Return the chart configuration
    return {
      type: chartType,
      data: {
        labels: labels,
        datasets: datasets,
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: {
              color: 'var(--vscode-foreground)',
            },
          },
          tooltip: {
            enabled: true,
          },
        },
        scales:
          chartType !== 'pie'
            ? {
                x: {
                  ticks: {
                    color: 'var(--vscode-foreground)',
                  },
                  grid: {
                    color: 'var(--vscode-panel-border)',
                  },
                },
                y: {
                  ticks: {
                    color: 'var(--vscode-foreground)',
                  },
                  grid: {
                    color: 'var(--vscode-panel-border)',
                  },
                },
              }
            : undefined,
      },
    };
  } catch (error) {
    console.error('Error preparing chart data:', error);
    return null;
  }
}

// This method is called when your extension is deactivated
export function deactivate() {
  // Clean up resources
}
