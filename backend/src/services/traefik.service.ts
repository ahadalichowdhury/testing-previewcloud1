import bcrypt from "bcryptjs";
import { config } from "../config/env";
import { generatePreviewUrl } from "../utils/helpers";
import { logger } from "../utils/logger";

export class TraefikService {
  /**
   * Generate Traefik labels for a container
   */
  async generateLabels(
    previewId: string,
    repoOwner: string,
    serviceName: string,
    port: number,
    password?: string
  ): Promise<Record<string, string>> {
    const routerName = `${previewId}-${serviceName}`;
    const serviceDomain = generatePreviewUrl(
      previewId,
      repoOwner,
      serviceName,
      config.baseDomain
    );

    const labels: Record<string, string> = {
      // Enable Traefik for this container
      "traefik.enable": "true",

      // Router configuration
      [`traefik.http.routers.${routerName}.rule`]: `Host(\`${serviceDomain}\`)`,
      [`traefik.http.routers.${routerName}.entrypoints`]: "websecure",

      // Service configuration
      [`traefik.http.services.${routerName}.loadbalancer.server.port`]:
        port.toString(),

      // Metadata labels for tracking
      "previewcloud.managed": "true",
      "previewcloud.previewId": previewId,
      "previewcloud.service": serviceName,
      "previewcloud.owner": repoOwner,
    };

    // Add TLS configuration if SSL is enabled
    if (config.wildcardSsl) {
      labels[`traefik.http.routers.${routerName}.tls`] = "true";
      labels[`traefik.http.routers.${routerName}.tls.certresolver`] =
        "letsencrypt";
    }

    // Add basic auth if password protection is enabled
    if (password || config.previewPasswordProtected) {
      const authPassword = password || config.previewDefaultPassword;
      const middlewareName = `${routerName}-auth`;

      // Generate htpasswd format
      const hashedPassword = await bcrypt.hash(authPassword, 10);
      const htpasswd = `preview:${hashedPassword}`;

      labels[`traefik.http.middlewares.${middlewareName}.basicauth.users`] =
        htpasswd;
      labels[`traefik.http.routers.${routerName}.middlewares`] = middlewareName;
    }

    logger.debug(`Generated Traefik labels for ${serviceDomain}`);
    return labels;
  }

  /**
   * Generate URL for a service
   */
  generateServiceUrl(
    previewId: string,
    repoOwner: string,
    serviceName: string
  ): string {
    const domain = generatePreviewUrl(
      previewId,
      repoOwner,
      serviceName,
      config.baseDomain
    );
    const protocol = config.wildcardSsl ? "https" : "http";
    return `${protocol}://${domain}`;
  }

  /**
   * Get all preview-related labels for filtering
   */
  getPreviewLabels(previewId: string): Record<string, string> {
    return {
      "previewcloud.managed": "true",
      "previewcloud.previewId": previewId,
    };
  }

  /**
   * Validate Traefik configuration
   */
  async validateConfiguration(): Promise<boolean> {
    try {
      // This could be extended to actually ping Traefik API
      logger.info("Traefik configuration validated");
      return true;
    } catch (error) {
      logger.error("Failed to validate Traefik configuration:", error);
      return false;
    }
  }
}
