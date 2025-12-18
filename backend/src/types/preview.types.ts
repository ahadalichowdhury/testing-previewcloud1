export enum PreviewStatus {
  CREATING = "creating",
  RUNNING = "running",
  UPDATING = "updating",
  DESTROYING = "destroying",
  DESTROYED = "destroyed",
  FAILED = "failed",
}

export enum PreviewType {
  PULL_REQUEST = "pull_request",
  BRANCH = "branch",
}

export enum ServiceStatus {
  BUILDING = "building",
  RUNNING = "running",
  STOPPED = "stopped",
  FAILED = "failed",
}

export enum LogType {
  BUILD = "build",
  DEPLOY = "deploy",
  CONTAINER = "container",
  DATABASE = "database",
  SYSTEM = "system",
}

export enum DatabaseType {
  POSTGRES = "postgres",
  MYSQL = "mysql",
  MONGODB = "mongodb",
}

export interface ServiceConfig {
  dockerfile: string;
  port?: number;
  env?: Record<string, string>;
  context?: string;
  buildArgs?: Record<string, string>;
}

export interface DatabaseConfig {
  type: DatabaseType;
  migrations?: string;
}

export interface PreviewConfig {
  previewType: PreviewType; // PR or BRANCH
  prNumber?: number; // Required for PR type, optional for BRANCH
  repoName: string;
  repoOwner: string;
  branch: string;
  commitSha: string;
  services: Record<string, ServiceConfig>;
  database?: DatabaseConfig;
  env?: Record<string, string>;
  password?: string;
}

export interface PreviewDetails {
  previewType: PreviewType;
  prNumber?: number;
  previewId: string; // Unique identifier: pr-{number} or branch-{branch-name}
  repoName: string;
  repoOwner: string;
  branch: string;
  commitSha: string;
  status: PreviewStatus;
  services: ServiceDetails[];
  database?: {
    type: DatabaseType;
    connectionString: string;
  };
  urls: Record<string, string>;
  createdAt: Date;
  updatedAt: Date;
  lastAccessedAt: Date;
}

export interface ServiceDetails {
  name: string;
  containerId: string;
  imageTag: string;
  port: number;
  url: string;
  status: ServiceStatus;
}

export interface ContainerConfig {
  name: string;
  image: string;
  env: Record<string, string>;
  labels: Record<string, string>;
  port?: number;
  networks?: string[];
}

export interface BuildContext {
  dockerfile: string;
  context: string;
  tag: string;
  buildArgs?: Record<string, string>;
}
