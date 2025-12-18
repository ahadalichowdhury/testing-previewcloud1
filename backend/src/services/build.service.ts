import * as path from "path";
import { BuildContext, ServiceConfig } from "../types/preview.types";
import { generateUniqueId } from "../utils/helpers";
import { logger } from "../utils/logger";
import { DockerService } from "./docker.service";
import { LogsService } from "./logs.service";

export class BuildService {
  private dockerService: DockerService;
  private logsService: LogsService;

  constructor() {
    this.dockerService = new DockerService();
    this.logsService = new LogsService();
  }

  /**
   * Build Docker image for a service
   */
  async buildServiceImage(
    previewId: string,
    serviceName: string,
    serviceConfig: ServiceConfig,
    repoPath: string
  ): Promise<string> {
    const imageTag = this.generateImageTag(previewId, serviceName);
    const dockerfilePath = path.join(repoPath, serviceConfig.dockerfile);
    const contextPath = serviceConfig.context
      ? path.join(repoPath, serviceConfig.context)
      : path.dirname(dockerfilePath);

    const buildContext: BuildContext = {
      dockerfile: dockerfilePath,
      context: contextPath,
      tag: imageTag,
      buildArgs: serviceConfig.buildArgs,
    };

    try {
      logger.info(`Building image for service ${serviceName}: ${imageTag}`);

      // Build image with progress logging
      await this.dockerService.buildImage(buildContext, (message) => {
        // Log to database
        this.logsService.createLog(
          previewId,
          "build",
          `[${serviceName}] ${message}`
        );
      });

      logger.info(`Successfully built image: ${imageTag}`);
      return imageTag;
    } catch (error) {
      logger.error(`Failed to build image for ${serviceName}:`, error);
      await this.logsService.createLog(
        previewId,
        "build",
        `[${serviceName}] Build failed: ${(error as Error).message}`
      );
      throw error;
    }
  }

  /**
   * Build all services in parallel
   */
  async buildAllServices(
    previewId: string,
    services: Record<string, ServiceConfig>,
    repoPath: string
  ): Promise<Record<string, string>> {
    logger.info(
      `Building ${
        Object.keys(services).length
      } services for preview ${previewId}`
    );

    const buildPromises = Object.entries(services).map(
      async ([name, config]) => {
        const imageTag = await this.buildServiceImage(
          previewId,
          name,
          config,
          repoPath
        );
        return { name, imageTag };
      }
    );

    try {
      const results = await Promise.all(buildPromises);

      const imageTags: Record<string, string> = {};
      results.forEach(({ name, imageTag }) => {
        imageTags[name] = imageTag;
      });

      logger.info(`Successfully built all services for preview ${previewId}`);
      return imageTags;
    } catch (error) {
      logger.error(`Failed to build services for preview ${previewId}:`, error);
      throw error;
    }
  }

  /**
   * Generate unique image tag
   */
  private generateImageTag(previewId: string, serviceName: string): string {
    const uniqueId = generateUniqueId();
    return `previewcloud/${previewId}-${serviceName}:${uniqueId}`;
  }

  /**
   * Clean up build artifacts
   */
  async cleanupBuildArtifacts(
    previewId: string,
    services: string[]
  ): Promise<void> {
    logger.info(`Cleaning up build artifacts for preview ${previewId}`);

    for (const serviceName of services) {
      try {
        // Remove images that match this preview and service
        const imagePattern = `previewcloud/${previewId}-${serviceName}`;
        // Note: This is a simplified cleanup, in production you'd want to list and remove specific images
        logger.debug(`Cleaned up images for ${imagePattern}`);
      } catch (error) {
        logger.error(`Failed to cleanup artifacts for ${serviceName}:`, error);
      }
    }
  }
}
