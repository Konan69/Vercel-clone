export interface Repository {
  id: number;
  name: string;
  private: boolean;
  updated_at: string;
  default_branch: string;
  clone_url: string;
  owner: {
    login: string;
  };
  html_url: string;
}

export interface GitHubContent {
  type: string;
  name: string;
  path: string;
}
