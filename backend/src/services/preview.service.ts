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

      // Step 2: Build images (this would normally pull from a registry or build locally)
      // For now, we assume images are pre-built or passed in
      await this.logsService.createLog(
        previewId,
        "build",
        "Starting service builds..."
      );

      // Step 3: Deploy services
      await this.deployServices(preview, services, previewConfig.env || {});

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

      // Redeploy services
      await this.deployServices(
        preview,
        previewConfig.services,
        previewConfig.env || {}
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
   * Deploy all services
   */
  private async deployServices(
    preview: IPreview,
    services: Record<string, any>,
    env: Record<string, string>
  ): Promise<void> {
    const serviceList = [];

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

        // Generate image tag (in production, this would come from a registry)
        const imageTag = `previewcloud/${preview.previewId}-${serviceName}:latest`;

        // Prepare environment variables
        const containerEnv = { ...env };
        if (preview.database) {
          containerEnv.DATABASE_URL = preview.database.connectionString;
        }

        // Merge service-specific env vars
        if (serviceConfig.env) {
          Object.assign(containerEnv, serviceConfig.env);
        }

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
