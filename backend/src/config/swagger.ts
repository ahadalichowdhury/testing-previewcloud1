import swaggerJsdoc from "swagger-jsdoc";
import { config } from "./env";

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "PreviewCloud API",
      version: "1.0.0",
      description:
        "API documentation for PreviewCloud - Automated PR-based preview environment platform",
      contact: {
        name: "PreviewCloud Support",
        email: "support@previewcloud.cloud",
        url: "https://previewcloud.cloud",
      },
      license: {
        name: "MIT",
        url: "https://opensource.org/licenses/MIT",
      },
    },
    servers: [
      {
        url: `http://localhost:${config.port}`,
        description: "Development server",
      },
      {
        url: "https://api.preview.previewcloud.cloud",
        description: "Production server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "JWT token for API authentication",
        },
        webhookSignature: {
          type: "apiKey",
          in: "header",
          name: "X-Hub-Signature-256",
          description: "GitHub webhook signature",
        },
      },
      schemas: {
        PreviewConfig: {
          type: "object",
          required: [
            "prNumber",
            "repoName",
            "repoOwner",
            "branch",
            "commitSha",
            "services",
          ],
          properties: {
            prNumber: {
              type: "integer",
              description: "Pull request number",
              example: 123,
            },
            repoName: {
              type: "string",
              description: "Repository name",
              example: "my-app",
            },
            repoOwner: {
              type: "string",
              description: "Repository owner",
              example: "github-user",
            },
            branch: {
              type: "string",
              description: "Git branch name",
              example: "feature/new-feature",
            },
            commitSha: {
              type: "string",
              description: "Git commit SHA",
              example: "abc123def456",
            },
            services: {
              type: "object",
              description: "Services to deploy",
              additionalProperties: {
                type: "object",
                properties: {
                  dockerfile: {
                    type: "string",
                    description: "Path to Dockerfile",
                    example: "./api/Dockerfile",
                  },
                  port: {
                    type: "integer",
                    description: "Port the service listens on",
                    example: 8080,
                  },
                  env: {
                    type: "object",
                    description: "Environment variables",
                    additionalProperties: { type: "string" },
                  },
                  context: {
                    type: "string",
                    description: "Build context path",
                    example: "./api",
                  },
                  buildArgs: {
                    type: "object",
                    description: "Docker build arguments",
                    additionalProperties: { type: "string" },
                  },
                },
              },
            },
            database: {
              type: "object",
              properties: {
                type: {
                  type: "string",
                  enum: ["postgres", "mysql", "mongodb"],
                  description: "Database type",
                  example: "postgres",
                },
                migrations: {
                  type: "string",
                  description: "Path to migrations folder",
                  example: "./migrations",
                },
              },
            },
            env: {
              type: "object",
              description: "Global environment variables",
              additionalProperties: { type: "string" },
            },
            password: {
              type: "string",
              description: "Optional password to protect preview URLs",
              example: "my-secure-password",
            },
          },
        },
        Preview: {
          type: "object",
          properties: {
            prNumber: {
              type: "integer",
              example: 123,
            },
            repoName: {
              type: "string",
              example: "my-app",
            },
            repoOwner: {
              type: "string",
              example: "github-user",
            },
            branch: {
              type: "string",
              example: "feature/new-feature",
            },
            commitSha: {
              type: "string",
              example: "abc123def456",
            },
            status: {
              type: "string",
              enum: [
                "creating",
                "running",
                "updating",
                "destroying",
                "destroyed",
                "failed",
              ],
              example: "running",
            },
            services: {
              type: "array",
              items: {
                $ref: "#/components/schemas/Service",
              },
            },
            database: {
              type: "object",
              properties: {
                type: {
                  type: "string",
                  enum: ["postgres", "mysql", "mongodb"],
                },
                connectionString: {
                  type: "string",
                  example: "postgresql://user:pass@host:5432/pr_123_db",
                },
              },
            },
            urls: {
              type: "object",
              additionalProperties: { type: "string" },
              example: {
                api: "https://pr-123-user.api.preview.previewcloud.cloud",
                web: "https://pr-123-user.web.preview.previewcloud.cloud",
              },
            },
            createdAt: {
              type: "string",
              format: "date-time",
            },
            updatedAt: {
              type: "string",
              format: "date-time",
            },
            lastAccessedAt: {
              type: "string",
              format: "date-time",
            },
          },
        },
        Service: {
          type: "object",
          properties: {
            name: {
              type: "string",
              example: "api",
            },
            containerId: {
              type: "string",
              example: "abc123def456",
            },
            imageTag: {
              type: "string",
              example: "previewcloud/pr-123-api:latest",
            },
            port: {
              type: "integer",
              example: 8080,
            },
            url: {
              type: "string",
              example: "https://pr-123-user.api.preview.previewcloud.cloud",
            },
            status: {
              type: "string",
              enum: ["building", "running", "stopped", "failed"],
              example: "running",
            },
          },
        },
        Log: {
          type: "object",
          properties: {
            _id: {
              type: "string",
              example: "507f1f77bcf86cd799439011",
            },
            previewId: {
              type: "string",
              example: "507f1f77bcf86cd799439011",
            },
            prNumber: {
              type: "integer",
              example: 123,
            },
            type: {
              type: "string",
              enum: ["build", "deploy", "container", "database", "system"],
              example: "deploy",
            },
            message: {
              type: "string",
              example: "Service api deployed successfully",
            },
            metadata: {
              type: "object",
              additionalProperties: true,
            },
            createdAt: {
              type: "string",
              format: "date-time",
            },
          },
        },
        Health: {
          type: "object",
          properties: {
            status: {
              type: "string",
              enum: ["healthy", "degraded", "unhealthy"],
              example: "healthy",
            },
            timestamp: {
              type: "string",
              format: "date-time",
            },
            services: {
              type: "object",
              properties: {
                api: {
                  type: "string",
                  enum: ["up", "down"],
                },
                database: {
                  type: "string",
                  enum: ["up", "down", "unknown"],
                },
                docker: {
                  type: "string",
                  enum: ["up", "down", "unknown"],
                },
              },
            },
          },
        },
        Error: {
          type: "object",
          properties: {
            success: {
              type: "boolean",
              example: false,
            },
            error: {
              type: "object",
              properties: {
                message: {
                  type: "string",
                  example: "Error message here",
                },
                stack: {
                  type: "string",
                  description: "Stack trace (only in development)",
                },
              },
            },
          },
        },
      },
    },
    tags: [
      {
        name: "Health",
        description: "System health check endpoints",
      },
      {
        name: "Authentication",
        description: "User authentication and account management",
      },
      {
        name: "Previews",
        description: "Preview environment management",
      },
      {
        name: "Logs",
        description: "Preview logs and streaming",
      },
      {
        name: "Webhooks",
        description: "GitHub webhook handlers",
      },
    ],
  },
  apis:
    config.nodeEnv === "production"
      ? ["./dist/routes/*.js", "./dist/controllers/*.js"]
      : ["./src/routes/*.ts", "./src/controllers/*.ts"],
};

export const swaggerSpec = swaggerJsdoc(options);
