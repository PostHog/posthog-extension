import axios, { AxiosInstance, AxiosError } from "axios";
import * as vscode from "vscode";
import {
  PostHogProject,
  PostHogInsightListResponse,
  PostHogInsight,
  PostHogAnnotation,
  PostHogSessionRecordingListResponse,
} from "../models/types";

export class PostHogClient {
  private api!: AxiosInstance; // Using definite assignment assertion
  private apiKey: string;
  private apiHost: string;

  constructor() {
    this.apiKey =
      vscode.workspace.getConfiguration("posthog").get("apiKey") || "";
    this.apiHost =
      vscode.workspace.getConfiguration("posthog").get("apiHost") ||
      "https://us.posthog.com";

    this.initializeApi();
  }

  /**
   * Initialize the API instance with the current configuration
   */
  private initializeApi() {
    this.api = axios.create({
      baseURL: this.apiHost,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
    });

    // Add response interceptor for debugging
    this.api.interceptors.response.use(
      (response) => response,
      (error: Error | AxiosError) => {
        if (axios.isAxiosError(error)) {
          console.error("API Error:", error.response?.data || error.message);
        } else {
          console.error("API Error:", error.message);
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * Update the API key
   */
  updateApiKey(apiKey: string) {
    this.apiKey = apiKey;
    this.initializeApi();

    // Update config
    return vscode.workspace
      .getConfiguration("posthog")
      .update("apiKey", apiKey, true);
  }

  /**
   * Update the API host
   */
  updateApiHost(apiHost: string) {
    this.apiHost = apiHost;
    this.initializeApi();

    // Update config
    return vscode.workspace
      .getConfiguration("posthog")
      .update("apiHost", apiHost, true);
  }

  /**
   * List all projects
   */
  async listProjects(): Promise<PostHogProject[]> {
    try {
      // Include personal_api_key in the query string as an alternative authentication method
      const response = await this.api.get(
        `/api/organizations/@current/projects/?personal_api_key=${encodeURIComponent(
          this.apiKey
        )}`
      );
      return response.data.results;
    } catch (error) {
      this.handleApiError(error, "Failed to fetch projects");
      return [];
    }
  }

  /**
   * List all insights for a project
   */
  async listInsights(projectId: number): Promise<PostHogInsightListResponse> {
    try {
      const response = await this.api.get(
        `/api/projects/${projectId}/insights/`
      );
      return response.data;
    } catch (error) {
      this.handleApiError(error, "Failed to fetch insights");
      return { count: 0, next: null, previous: null, results: [] };
    }
  }

  /**
   * Get insight details
   */
  async getInsightDetails(
    projectId: number,
    insightId: number
  ): Promise<PostHogInsight | null> {
    try {
      const response = await this.api.get(
        `/api/projects/${projectId}/insights/${insightId}/`
      );
      return response.data;
    } catch (error) {
      this.handleApiError(error, "Failed to fetch insight details");
      return null;
    }
  }

  /**
   * Create an annotation
   */
  async createAnnotation(
    projectId: number,
    content: string,
    dateMarker?: string
  ): Promise<PostHogAnnotation | null> {
    try {
      const payload: Partial<PostHogAnnotation> = {
        content,
        project_id: projectId,
      };

      if (dateMarker) {
        payload.date_marker = dateMarker;
      }

      const response = await this.api.post("/api/annotation/", payload);
      return response.data;
    } catch (error) {
      this.handleApiError(error, "Failed to create annotation");
      return null;
    }
  }

  /**
   * List session recordings for a project
   */
  async listSessionRecordings(
    projectId: number
  ): Promise<PostHogSessionRecordingListResponse> {
    try {
      const response = await this.api.get(
        `/api/projects/${projectId}/session_recordings/`
      );
      return response.data;
    } catch (error) {
      this.handleApiError(error, "Failed to fetch session recordings");
      return { count: 0, next: null, previous: null, results: [] };
    }
  }

  /**
   * Check API connection is valid
   */
  async checkConnection(): Promise<boolean> {
    try {
      // Log the current configuration (without revealing full API key)
      const maskedApiKey = this.apiKey
        ? `${this.apiKey.substring(0, 5)}...`
        : "not set";
      console.log(
        `Testing connection with host: ${this.apiHost}, API key: ${maskedApiKey}`
      );

      // Add personal_api_key to query for alternative authentication
      const url = `/api/users/@me/?personal_api_key=${encodeURIComponent(
        this.apiKey
      )}`;
      console.log(
        `Request URL: ${this.apiHost}${url.replace(this.apiKey, maskedApiKey)}`
      );

      // Try to fetch user information as a connection test
      const response = await this.api.get(url);

      // Log success information
      console.log("Connection successful. Response status:", response.status);
      console.log("User data:", JSON.stringify(response.data, null, 2));

      return true;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error("Connection check failed:");
        console.error("- Status:", error.response?.status);
        console.error("- Status text:", error.response?.statusText);
        console.error("- Data:", JSON.stringify(error.response?.data, null, 2));
        console.error(
          "- Headers:",
          JSON.stringify(error.response?.headers, null, 2)
        );

        // Try with a different endpoint as fallback
        try {
          console.log("Trying alternative endpoint for connection check...");
          const altResponse = await this.api.get(
            "/api/projects/?personal_api_key=" + encodeURIComponent(this.apiKey)
          );
          console.log(
            "Alternative endpoint check successful:",
            altResponse.status
          );
          return true;
        } catch (altError) {
          console.error("Alternative endpoint also failed");
          if (axios.isAxiosError(altError)) {
            console.error("- Status:", altError.response?.status);
            console.error(
              "- Data:",
              JSON.stringify(altError.response?.data, null, 2)
            );
          }
        }
      } else if (error instanceof Error) {
        console.error("Connection check failed:", error.message);
      }
      return false;
    }
  }

  /**
   * Handle API errors
   */
  private handleApiError(error: unknown, message: string): void {
    console.error(error);

    // Extract the error message if available
    let errorDetail = message;
    let errorType = "unknown_error";
    let errorCode = "unknown_code";
    let statusCode = 0;

    if (axios.isAxiosError(error)) {
      errorDetail = error.response?.data?.detail || error.message || message;
      errorType = error.response?.data?.type || "unknown_error";
      errorCode = error.response?.data?.code || "unknown_code";
      statusCode = error.response?.status || 0;
    } else if (error instanceof Error) {
      errorDetail = error.message;
    }

    if (statusCode === 401) {
      vscode.window.showErrorMessage(
        `Authentication error: Please check your PostHog API key (${errorDetail}). Make sure you're using a personal API key with proper scopes.`
      );
    } else {
      vscode.window.showErrorMessage(
        `${message}: ${errorDetail} (Type: ${errorType}, Code: ${errorCode})`
      );
    }
  }
}
