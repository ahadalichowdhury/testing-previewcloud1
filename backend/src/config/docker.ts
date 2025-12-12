import Docker from "dockerode";
import { logger } from "../utils/logger";
import { config } from "./env";

let dockerClient: Docker;

export function getDockerClient(): Docker {
  if (!dockerClient) {
    try {
      if (config.dockerHost.startsWith("unix://")) {
        dockerClient = new Docker({
          socketPath: config.dockerHost.replace("unix://", ""),
        });
      } else {
        const url = new URL(config.dockerHost);
        dockerClient = new Docker({
          host: url.hostname,
          port: parseInt(url.port, 10),
          protocol: url.protocol.replace(":", "") as "http" | "https",
        });
      }
      logger.info("Docker client initialized");
    } catch (error) {
      logger.error("Failed to initialize Docker client:", error);
      throw error;
    }
  }
  return dockerClient;
}

export async function ensureNetwork(networkName: string): Promise<void> {
  const docker = getDockerClient();

  try {
    const networks = await docker.listNetworks({
      filters: { name: [networkName] },
    });

    if (networks.length === 0) {
      logger.info(`Creating Docker network: ${networkName}`);
      await docker.createNetwork({
        Name: networkName,
        Driver: "bridge",
      });
    }
  } catch (error) {
    logger.error(`Failed to ensure network ${networkName}:`, error);
    throw error;
  }
}
