export interface PreviewYamlConfig {
  services: Record<string, ServiceYamlConfig>;
  database?: DatabaseYamlConfig;
  env?: Record<string, string>;
  password?: string;
}

export interface ServiceYamlConfig {
  dockerfile: string;
  port?: number;
  env?: Record<string, string>;
  context?: string;
  buildArgs?: Record<string, string>;
}

export interface DatabaseYamlConfig {
  type: "postgres" | "mysql" | "mongodb";
  migrations?: string;
}

export interface EnvironmentConfig {
  port: number;
  nodeEnv: string;
  mongodbUri: string;
  dockerHost: string;
  baseDomain: string;
  wildcardSsl: boolean;
  githubWebhookSecret: string;
  jwtSecret: string;
  apiTokenSecret: string;
  maxPreviews: number;
  idleTimeoutHours: number;
  cleanupIntervalMinutes: number;
  postgresHost: string;
  postgresPort: number;
  postgresAdminUser: string;
  postgresAdminPassword: string;
  mysqlHost: string;
  mysqlPort: number;
  mysqlAdminUser: string;
  mysqlAdminPassword: string;
  mongodbHost: string;
  mongodbPort: number;
  mongodbAdminUser: string;
  mongodbAdminPassword: string;
  traefikNetwork: string;
  traefikApiUrl: string;
  previewPasswordProtected: boolean;
  previewDefaultPassword: string;
}
