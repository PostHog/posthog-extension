import * as vscode from "vscode";
import { PostHogUsage } from "../analysis/codeAnalyzer";
import * as fs from "fs";
import * as path from "path";

export class AnalysisProvider implements vscode.TreeDataProvider<AnalysisItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<
    AnalysisItem | undefined | null | void
  > = new vscode.EventEmitter<AnalysisItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<
    AnalysisItem | undefined | null | void
  > = this._onDidChangeTreeData.event;

  private usages: PostHogUsage[] = [];

  constructor(private context: vscode.ExtensionContext) {}

  refresh(usages: PostHogUsage[]) {
    this.usages = usages;
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: AnalysisItem): vscode.TreeItem {
    return element;
  }

  getChildren(element?: AnalysisItem): Thenable<AnalysisItem[]> {
    if (!element) {
      return Promise.resolve(this.getRootItems());
    }
    if (element.isFile) {
      return Promise.resolve(this.getFileUsages(element.filePath));
    }
    if (element.usage?.warning) {
      const warnings = element.usage.warning
        .split(";")
        .map((w) => w.trim())
        .filter((w) => w);
      return Promise.resolve(
        warnings.map((warning) => this.createWarningItem(warning, element))
      );
    }
    return Promise.resolve([]);
  }

  private getRootItems(): AnalysisItem[] {
    const usagesByFile = this.groupUsagesByFile();
    return Object.entries(usagesByFile)
      .sort(([filePathA], [filePathB]) => filePathA.localeCompare(filePathB))
      .map(([filePath, fileUsages]) => {
        const warningCount = fileUsages.filter((u) => u.warning).length;
        const item = new AnalysisItem(
          path.basename(filePath),
          vscode.TreeItemCollapsibleState.Expanded,
          true,
          filePath
        );

        // Add warning count badge to files that have warnings
        if (warningCount > 0) {
          item.badge = new vscode.ThemeIcon("warning");
          item.description = `⚠️ ${warningCount}`; // Show total warnings in the file
        }

        item.iconPath = this.getFileIcon(filePath);
        item.tooltip = filePath;
        return item;
      });
  }

  private getFileIcon(filePath: string): vscode.ThemeIcon {
    return new vscode.ThemeIcon("file-code");
  }

  private getFileUsages(filePath: string): AnalysisItem[] {
    const fileUsages = this.usages.filter((usage) => usage.file === filePath);
    return fileUsages
      .sort((a, b) =>
        `${a.type}: ${a.context}`.localeCompare(`${b.type}: ${b.context}`)
      )
      .map((usage) => {
        const item = new AnalysisItem(
          `${usage.type}: ${usage.context}`,
          usage.warning
            ? vscode.TreeItemCollapsibleState.Expanded
            : vscode.TreeItemCollapsibleState.None,
          false,
          filePath,
          usage
        );

        // Add warning badge if there's a warning
        if (usage.warning) {
          item.badge = new vscode.ThemeIcon("warning");
          // Count the number of warnings by splitting on semicolons
          const warningCount = usage.warning
            .split(";")
            .filter((w) => w.trim()).length;
          item.description = `⚠️ ${warningCount}`; // Show actual count of warnings
        }

        item.tooltip = this.getCodePreview(filePath, usage.line);
        item.command = {
          command: "posthog.openFileAtLocation",
          title: "Open File",
          arguments: [usage],
        };
        return item;
      });
  }

  private createWarningItem(
    warning: string,
    parent?: AnalysisItem
  ): AnalysisItem {
    const item = new AnalysisItem(
      warning,
      vscode.TreeItemCollapsibleState.None,
      false,
      parent?.filePath || "",
      undefined,
      parent
    );
    item.iconPath = new vscode.ThemeIcon("warning");
    item.contextValue = "warning";
    item.tooltip = warning;
    item.description = "";
    item.resourceUri = vscode.Uri.parse("warning");
    item.decorationProvider = true;

    // Add the parent usage information to the warning item
    if (item.parent?.usage) {
      item.command = {
        command: "posthog.openFileAtLocation",
        title: "Open File",
        arguments: [item.parent.usage],
      };
    }

    item.label = {
      label: warning,
      highlights: [[0, warning.length]],
    };

    return item;
  }

  private groupUsagesByFile(): { [key: string]: PostHogUsage[] } {
    return this.usages.reduce((acc, usage) => {
      if (!acc[usage.file]) {
        acc[usage.file] = [];
      }
      acc[usage.file].push(usage);
      return acc;
    }, {} as { [key: string]: PostHogUsage[] });
  }

  private getCodePreview(filePath: string, lineNumber: number): string {
    try {
      const content = fs.readFileSync(filePath, "utf-8");
      const lines = content.split("\n");
      const start = Math.max(0, lineNumber - 2);
      const end = Math.min(lines.length, lineNumber + 2);
      return lines.slice(start, end).join("\n");
    } catch (error) {
      return "Unable to load code preview";
    }
  }
}

class AnalysisItem extends vscode.TreeItem {
  constructor(
    public label: string | vscode.TreeItemLabel,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly isFile: boolean,
    public readonly filePath: string,
    public readonly usage?: PostHogUsage,
    public readonly parent?: AnalysisItem
  ) {
    super(label, collapsibleState);
  }

  decorationProvider?: boolean;
  badge?: vscode.ThemeIcon;
}
