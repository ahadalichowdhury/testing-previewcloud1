import dotenv from "dotenv";
import { EnvironmentConfig } from "../types/config.types";

dotenv.config();

function getEnvVar(key: string, defaultValue?: string): string {
  const value = process.env[key] || defaultValue;
  if (!value) {
    throw new Error(`Environment variable ${key} is required but not set`);
  }
  return value;
}

function getEnvVarNumber(key: string, defaultValue: number): number {
  const value = process.env[key];
  return value ? parseInt(value, 10) : defaultValue;
}

function getEnvVarBoolean(key: string, defaultValue: boolean): boolean {
  const value = process.env[key];
  return value ? value.toLowerCase() === "true" : defaultValue;
}

export const config: EnvironmentConfig = {
  port: getEnvVarNumber("PORT", 3001),
  nodeEnv: getEnvVar("NODE_ENV", "development"),
  mongodbUri: getEnvVar(
    "MONGODB_URI",
    "mongodb://localhost:27017/previewcloud"
  ),
  dockerHost: getEnvVar("DOCKER_HOST", "unix:///var/run/docker.sock"),
  baseDomain: getEnvVar("BASE_DOMAIN", "preview.local"),
  wildcardSsl: getEnvVarBoolean("WILDCARD_SSL", false),
  githubWebhookSecret: getEnvVar("GITHUB_WEBHOOK_SECRET", ""),
  jwtSecret: getEnvVar("JWT_SECRET", "dev-secret-change-in-production"),
  apiTokenSecret: getEnvVar(
    "API_TOKEN_SECRET",
    "dev-api-secret-change-in-production"
  ),
  maxPreviews: getEnvVarNumber("MAX_PREVIEWS", 20),
  idleTimeoutHours: getEnvVarNumber("IDLE_TIMEOUT_HOURS", 48),
  cleanupIntervalMinutes: getEnvVarNumber("CLEANUP_INTERVAL_MINUTES", 30),
  postgresHost: getEnvVar("POSTGRES_HOST", "localhost"),
  postgresPort: getEnvVarNumber("POSTGRES_PORT", 5432),
  postgresAdminUser: getEnvVar("POSTGRES_ADMIN_USER", "postgres"),
  postgresAdminPassword: getEnvVar("POSTGRES_ADMIN_PASSWORD", "postgres"),
  mysqlHost: getEnvVar("MYSQL_HOST", "localhost"),
  mysqlPort: getEnvVarNumber("MYSQL_PORT", 3306),
  mysqlAdminUser: getEnvVar("MYSQL_ADMIN_USER", "root"),
  mysqlAdminPassword: getEnvVar("MYSQL_ADMIN_PASSWORD", "root"),
  mongodbHost: getEnvVar("MONGODB_HOST", "localhost"),
  mongodbPort: getEnvVarNumber("MONGODB_PORT", 27017),
  mongodbAdminUser: getEnvVar("MONGODB_ADMIN_USER", "admin"),
  mongodbAdminPassword: getEnvVar("MONGODB_ADMIN_PASSWORD", "admin"),
  traefikNetwork: getEnvVar("TRAEFIK_NETWORK", "traefik-proxy"),
  traefikApiUrl: getEnvVar("TRAEFIK_API_URL", "http://localhost:8080"),
  previewPasswordProtected: getEnvVarBoolean(
    "PREVIEW_PASSWORD_PROTECTED",
    false
  ),
  previewDefaultPassword: getEnvVar("PREVIEW_DEFAULT_PASSWORD", "preview123"),
};
