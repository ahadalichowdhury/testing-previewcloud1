import Docker from "dockerode";
import * as fs from "fs";
import * as path from "path";
// @ts-ignore - tar-stream types not available
import * as tar from "tar-stream";
import { getDockerClient } from "../config/docker";
import { config } from "../config/env";
import { BuildContext, ContainerConfig } from "../types/preview.types";
import { logger } from "../utils/logger";

export class DockerService {
  private docker: Docker;

  constructor() {
    this.docker = getDockerClient();
  }

  /**
   * Pull a Docker image from a registry
   */
  async pullImage(
    imageTag: string,
    onProgress?: (message: string) => void
  ): Promise<void> {
    try {
      logger.info(`Pulling image: ${imageTag}`);

      return new Promise<void>((resolve, reject) => {
        this.docker.pull(
          imageTag,
          (err: Error | null, stream: NodeJS.ReadableStream | null) => {
            if (err) {
              logger.error(`Failed to pull image ${imageTag}:`, err);
              reject(err);
              return;
            }

            if (!stream) {
              reject(new Error("No stream returned from docker pull"));
              return;
            }

            this.docker.modem.followProgress(
              stream,
              (err: Error | null, _output: any[]) => {
                if (err) {
                  logger.error(`Pull failed for ${imageTag}:`, err);
                  reject(err);
                } else {
                  logger.info(`Successfully pulled image: ${imageTag}`);
                  resolve();
                }
              },
              (event: any) => {
                if (event.status) {
                  const message = `${event.status}${
                    event.id ? ` ${event.id}` : ""
                  }${event.progress ? ` ${event.progress}` : ""}`;
                  logger.debug(`Pull: ${message}`);
                  onProgress?.(message);
                }
              }
            );
          }
        );
      });
    } catch (error) {
      logger.error("Docker pull failed:", error);
      throw error;
    }
  }

  /**
   * Build a Docker image from a Dockerfile
   */
  async buildImage(
    buildContext: BuildContext,
    onProgress?: (message: string) => void
  ): Promise<void> {
    try {
      logger.info(`Building image: ${buildContext.tag}`);

      // Create tar stream from build context
      const tarStream = await this.createTarStream(buildContext.context);

      const stream = await this.docker.buildImage(tarStream, {
        t: buildContext.tag,
        dockerfile: path.basename(buildContext.dockerfile),
        buildargs: buildContext.buildArgs || {},
      });

      // Stream build output
      await new Promise<void>((resolve, reject) => {
        this.docker.modem.followProgress(
          stream,
          (err: Error | null, _res: any[]) => {
            if (err) {
              logger.error(`Build failed for ${buildContext.tag}:`, err);
              reject(err);
            } else {
              logger.info(`Build completed for ${buildContext.tag}`);
              resolve();
            }
          },
          (event: any) => {
            if (event.stream) {
              const message = event.stream.trim();
              if (message) {
                logger.debug(`Build: ${message}`);
                onProgress?.(message);
              }
            }
            if (event.error) {
              logger.error(`Build error: ${event.error}`);
            }
          }
        );
      });
    } catch (error) {
      logger.error("Docker build failed:", error);
      throw error;
    }
  }

  /**
   * Create a container with Traefik labels
   */
  async createContainer(containerConfig: ContainerConfig): Promise<string> {
    try {
      logger.info(`Creating container: ${containerConfig.name}`);

      const container = await this.docker.createContainer({
        name: containerConfig.name,
        Image: containerConfig.image,
        Env: Object.entries(containerConfig.env).map(
          ([key, value]) => `${key}=${value}`
        ),
        Labels: containerConfig.labels,
        HostConfig: {
          NetworkMode: config.traefikNetwork,
          RestartPolicy: {
            Name: "unless-stopped",
          },
        },
        ExposedPorts: containerConfig.port
          ? { [`${containerConfig.port}/tcp`]: {} }
          : undefined,
      });

      logger.info(`Container created: ${container.id}`);
      return container.id;
    } catch (error) {
      logger.error("Container creation failed:", error);
      throw error;
    }
  }

  /**
   * Start a container
   */
  async startContainer(containerId: string): Promise<void> {
    try {
      const container = this.docker.getContainer(containerId);
      await container.start();
      logger.info(`Container started: ${containerId}`);
    } catch (error) {
      logger.error(`Failed to start container ${containerId}:`, error);
      throw error;
    }
  }

  /**
   * Stop a container
   */
  async stopContainer(containerId: string): Promise<void> {
    try {
      const container = this.docker.getContainer(containerId);
      await container.stop({ t: 10 });
      logger.info(`Container stopped: ${containerId}`);
    } catch (error) {
      if ((error as any).statusCode === 304) {
        // Container already stopped
        logger.debug(`Container already stopped: ${containerId}`);
      } else {
        logger.error(`Failed to stop container ${containerId}:`, error);
        throw error;
      }
    }
  }

  /**
   * Remove a container
   */
  async removeContainer(
    containerId: string,
    force: boolean = true
  ): Promise<void> {
    try {
      const container = this.docker.getContainer(containerId);
      await container.remove({ force, v: true });
      logger.info(`Container removed: ${containerId}`);
    } catch (error) {
      if ((error as any).statusCode === 404) {
        // Container not found
        logger.debug(`Container not found: ${containerId}`);
      } else {
        logger.error(`Failed to remove container ${containerId}:`, error);
        throw error;
      }
    }
  }

  /**
   * Get container logs
   */
  async getContainerLogs(
    containerId: string,
    tail: number = 100
  ): Promise<string> {
    try {
      const container = this.docker.getContainer(containerId);
      const logs = await container.logs({
        stdout: true,
        stderr: true,
        tail,
        timestamps: true,
      });

      return logs.toString("utf-8");
    } catch (error) {
      logger.error(`Failed to get logs for container ${containerId}:`, error);
      throw error;
    }
  }

  /**
   * Stream container logs
   */
  async streamContainerLogs(
    containerId: string,
    onData: (data: string) => void
  ): Promise<void> {
    try {
      const container = this.docker.getContainer(containerId);
      const stream = await container.logs({
        stdout: true,
        stderr: true,
        follow: true,
        timestamps: true,
      });

      stream.on("data", (chunk: Buffer) => {
        onData(chunk.toString("utf-8"));
      });

      stream.on("error", (error: Error) => {
        logger.error(`Log stream error for container ${containerId}:`, error);
      });
    } catch (error) {
      logger.error(
        `Failed to stream logs for container ${containerId}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Get container status
   */
  async getContainerStatus(containerId: string): Promise<string> {
    try {
      const container = this.docker.getContainer(containerId);
      const info = await container.inspect();
      return info.State.Status;
    } catch (error) {
      logger.error(`Failed to get status for container ${containerId}:`, error);
      throw error;
    }
  }

  /**
   * List containers by label
   */
  async listContainersByLabel(
    label: string,
    value?: string
  ): Promise<Docker.ContainerInfo[]> {
    try {
      const filters: any = {
        label: value ? [`${label}=${value}`] : [label],
      };

      const containers = await this.docker.listContainers({
        all: true,
        filters: JSON.stringify(filters),
      });

      return containers;
    } catch (error) {
      logger.error("Failed to list containers:", error);
      throw error;
    }
  }

  /**
   * Remove image
   */
  async removeImage(imageTag: string, force: boolean = true): Promise<void> {
    try {
      const image = this.docker.getImage(imageTag);
      await image.remove({ force });
      logger.info(`Image removed: ${imageTag}`);
    } catch (error) {
      if ((error as any).statusCode === 404) {
        logger.debug(`Image not found: ${imageTag}`);
      } else {
        logger.error(`Failed to remove image ${imageTag}:`, error);
        throw error;
      }
    }
  }

  /**
   * Create tar stream from directory
   */
  private async createTarStream(
    contextPath: string
  ): Promise<NodeJS.ReadableStream> {
    const pack = tar.pack();

    const addFilesToTar = (dirPath: string, basePath: string = "") => {
      const files = fs.readdirSync(dirPath);

      files.forEach((file) => {
        const filePath = path.join(dirPath, file);
        const relativePath = path.join(basePath, file);
        const stat = fs.statSync(filePath);

        // Skip node_modules and .git directories
        if (file === "node_modules" || file === ".git") {
          return;
        }

        if (stat.isDirectory()) {
          addFilesToTar(filePath, relativePath);
        } else {
          const content = fs.readFileSync(filePath);
          pack.entry({ name: relativePath, size: stat.size }, content);
        }
      });
    };

    addFilesToTar(contextPath);
    pack.finalize();

    return pack;
  }

  /**
   * Prune unused resources
   */
  async pruneUnusedResources(): Promise<void> {
    try {
      // Prune containers
      await this.docker.pruneContainers();
      logger.info("Pruned unused containers");

      // Prune images
      await this.docker.pruneImages({ filters: { dangling: { true: true } } });
      logger.info("Pruned dangling images");

      // Prune volumes
      await this.docker.pruneVolumes();
      logger.info("Pruned unused volumes");
    } catch (error) {
      logger.error("Failed to prune resources:", error);
      throw error;
    }
  }
}
