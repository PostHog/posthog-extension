import * as vscode from "vscode";
import * as path from "path";

export interface PostHogUsage {
  file: string;
  line: number;
  column: number;
  type:
    | "import"
    | "event tracking" // capture, identify, alias
    | "identification" // identify, alias, register, unregister, reset
    | "feature flags" // feature_enabled, get_feature_flag, etc.
    | "initialization" // PostHog(), init(), api_key setting
    | "integration" // Django, Sentry integrations
    | "group analytics" // group_identify, group
    | "error tracking" // capture_exception
    | "configuration"; // other posthog.* = value settings
  context: string;
}

export class CodeAnalyzer {
  async analyzeWorkspace(): Promise<PostHogUsage[]> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
      return [];
    }

    const usages: PostHogUsage[] = [];

    for (const folder of workspaceFolders) {
      const files = await vscode.workspace.findFiles(
        new vscode.RelativePattern(folder, "**/*.{py,ts,tsx}"),
        "**/node_modules/**"
      );

      for (const file of files) {
        const fileUsages = await this.analyzeFile(file);
        usages.push(...fileUsages);
      }
    }

    return this.deduplicateUsages(usages);
  }

  private deduplicateUsages(usages: PostHogUsage[]): PostHogUsage[] {
    const seen = new Set<string>();
    return usages.filter((usage) => {
      const key = `${usage.file}:${usage.line}:${usage.column}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  private async analyzeFile(file: vscode.Uri): Promise<PostHogUsage[]> {
    const content = await vscode.workspace.fs.readFile(file);
    const text = new TextDecoder().decode(content);
    const ext = path.extname(file.fsPath).toLowerCase();
    const usages: PostHogUsage[] = [];

    if (ext === ".py") {
      this.analyzePythonFile(text, file.fsPath, usages);
    } else if (ext === ".ts" || ext === ".tsx") {
      this.analyzeTypeScriptFile(text, file.fsPath, usages);
    }

    return this.deduplicateUsages(usages);
  }

  private analyzePythonFile(
    text: string,
    filePath: string,
    usages: PostHogUsage[]
  ) {
    const lines = text.split("\n");

    // Import patterns
    const importPatterns = [/^import\s+posthog/i, /^from\s+posthog\s+import/i];

    // Initialization patterns
    const initializationPatterns = [
      /\w+\s*=\s*PostHog\(/i,
      /\w+\s*=\s*posthog\.PostHog\(/i,
    ];

    // Configuration patterns (any attribute setting)
    const configurationPatterns = [/posthog\.\w+\s*=/i];

    // Event tracking patterns
    const eventTrackingPatterns = [
      /posthog\.capture\(/i,
      /posthog\.identify\(/i,
      /posthog\.alias\(/i,
    ];

    // Feature flag patterns
    const featureFlagPatterns = [
      /posthog\.feature_enabled\(/i,
      /posthog\.get_feature_flag\(/i,
      /posthog\.get_all_flags\(/i,
      /posthog\.get_all_flags_and_payloads\(/i,
    ];

    // Group analytics patterns
    const groupPatterns = [/posthog\.group_identify\(/i];

    // Error tracking patterns
    const errorTrackingPatterns = [/posthog\.capture_exception\(/i];

    // Integration patterns
    const integrationPatterns = [
      /PostHogIntegration\(\)/i,
      /POSTHOG_DJANGO\s*=/i,
    ];

    lines.forEach((line, index) => {
      const lineNumber = index + 1;

      // Helper function to add usage
      const addUsage = (pattern: RegExp, type: PostHogUsage["type"]) => {
        const match = line.match(pattern);
        if (match) {
          usages.push({
            file: filePath,
            line: lineNumber,
            column: line.indexOf(match[0]),
            type,
            context: match[0],
          });
        }
      };

      // Check each pattern type with its corresponding functionality type
      importPatterns.forEach((pattern) => addUsage(pattern, "import"));
      initializationPatterns.forEach((pattern) =>
        addUsage(pattern, "initialization")
      );
      configurationPatterns.forEach((pattern) =>
        addUsage(pattern, "configuration")
      );
      eventTrackingPatterns.forEach((pattern) =>
        addUsage(pattern, "event tracking")
      );
      featureFlagPatterns.forEach((pattern) =>
        addUsage(pattern, "feature flags")
      );
      groupPatterns.forEach((pattern) => addUsage(pattern, "group analytics"));
      errorTrackingPatterns.forEach((pattern) =>
        addUsage(pattern, "error tracking")
      );
      integrationPatterns.forEach((pattern) =>
        addUsage(pattern, "integration")
      );
    });
  }

  private analyzeTypeScriptFile(
    text: string,
    filePath: string,
    usages: PostHogUsage[]
  ) {
    const lines = text.split("\n");

    // Import patterns
    const importPatterns = [
      /^import\s+.*from\s+['"]posthog-js['"]/i,
      /^import\s+.*from\s+['"]posthog['"]/i,
      /^import\s+.*from\s+['"]@posthog\/react-native['"]/i,
    ];

    // Initialization patterns
    const initializationPatterns = [
      /usePostHog\(/i,
      /<PostHogProvider[^>]*>/i,
      /new\s+PostHog\(/i,
      /posthog\.init\(/i,
      /posthog\.initReactNativeNavigation\(/i,
    ];

    // Event tracking patterns
    const eventTrackingPatterns = [
      /posthog\.capture\(/i,
      /posthog\.screen\(/i,
      /ph-label=["'][^"']+["']/i, // View labeling
    ];

    // Event blocking patterns
    const eventBlockingPatterns = [/ph-no-capture/i];

    // User identification patterns
    const userIdentificationPatterns = [
      /posthog\.identify\(/i,
      /posthog\.alias\(/i,
      /posthog\.register\(/i,
      /posthog\.unregister\(/i,
      /posthog\.reset\(/i,
    ];

    // Data capture opt-in/out patterns
    const optInOutPatterns = [
      /posthog\.opt_out_capturing\(/i,
      /posthog\.opt_in_capturing\(/i,
      /posthog\.has_opted_out_capturing\(/i,
      /posthog\.optedOut\b/i,
      /posthog\.optIn\(/i,
      /posthog\.optOut\(/i,
    ];

    // Event queue management
    const queueManagementPatterns = [/posthog\.flush\(/i];

    // Feature flag patterns
    const featureFlagPatterns = [
      /useFeatureFlag\(/i,
      /posthog\.isFeatureEnabled\(/i,
      /posthog\.getFeatureFlag\(/i,
      /posthog\.getFeatureFlagPayload\(/i,
      /posthog\.reloadFeatureFlagsAsync\(/i,
      /posthog\.reloadFeatureFlags\(/i,
    ];

    // Feature flag property management
    const flagPropertyPatterns = [
      /posthog\.setPersonPropertiesForFlags\(/i,
      /posthog\.resetPersonPropertiesForFlags\(/i,
      /posthog\.setGroupPropertiesForFlags\(/i,
      /posthog\.resetGroupPropertiesForFlags\(/i,
    ];

    // Group analytics patterns
    const groupPatterns = [/posthog\.group\(/i];

    lines.forEach((line, index) => {
      const lineNumber = index + 1;

      const addUsage = (pattern: RegExp, type: PostHogUsage["type"]) => {
        const match = line.match(pattern);
        if (match) {
          usages.push({
            file: filePath,
            line: lineNumber,
            column: line.indexOf(match[0]),
            type,
            context: match[0],
          });
        }
      };

      // Check each pattern type
      importPatterns.forEach((pattern) => addUsage(pattern, "import"));
      initializationPatterns.forEach((pattern) =>
        addUsage(pattern, "initialization")
      );
      eventTrackingPatterns.forEach((pattern) =>
        addUsage(pattern, "event tracking")
      );
      eventBlockingPatterns.forEach((pattern) =>
        addUsage(pattern, "configuration")
      );
      userIdentificationPatterns.forEach((pattern) =>
        addUsage(pattern, "identification")
      );
      optInOutPatterns.forEach((pattern) => addUsage(pattern, "configuration"));
      queueManagementPatterns.forEach((pattern) =>
        addUsage(pattern, "configuration")
      );
      featureFlagPatterns.forEach((pattern) =>
        addUsage(pattern, "feature flags")
      );
      flagPropertyPatterns.forEach((pattern) =>
        addUsage(pattern, "feature flags")
      );
      groupPatterns.forEach((pattern) => addUsage(pattern, "group analytics"));
    });
  }
}
