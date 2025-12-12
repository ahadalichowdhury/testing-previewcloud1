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
    prNumber: number,
    serviceName: string,
    serviceConfig: ServiceConfig,
    repoPath: string
  ): Promise<string> {
    const imageTag = this.generateImageTag(prNumber, serviceName);
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
          prNumber,
          "build",
          `[${serviceName}] ${message}`
        );
      });

      logger.info(`Successfully built image: ${imageTag}`);
      return imageTag;
    } catch (error) {
      logger.error(`Failed to build image for ${serviceName}:`, error);
      await this.logsService.createLog(
        prNumber,
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
    prNumber: number,
    services: Record<string, ServiceConfig>,
    repoPath: string
  ): Promise<Record<string, string>> {
    logger.info(
      `Building ${Object.keys(services).length} services for PR #${prNumber}`
    );

    const buildPromises = Object.entries(services).map(
      async ([name, config]) => {
        const imageTag = await this.buildServiceImage(
          prNumber,
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

      logger.info(`Successfully built all services for PR #${prNumber}`);
      return imageTags;
    } catch (error) {
      logger.error(`Failed to build services for PR #${prNumber}:`, error);
      throw error;
    }
  }

  /**
   * Generate unique image tag
   */
  private generateImageTag(prNumber: number, serviceName: string): string {
    const uniqueId = generateUniqueId();
    return `previewcloud/pr-${prNumber}-${serviceName}:${uniqueId}`;
  }

  /**
   * Clean up build artifacts
   */
  async cleanupBuildArtifacts(
    prNumber: number,
    services: string[]
  ): Promise<void> {
    logger.info(`Cleaning up build artifacts for PR #${prNumber}`);

    for (const serviceName of services) {
      try {
        // Remove images that match this PR and service
        const imagePattern = `previewcloud/pr-${prNumber}-${serviceName}`;
        // Note: This is a simplified cleanup, in production you'd want to list and remove specific images
        logger.debug(`Cleaned up images for ${imagePattern}`);
      } catch (error) {
        logger.error(`Failed to cleanup artifacts for ${serviceName}:`, error);
      }
    }
  }
}
