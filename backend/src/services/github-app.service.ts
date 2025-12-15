import { createAppAuth } from "@octokit/auth-app";
import { Octokit } from "@octokit/rest";
import crypto from "crypto";
import fs from "fs";
import { logger } from "../utils/logger";

class GitHubAppService {
  private appAuth: any = null;
  private isConfigured: boolean = false;
  private appId: string = "";
  private privateKey: string = "";
  private webhookSecret: string = "";

  constructor() {
    this.initialize();
  }

  /**
   * Initialize GitHub App
   */
  private initialize(): void {
    try {
      // Check if GitHub App is configured
      if (
        !process.env.GITHUB_APP_ID ||
        !process.env.GITHUB_APP_PRIVATE_KEY_PATH ||
        !process.env.GITHUB_WEBHOOK_SECRET
      ) {
        logger.warn("GitHub App not configured - skipping initialization");
        logger.warn(
          "Set GITHUB_APP_ID, GITHUB_APP_PRIVATE_KEY_PATH, and GITHUB_WEBHOOK_SECRET to enable GitHub App"
        );
        return;
      }

      // Check if private key file exists
      if (!fs.existsSync(process.env.GITHUB_APP_PRIVATE_KEY_PATH)) {
        logger.error(
          `GitHub App private key not found: ${process.env.GITHUB_APP_PRIVATE_KEY_PATH}`
        );
        return;
      }

      // Read private key
      this.privateKey = fs.readFileSync(
        process.env.GITHUB_APP_PRIVATE_KEY_PATH,
        "utf8"
      );

      this.appId = process.env.GITHUB_APP_ID;
      this.webhookSecret = process.env.GITHUB_WEBHOOK_SECRET;

      // Initialize GitHub App auth
      this.appAuth = createAppAuth({
        appId: this.appId,
        privateKey: this.privateKey,
      });

      this.isConfigured = true;
      logger.info(
        `✅ GitHub App initialized (ID: ${process.env.GITHUB_APP_ID})`
      );
    } catch (error: any) {
      logger.error("Failed to initialize GitHub App:", error.message);
      logger.error("GitHub App features will be disabled");
    }
  }

  /**
   * Check if GitHub App is configured
   */
  public isEnabled(): boolean {
    return this.isConfigured && this.appAuth !== null;
  }

  /**
   * Get Octokit instance for installation
   */
  async getInstallationOctokit(installationId: number): Promise<any> {
    if (!this.appAuth) {
      throw new Error("GitHub App not configured");
    }

    // Get installation access token
    const { token } = await this.appAuth({
      type: "installation",
      installationId,
    });

    // Create Octokit instance with installation token
    return new Octokit({
      auth: token,
    });
  }

  /**
   * Verify webhook signature
   */
  async verifyWebhook(signature: string, payload: string): Promise<boolean> {
    if (!this.webhookSecret) {
      return false;
    }
    try {
      // Remove 'sha256=' prefix from signature
      const signatureHash = signature.replace("sha256=", "");

      // Calculate expected signature
      const hmac = crypto.createHmac("sha256", this.webhookSecret);
      const expectedSignature = hmac.update(payload).digest("hex");

      // Compare signatures
      return crypto.timingSafeEqual(
        Buffer.from(signatureHash),
        Buffer.from(expectedSignature)
      );
    } catch (error) {
      logger.error("Webhook verification failed:", error);
      return false;
    }
  }

  /**
   * Get app installation for repository
   */
  async getInstallationForRepo(_owner: string, _repo: string): Promise<any> {
    if (!this.appAuth) {
      throw new Error("GitHub App not configured");
    }

    // This method requires authenticated GitHub App access
    // For now, return a simplified version
    // In production, you'd query GitHub API to get installation ID
    logger.warn("getInstallationForRepo is not fully implemented");
    throw new Error(
      "Method not implemented - use getInstallationOctokit with installation ID"
    );
  }

  /**
   * Post comment on PR
   */
  async commentOnPR(
    installationId: number,
    owner: string,
    repo: string,
    prNumber: number,
    body: string
  ): Promise<void> {
    try {
      const octokit = await this.getInstallationOctokit(installationId);

      await octokit.rest.issues.createComment({
        owner,
        repo,
        issue_number: prNumber,
        body,
      });

      logger.info(`✅ Posted comment on ${owner}/${repo}#${prNumber}`);
    } catch (error: any) {
      logger.error(
        `Failed to post comment on ${owner}/${repo}#${prNumber}:`,
        error.message
      );
      throw error;
    }
  }

  /**
   * Update PR check status
   */
  async updateCheckStatus(
    installationId: number,
    owner: string,
    repo: string,
    sha: string,
    status: "queued" | "in_progress" | "completed",
    conclusion?: "success" | "failure" | "cancelled",
    summary?: string,
    detailsUrl?: string
  ): Promise<void> {
    try {
      const octokit = await this.getInstallationOctokit(installationId);

      const checkParams: any = {
        owner,
        repo,
        name: "PreviewCloud",
        head_sha: sha,
        status,
      };

      if (status === "completed" && conclusion) {
        checkParams.conclusion = conclusion;
        checkParams.output = {
          title: "Preview Environment",
          summary: summary || "Preview deployment complete",
        };
      }

      if (detailsUrl) {
        checkParams.details_url = detailsUrl;
      }

      await octokit.rest.checks.create(checkParams);

      logger.info(`✅ Updated check status for ${owner}/${repo}@${sha}`);
    } catch (error: any) {
      logger.error(`Failed to update check status:`, error.message);
    }
  }

  /**
   * Get installation URL for users
   */
  getInstallationUrl(): string {
    const slug = process.env.GITHUB_APP_SLUG || "previewcloud";
    return `https://github.com/apps/${slug}/installations/new`;
  }

  /**
   * Get list of repositories for installation
   */
  async getInstallationRepositories(installationId: number) {
    try {
      const octokit = await this.getInstallationOctokit(installationId);
      const { data } =
        await octokit.rest.apps.listReposAccessibleToInstallation();
      return data.repositories;
    } catch (error: any) {
      logger.error("Failed to get installation repositories:", error.message);
      throw error;
    }
  }
}

export const githubAppService = new GitHubAppService();
