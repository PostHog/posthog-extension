export interface PostHogProject {
  id: number;
  uuid: string;
  organization: string;
  api_token: string;
  name: string;
  created_at?: string;
  updated_at?: string;
  timezone?: string;
}

export interface PostHogUser {
  id: number;
  uuid: string;
  distinct_id: string;
  first_name: string;
  last_name: string;
  email: string;
}

export interface PostHogDashboardTile {
  id: number;
  dashboard_id: number;
  deleted: boolean;
}

export interface PostHogInsight {
  id: number;
  short_id: string;
  name: string;
  derived_name: string;
  filters?: any;
  query?: any;
  dashboards?: number[];
  dashboard_tiles?: PostHogDashboardTile[];
  result?: any;
  created_at?: string;
  created_by?: PostHogUser;
  description?: string;
  tags?: string[];
  favorited?: boolean;
  last_refresh?: string;
  is_cached?: boolean;
  query_status?: string;
}

export interface PostHogInsightListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: PostHogInsight[];
}

export interface PostHogAnnotation {
  id?: number;
  content: string;
  date_marker: string;
  project_id: number;
  created_at?: string;
  created_by?: PostHogUser;
}

export interface PostHogSessionRecording {
  id: string;
  recording_duration: number;
  distinct_id: string;
  start_time: string;
  end_time: string;
  viewed: boolean;
  person?: any;
}

export interface PostHogSessionRecordingListResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: PostHogSessionRecording[];
}
