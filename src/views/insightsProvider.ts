import * as vscode from "vscode";
import { PostHogClient } from "../api/posthogClient";
import { PostHogInsight } from "../models/types";
import dayjs from "dayjs";
import relativeTimePlugin from "dayjs/plugin/relativeTime";

// Extend dayjs with relative time plugin
dayjs.extend(relativeTimePlugin);

// Base interface for all insight tree items
interface IInsightTreeItem extends vscode.TreeItem {
  // Common properties if needed
}

export class InsightsProvider
  implements vscode.TreeDataProvider<IInsightTreeItem>
{
  private _onDidChangeTreeData: vscode.EventEmitter<
    IInsightTreeItem | undefined | null | void
  > = new vscode.EventEmitter<IInsightTreeItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<
    IInsightTreeItem | undefined | null | void
  > = this._onDidChangeTreeData.event;

  private client: PostHogClient;
  private currentProjectId: number | null = null;
  private currentProjectName: string | null = null;
  private insights: PostHogInsight[] = [];

  constructor(private context: vscode.ExtensionContext) {
    this.client = new PostHogClient();
  }

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  setProject(projectId: number, projectName: string): void {
    this.currentProjectId = projectId;
    this.currentProjectName = projectName;
    this.refresh();
  }

  getTreeItem(element: IInsightTreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: IInsightTreeItem): Promise<IInsightTreeItem[]> {
    // If no project is selected, show a message
    if (!this.currentProjectId) {
      return [new SelectProjectItem()];
    }

    // If an element is provided and it's an InsightItem, it means we're getting children of an insight
    if (element && element instanceof InsightItem && element.insight) {
      // This is for showing insight details/actions if needed
      return [];
    }

    // Root level - fetch insights for the current project
    try {
      const response = await this.client.listInsights(this.currentProjectId);
      this.insights = response.results;

      if (this.insights.length === 0) {
        return [new NoInsightsItem()];
      }

      return this.insights.map((insight) => {
        const displayName =
          insight.name || insight.derived_name || `Insight ${insight.short_id}`;
        const created = insight.created_at
          ? dayjs(insight.created_at).fromNow()
          : "unknown time";
        const createdBy = insight.created_by
          ? `${insight.created_by.first_name} ${insight.created_by.last_name}`.trim()
          : "Unknown user";

        return new InsightItem(
          displayName,
          insight,
          this.currentProjectId!,
          `Created ${created} by ${createdBy}`,
          vscode.TreeItemCollapsibleState.None
        );
      });
    } catch (error) {
      console.error("Error fetching insights:", error);
      return [new ErrorItem("Failed to load insights")];
    }
  }
}

export class InsightItem extends vscode.TreeItem implements IInsightTreeItem {
  constructor(
    public readonly label: string,
    public readonly insight: PostHogInsight | null,
    public readonly projectId: number,
    public readonly description: string | undefined,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState
  ) {
    super(label, collapsibleState);
    this.id = insight
      ? `insight_${insight.id}_${insight.short_id}`
      : `insight_${Date.now()}`;
    this.tooltip = insight?.description || label;
    this.contextValue = "posthogInsight";
    this.iconPath = new vscode.ThemeIcon("graph");

    if (insight) {
      this.command = {
        command: "posthog.viewInsightDetails",
        title: "View Insight Details",
        arguments: [projectId, insight.id, label],
      };
    }
  }
}

class SelectProjectItem extends vscode.TreeItem implements IInsightTreeItem {
  constructor() {
    super(
      "Select a PostHog project first",
      vscode.TreeItemCollapsibleState.None
    );
    this.id = "insights_select_project";
    this.tooltip = "Open the PostHog Projects view and select a project";
    this.iconPath = new vscode.ThemeIcon("info");
    this.command = {
      command: "posthog-explorer.focus",
      title: "Select Project",
    };
  }
}

class NoInsightsItem extends vscode.TreeItem implements IInsightTreeItem {
  constructor() {
    super("No insights found", vscode.TreeItemCollapsibleState.None);
    this.id = "insights_no_items";
    this.tooltip = "No insights found in this project";
    this.iconPath = new vscode.ThemeIcon("info");
  }
}

class ErrorItem extends vscode.TreeItem implements IInsightTreeItem {
  constructor(message: string) {
    super(`Error: ${message}`, vscode.TreeItemCollapsibleState.None);
    this.id = `insights_error_${Date.now()}`;
    this.tooltip = message;
    this.iconPath = new vscode.ThemeIcon("error");
  }
}
