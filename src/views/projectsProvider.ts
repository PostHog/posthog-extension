import * as vscode from "vscode";
import { PostHogClient } from "../api/posthogClient";
import { PostHogProject } from "../models/types";

// Base interface for all tree items
interface IProjectTreeItem extends vscode.TreeItem {
  // Common properties if needed
}

export class ProjectsProvider
  implements vscode.TreeDataProvider<IProjectTreeItem>
{
  private _onDidChangeTreeData: vscode.EventEmitter<
    IProjectTreeItem | undefined | null | void
  > = new vscode.EventEmitter<IProjectTreeItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<
    IProjectTreeItem | undefined | null | void
  > = this._onDidChangeTreeData.event;

  private client: PostHogClient;
  private projects: PostHogProject[] = [];

  constructor(private context: vscode.ExtensionContext) {
    this.client = new PostHogClient(context);
  }

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: IProjectTreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: IProjectTreeItem): Promise<IProjectTreeItem[]> {
    if (!element) {
      // Root level - fetch projects
      try {
        const hasApiKey = !!(await this.client.getStoredApiKey());

        if (!hasApiKey) {
          return [new SetupRequiredItem()];
        }

        this.projects = await this.client.listProjects();

        if (this.projects.length === 0) {
          return [new NoProjectsItem()];
        }

        return this.projects.map(
          (project) =>
            new ProjectItem(
              project.name,
              project.id.toString(),
              project.api_token,
              vscode.TreeItemCollapsibleState.Collapsed
            )
        );
      } catch (error) {
        console.error("Error fetching projects:", error);
        return [new ErrorItem("Failed to load projects. Check your API key.")];
      }
    } else if (element instanceof ProjectItem) {
      // Project item level - show actions
      return [
        new ProjectActionItem(
          "Copy API Token",
          {
            command: "posthog.copyProjectToken",
            title: "Copy Project API Token",
            arguments: [element.apiToken, element.label],
          },
          element.id
        ),
        new ProjectActionItem(
          "View Insights",
          {
            command: "posthog.listInsights",
            title: "List Insights",
            arguments: [parseInt(element.id), element.label],
          },
          element.id
        ),
        new ProjectActionItem(
          "View Session Recordings",
          {
            command: "posthog.viewSessionRecordings",
            title: "View Session Recordings",
            arguments: [parseInt(element.id), element.label],
          },
          element.id
        ),
        new ProjectActionItem(
          "Create Annotation",
          {
            command: "posthog.createAnnotation",
            title: "Create Annotation",
            arguments: [parseInt(element.id), element.label],
          },
          element.id
        ),
      ];
    }

    return [];
  }
}

export class ProjectItem extends vscode.TreeItem implements IProjectTreeItem {
  constructor(
    public readonly label: string,
    public readonly id: string,
    public readonly apiToken: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState
  ) {
    super(label, collapsibleState);
    this.tooltip = `Project: ${label}`;
    this.contextValue = "posthogProject";
    this.iconPath = new vscode.ThemeIcon("graph");
  }
}

class ProjectActionItem extends vscode.TreeItem implements IProjectTreeItem {
  constructor(
    public readonly label: string,
    public readonly command: vscode.Command,
    public readonly id: string
  ) {
    // Create a unique ID for each action that won't conflict with project IDs
    const uniqueId = `action_${id}_${label.replace(/\s+/g, "_").toLowerCase()}`;

    super(label, vscode.TreeItemCollapsibleState.None);
    this.tooltip = label;
    this.contextValue = "posthogProjectAction";
    // Override the ID to use our unique ID
    this.id = uniqueId;
    this.iconPath = new vscode.ThemeIcon(
      label.includes("API Token")
        ? "key"
        : label.includes("Insights")
        ? "pulse"
        : label.includes("Recordings")
        ? "play"
        : "comment"
    );
  }
}

class SetupRequiredItem extends vscode.TreeItem implements IProjectTreeItem {
  constructor() {
    super("Set PostHog API Key", vscode.TreeItemCollapsibleState.None);
    // Ensure unique ID
    this.id = "setup_required";
    this.command = {
      command: "posthog.setApiKey",
      title: "Set API Key",
    };
    this.tooltip = "Set your PostHog API key to get started";
    this.iconPath = new vscode.ThemeIcon("key");
  }
}

class NoProjectsItem extends vscode.TreeItem implements IProjectTreeItem {
  constructor() {
    super("No projects found", vscode.TreeItemCollapsibleState.None);
    // Ensure unique ID
    this.id = "no_projects";
    this.tooltip = "No projects found with the provided API key";
    this.iconPath = new vscode.ThemeIcon("info");
  }
}

class ErrorItem extends vscode.TreeItem implements IProjectTreeItem {
  constructor(message: string) {
    super(`Error: ${message}`, vscode.TreeItemCollapsibleState.None);
    // Ensure unique ID
    this.id = `error_${Date.now()}`;
    this.tooltip = message;
    this.iconPath = new vscode.ThemeIcon("error");
  }
}
