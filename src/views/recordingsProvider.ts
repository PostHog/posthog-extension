import * as vscode from "vscode";
import { PostHogClient } from "../api/posthogClient";
import { PostHogSessionRecording } from "../models/types";
import dayjs from "dayjs";
import relativeTimePlugin from "dayjs/plugin/relativeTime";
import durationPlugin from "dayjs/plugin/duration";

// Extend dayjs with plugins
dayjs.extend(relativeTimePlugin);
dayjs.extend(durationPlugin);

// Base interface for all recording tree items
interface IRecordingTreeItem extends vscode.TreeItem {
  // Common properties if needed
}

export class RecordingsProvider
  implements vscode.TreeDataProvider<IRecordingTreeItem>
{
  private _onDidChangeTreeData: vscode.EventEmitter<
    IRecordingTreeItem | undefined | null | void
  > = new vscode.EventEmitter<IRecordingTreeItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<
    IRecordingTreeItem | undefined | null | void
  > = this._onDidChangeTreeData.event;

  private client: PostHogClient;
  private currentProjectId: number | null = null;
  private currentProjectName: string | null = null;
  private recordings: PostHogSessionRecording[] = [];

  constructor(private context: vscode.ExtensionContext) {
    this.client = new PostHogClient(context);
  }

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  setProject(projectId: number, projectName: string): void {
    this.currentProjectId = projectId;
    this.currentProjectName = projectName;
    this.refresh();
  }

  getTreeItem(element: IRecordingTreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(
    element?: IRecordingTreeItem
  ): Promise<IRecordingTreeItem[]> {
    // If no project is selected, show a message
    if (!this.currentProjectId) {
      return [new SelectProjectItem()];
    }

    // If an element is provided and it's a RecordingItem, it means we're getting children of a recording
    if (element && element instanceof RecordingItem && element.recording) {
      // This is for showing recording details/actions if needed
      return [];
    }

    // Root level - fetch recordings for the current project
    try {
      const response = await this.client.listSessionRecordings(
        this.currentProjectId
      );
      this.recordings = response.results;

      if (this.recordings.length === 0) {
        return [new NoRecordingsItem()];
      }

      return this.recordings.map((recording) => {
        // Format the recording time and duration
        const startTime = dayjs(recording.start_time).fromNow();
        const durationObj = dayjs.duration(
          recording.recording_duration,
          "milliseconds"
        );
        const minutes = Math.floor(durationObj.asMinutes());
        const seconds = Math.floor(durationObj.asSeconds() % 60);
        const durationFormatted = `${minutes}:${seconds
          .toString()
          .padStart(2, "0")}`;

        return new RecordingItem(
          `Session ${recording.id.substring(0, 8)}...`,
          recording,
          this.currentProjectId!,
          `${startTime} • ${durationFormatted} • User: ${
            recording.distinct_id?.substring(0, 10) || "Unknown"
          }`,
          vscode.TreeItemCollapsibleState.None
        );
      });
    } catch (error) {
      console.error("Error fetching recordings:", error);
      return [new ErrorItem("Failed to load session recordings")];
    }
  }
}

export class RecordingItem
  extends vscode.TreeItem
  implements IRecordingTreeItem
{
  constructor(
    public readonly label: string,
    public readonly recording: PostHogSessionRecording | null,
    public readonly projectId: number,
    public readonly description: string | undefined,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState
  ) {
    super(label, collapsibleState);
    // Ensure unique ID
    this.id = recording
      ? `recording_${recording.id}`
      : `recording_${Date.now()}`;
    this.tooltip = `Session recording ${recording?.id || ""}`;
    this.contextValue = "posthogRecording";
    this.iconPath = new vscode.ThemeIcon("play");

    if (recording) {
      // Create a command to open the recording in a browser
      const url = `${vscode.workspace
        .getConfiguration("posthog")
        .get("apiHost")}/recordings/${recording.id}`;
      this.command = {
        command: "vscode.open",
        title: "Open Recording",
        arguments: [vscode.Uri.parse(url)],
      };
    }
  }
}

class SelectProjectItem extends vscode.TreeItem implements IRecordingTreeItem {
  constructor() {
    super(
      "Select a PostHog project first",
      vscode.TreeItemCollapsibleState.None
    );
    // Ensure unique ID
    this.id = "recordings_select_project";
    this.tooltip = "Open the PostHog Projects view and select a project";
    this.iconPath = new vscode.ThemeIcon("info");
    this.command = {
      command: "posthog-explorer.focus",
      title: "Select Project",
    };
  }
}

class NoRecordingsItem extends vscode.TreeItem implements IRecordingTreeItem {
  constructor() {
    super("No session recordings found", vscode.TreeItemCollapsibleState.None);
    // Ensure unique ID
    this.id = "recordings_no_items";
    this.tooltip = "No session recordings found in this project";
    this.iconPath = new vscode.ThemeIcon("info");
  }
}

class ErrorItem extends vscode.TreeItem implements IRecordingTreeItem {
  constructor(message: string) {
    super(`Error: ${message}`, vscode.TreeItemCollapsibleState.None);
    // Ensure unique ID
    this.id = `recordings_error_${Date.now()}`;
    this.tooltip = message;
    this.iconPath = new vscode.ThemeIcon("error");
  }
}
