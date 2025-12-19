import mongoose from "mongoose";
import { IPreview, Preview } from "../models/Preview.model";
import {
  ContainerConfig,
  DatabaseType,
  PreviewConfig,
  PreviewDetails,
  PreviewStatus,
  PreviewType,
  ServiceStatus,
} from "../types/preview.types";
import {
  generateContainerName,
  generateDatabaseName,
  generatePreviewId,
} from "../utils/helpers";
import { logger } from "../utils/logger";
import { DBProvisionerFactory } from "./database/factory";
import { DockerService } from "./docker.service";
import { LogsService } from "./logs.service";
import { TraefikService } from "./traefik.service";

export class PreviewService {
  private dockerService: DockerService;
  private traefikService: TraefikService;
  private logsService: LogsService;

  constructor() {
    this.dockerService = new DockerService();
    this.traefikService = new TraefikService();
    this.logsService = new LogsService();
  }

  /**
   * Create a new preview environment
   */
  async createPreview(
    userId: mongoose.Types.ObjectId,
    previewConfig: PreviewConfig
  ): Promise<IPreview> {
    const {
      previewType,
      prNumber,
      repoName,
      repoOwner,
      branch,
      services,
      database,
    } = previewConfig;

    // Generate preview ID
    const previewId = generatePreviewId(previewType, prNumber, branch);

    // Validate required fields based on type
    if (previewType === PreviewType.PULL_REQUEST && !prNumber) {
      throw new Error("prNumber is required for pull_request preview type");
    }
    if (previewType === PreviewType.BRANCH && !branch) {
      throw new Error("branch is required for branch preview type");
    }

    try {
      const previewLabel =
        previewType === PreviewType.PULL_REQUEST
          ? `PR #${prNumber}`
          : `branch ${branch}`;
      logger.info(`Creating preview for ${previewLabel}`);

      // Check if preview already exists FIRST (before creating logs)
      let preview = await Preview.findOne({ previewId });
      if (preview && preview.status !== PreviewStatus.DESTROYED) {
        logger.info(`Preview for ${previewLabel} already exists, updating...`);
        return this.updatePreview(previewId, previewConfig);
      }

      // Create preview document
      preview = await Preview.create({
        userId, // Required: Owner of this preview
        previewType,
        prNumber:
          previewType === PreviewType.PULL_REQUEST ? prNumber : undefined,
        previewId,
        repoName,
        repoOwner,
        branch,
        commitSha: previewConfig.commitSha,
        status: PreviewStatus.CREATING,
        services: [],
        env: previewConfig.env || {},
        password: previewConfig.password,
      });

      // Now that preview exists, create initial log
      await this.logsService.createLog(
        previewId,
        "system",
        `Starting preview creation for ${previewLabel}`
      );

      // Step 1: Provision database if needed
      if (database) {
        await this.provisionDatabase(preview, database);
      }

      // Step 2: Pull Docker images (built by GitHub Action)
      await this.logsService.createLog(
        previewId,
        "system",
        "Pulling Docker images from registry..."
      );

      // Extract image tags from service configs
      const imageTags: Record<string, string> = {};
      for (const [serviceName, serviceConfig] of Object.entries(services)) {
        if (serviceConfig.imageTag) {
          imageTags[serviceName] = serviceConfig.imageTag;
          // Pull image from registry
          await this.logsService.createLog(
            previewId,
            "build",
            `Pulling image: ${serviceConfig.imageTag}`
          );
          await this.dockerService.pullImage(serviceConfig.imageTag);
        } else {
          throw new Error(
            `Service ${serviceName} must have imageTag. Images should be built by GitHub Action.`
          );
        }
      }

      // Step 3: Deploy services with pulled images
      await this.deployServices(
        preview,
        services,
        previewConfig.env || {},
        imageTags
      );

      // Step 4: Update preview status
      preview.status = PreviewStatus.RUNNING;
      preview.lastAccessedAt = new Date();
      await preview.save();

      await this.logsService.createLog(
        previewId,
        "system",
        `Preview created successfully`
      );
      logger.info(`Preview created for ${previewLabel}`);

      return preview;
    } catch (error) {
      logger.error(`Failed to create preview for ${previewId}:`, error);
      await this.logsService.createLog(
        previewId,
        "system",
        `Preview creation failed: ${(error as Error).message}`
      );

      // Mark as failed
      const preview = await Preview.findOne({ previewId });
      if (preview) {
        preview.status = PreviewStatus.FAILED;
        await preview.save();
      }

      throw error;
    }
  }

  /**
   * Update an existing preview
   */
  async updatePreview(
    previewId: string,
    previewConfig: PreviewConfig
  ): Promise<IPreview> {
    try {
      logger.info(`Updating preview ${previewId}`);

      // Find preview FIRST before creating logs
      const preview = await Preview.findOne({ previewId });
      if (!preview) {
        throw new Error(`Preview ${previewId} not found`);
      }

      // Now create log since preview exists
      await this.logsService.createLog(
        previewId,
        "system",
        `Starting preview update`
      );

      preview.status = PreviewStatus.UPDATING;
      preview.commitSha = previewConfig.commitSha;
      await preview.save();

      // Stop and remove existing containers
      await this.stopServices(preview);

      // Pull Docker images (built by GitHub Action)
      await this.logsService.createLog(
        previewId,
        "system",
        "Pulling updated Docker images from registry..."
      );

      // Extract image tags from service configs
      const imageTags: Record<string, string> = {};
      for (const [serviceName, serviceConfig] of Object.entries(
        previewConfig.services
      )) {
        if (serviceConfig.imageTag) {
          imageTags[serviceName] = serviceConfig.imageTag;
          // Pull image from registry
          await this.logsService.createLog(
            previewId,
            "build",
            `Pulling image: ${serviceConfig.imageTag}`
          );
          await this.dockerService.pullImage(serviceConfig.imageTag);
        } else {
          throw new Error(
            `Service ${serviceName} must have imageTag. Images should be built by GitHub Action.`
          );
        }
      }

      // Redeploy services with new images
      await this.deployServices(
        preview,
        previewConfig.services,
        previewConfig.env || {},
        imageTags
      );

      preview.status = PreviewStatus.RUNNING;
      preview.lastAccessedAt = new Date();
      await preview.save();

      await this.logsService.createLog(
        previewId,
        "system",
        `Preview updated successfully`
      );
      logger.info(`Preview updated for ${previewId}`);

      return preview;
    } catch (error) {
      logger.error(`Failed to update preview ${previewId}:`, error);
      await this.logsService.createLog(
        previewId,
        "system",
        `Preview update failed: ${(error as Error).message}`
      );
      throw error;
    }
  }

  /**
   * Destroy a preview environment by previewId
   */
  async destroyPreview(previewId: string): Promise<void>;
  /**
   * Destroy a preview environment by PR number (backward compatibility)
   */
  async destroyPreview(prNumber: number): Promise<void>;
  async destroyPreview(identifier: string | number): Promise<void> {
    try {
      // Support both previewId (string) and prNumber (number) for backward compatibility
      let preview: IPreview | null;
      if (typeof identifier === "number") {
        // Legacy: find by prNumber
        preview = await Preview.findOne({
          previewType: PreviewType.PULL_REQUEST,
          prNumber: identifier,
        });
      } else {
        // New: find by previewId
        preview = await Preview.findOne({ previewId: identifier });
      }

      if (!preview) {
        logger.warn(`Preview ${identifier} not found`);
        return;
      }

      const previewId = preview.previewId;
      logger.info(`Destroying preview ${previewId}`);
      await this.logsService.createLog(
        previewId,
        "system",
        `Starting preview destruction`
      );

      preview.status = PreviewStatus.DESTROYING;
      await preview.save();

      // Stop and remove containers
      await this.stopServices(preview);

      // Remove database
      if (preview.database) {
        await this.destroyDatabase(preview);
      }

      // Remove images
      for (const service of preview.services) {
        try {
          await this.dockerService.removeImage(service.imageTag);
        } catch (error) {
          logger.error(`Failed to remove image ${service.imageTag}:`, error);
        }
      }

      // Update status
      preview.status = PreviewStatus.DESTROYED;
      await preview.save();

      await this.logsService.createLog(
        previewId,
        "system",
        `Preview destroyed successfully`
      );
      logger.info(`Preview destroyed for ${previewId}`);
    } catch (error) {
      logger.error(`Failed to destroy preview ${identifier}:`, error);
      throw error;
    }
  }

  /**
   * Get preview details by previewId or PR number
   */
  async getPreview(
    identifier: string | number
  ): Promise<PreviewDetails | null> {
    let preview: IPreview | null;
    if (typeof identifier === "number") {
      // Legacy: find by prNumber
      preview = await Preview.findOne({
        previewType: PreviewType.PULL_REQUEST,
        prNumber: identifier,
      });
    } else {
      // New: find by previewId
      preview = await Preview.findOne({ previewId: identifier });
    }

    if (!preview) {
      return null;
    }

    return this.formatPreviewDetails(preview);
  }

  /**
   * List all previews
   */
  async listPreviews(filters?: {
    status?: PreviewStatus;
    repoOwner?: string;
    repoName?: string;
  }): Promise<PreviewDetails[]> {
    const query: any = {};

    if (filters?.status) {
      query.status = filters.status;
    }
    if (filters?.repoOwner) {
      query.repoOwner = filters.repoOwner;
    }
    if (filters?.repoName) {
      query.repoName = filters.repoName;
    }

    const previews = await Preview.find(query).sort({ createdAt: -1 });
    return previews.map((p) => this.formatPreviewDetails(p));
  }

  /**
   * Provision database for preview
   */
  private async provisionDatabase(
    preview: IPreview,
    databaseConfig: any
  ): Promise<void> {
    try {
      const dbName = generateDatabaseName(preview.previewId);
      await this.logsService.createLog(
        preview.previewId,
        "database",
        `Provisioning ${databaseConfig.type} database...`
      );

      const provisioner = DBProvisionerFactory.getProvisioner(
        databaseConfig.type as DatabaseType
      );
      const connectionString = await provisioner.createDatabase(
        preview.previewId,
        dbName
      );

      // Run migrations if specified
      if (databaseConfig.migrations) {
        await this.logsService.createLog(
          preview.previewId,
          "database",
          `Running migrations...`
        );
        await provisioner.runMigrations(
          connectionString,
          databaseConfig.migrations
        );
      }

      preview.database = {
        type: databaseConfig.type,
        name: dbName,
        connectionString,
      };
      await preview.save();

      await this.logsService.createLog(
        preview.previewId,
        "database",
        `Database provisioned successfully`
      );
    } catch (error) {
      logger.error(
        `Failed to provision database for ${preview.previewId}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Destroy database for preview
   */
  private async destroyDatabase(preview: IPreview): Promise<void> {
    try {
      if (!preview.database) return;

      await this.logsService.createLog(
        preview.previewId,
        "database",
        `Destroying database...`
      );

      const provisioner = DBProvisionerFactory.getProvisioner(
        preview.database.type
      );
      await provisioner.destroyDatabase(
        preview.previewId,
        preview.database.name
      );

      await this.logsService.createLog(
        preview.previewId,
        "database",
        `Database destroyed`
      );
    } catch (error) {
      logger.error(
        `Failed to destroy database for ${preview.previewId}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Resolve magic variables like ${API_URL} to actual service URLs
   */
  private resolveEnvVariables(
    env: Record<string, string>,
    serviceUrls: Record<string, string>,
    databaseUrl?: string
  ): Record<string, string> {
    const resolved: Record<string, string> = {};

    for (const [key, value] of Object.entries(env)) {
      if (typeof value !== "string") {
        resolved[key] = value;
        continue;
      }

      let resolvedValue = value;

      // Replace ${DATABASE_URL}
      if (databaseUrl && resolvedValue.includes("${DATABASE_URL}")) {
        resolvedValue = resolvedValue.replace(/\$\{DATABASE_URL\}/g, databaseUrl);
      }

      // Replace ${SERVICE_NAME_URL} patterns (e.g., ${API_URL}, ${FRONTEND_URL})
      for (const [serviceName, serviceUrl] of Object.entries(serviceUrls)) {
        const magicVar = `\${${serviceName.toUpperCase()}_URL}`;
        if (resolvedValue.includes(magicVar)) {
          resolvedValue = resolvedValue.replace(
            new RegExp(`\\$\\{${serviceName.toUpperCase()}_URL\\}`, "g"),
            serviceUrl
          );
        }
      }

      resolved[key] = resolvedValue;
    }

    return resolved;
  }

  /**
   * Deploy all services
   */
  private async deployServices(
    preview: IPreview,
    services: Record<string, any>,
    env: Record<string, string>,
    imageTags: Record<string, string>
  ): Promise<void> {
    const serviceList = [];

    // First, generate all service URLs so we can resolve magic variables
    const serviceUrls: Record<string, string> = {};
    for (const serviceName of Object.keys(services)) {
      serviceUrls[serviceName] = this.traefikService.generateServiceUrl(
        preview.previewId,
        preview.repoOwner,
        serviceName
      );
    }

    for (const [serviceName, serviceConfig] of Object.entries(services)) {
      try {
        await this.logsService.createLog(
          preview.previewId,
          "deploy",
          `Deploying service: ${serviceName}`
        );

        // Generate container name
        const containerName = generateContainerName(
          preview.previewId,
          serviceName
        );

        // Use the built image tag
        const imageTag = imageTags[serviceName];
        if (!imageTag) {
          throw new Error(
            `Image tag not found for service ${serviceName}. Build may have failed.`
          );
        }

        // Prepare environment variables
        let containerEnv = { ...env };
        if (preview.database) {
          containerEnv.DATABASE_URL = preview.database.connectionString;
        }

        // Merge service-specific env vars
        if (serviceConfig.env) {
          Object.assign(containerEnv, serviceConfig.env);
        }

        // Resolve magic variables (${API_URL}, ${FRONTEND_URL}, etc.) to actual URLs
        containerEnv = this.resolveEnvVariables(
          containerEnv,
          serviceUrls,
          preview.database?.connectionString
        );

        // Generate Traefik labels
        const labels = await this.traefikService.generateLabels(
          preview.previewId,
          preview.repoOwner,
          serviceName,
          serviceConfig.port || 8080,
          preview.password
        );

        // Create container config
        const containerConfig: ContainerConfig = {
          name: containerName,
          image: imageTag,
          env: containerEnv,
          labels,
          port: serviceConfig.port,
        };

        // Create and start container
        const containerId = await this.dockerService.createContainer(
          containerConfig
        );
        await this.dockerService.startContainer(containerId);

        // Generate service URL
        const url = this.traefikService.generateServiceUrl(
          preview.previewId,
          preview.repoOwner,
          serviceName
        );

        serviceList.push({
          name: serviceName,
          containerId,
          imageTag,
          port: serviceConfig.port || 8080,
          url,
          status: ServiceStatus.RUNNING,
        });

        preview.urls.set(serviceName, url);

        await this.logsService.createLog(
          preview.previewId,
          "deploy",
          `Service ${serviceName} deployed: ${url}`
        );
      } catch (error) {
        logger.error(`Failed to deploy service ${serviceName}:`, error);
        throw error;
      }
    }

    preview.services = serviceList;
    await preview.save();
  }

  /**
   * Stop all services
   */
  private async stopServices(preview: IPreview): Promise<void> {
    for (const service of preview.services) {
      try {
        await this.dockerService.stopContainer(service.containerId);
        await this.dockerService.removeContainer(service.containerId);
        await this.logsService.createLog(
          preview.previewId,
          "deploy",
          `Service ${service.name} stopped`
        );
      } catch (error) {
        logger.error(`Failed to stop service ${service.name}:`, error);
      }
    }
  }

  /**
   * Format preview details
   */
  private formatPreviewDetails(preview: IPreview): PreviewDetails {
    return {
      previewType: preview.previewType,
      prNumber: preview.prNumber,
      previewId: preview.previewId,
      repoName: preview.repoName,
      repoOwner: preview.repoOwner,
      branch: preview.branch,
      commitSha: preview.commitSha,
      status: preview.status,
      services: preview.services.map((s) => ({
        name: s.name,
        containerId: s.containerId,
        imageTag: s.imageTag,
        port: s.port,
        url: s.url,
        status: s.status as ServiceStatus,
      })),
      database: preview.database,
      urls: Object.fromEntries(preview.urls),
      createdAt: preview.createdAt,
      updatedAt: preview.updatedAt,
      lastAccessedAt: preview.lastAccessedAt,
    };
  }
}
