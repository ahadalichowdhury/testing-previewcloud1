import { logger } from "../utils/logger";
import { PreviewService } from "./preview.service";

export interface GitHubWebhookPayload {
  action: string;
  pull_request: {
    number: number;
    state: string;
    head: {
      ref: string;
      sha: string;
    };
  };
  repository: {
    name: string;
    owner: {
      login: string;
    };
  };
}

export class GitHubService {
  private previewService: PreviewService;

  constructor() {
    this.previewService = new PreviewService();
  }

  /**
   * Handle GitHub webhook events
   */
  async handleWebhook(payload: GitHubWebhookPayload): Promise<void> {
    const { action, pull_request, repository } = payload;

    logger.info(
      `GitHub webhook received: ${action} for PR #${pull_request.number}`
    );

    try {
      switch (action) {
        case "opened":
        case "synchronize":
          // Create or update preview
          await this.handlePROpenedOrUpdated(pull_request, repository);
          break;

        case "closed":
          // Destroy preview
          await this.handlePRClosed(pull_request.number);
          break;

        case "reopened":
          // Recreate preview
          await this.handlePROpenedOrUpdated(pull_request, repository);
          break;

        default:
          logger.info(`Ignoring webhook action: ${action}`);
      }
    } catch (error) {
      logger.error(
        `Failed to handle webhook for PR #${pull_request.number}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Handle PR opened or updated (synchronize)
   */
  private async handlePROpenedOrUpdated(
    pullRequest: any,
    _repository: any
  ): Promise<void> {
    logger.info(`Handling PR ${pullRequest.number} opened/updated`);

    // Note: In a real implementation, this would fetch the preview.yaml from the repo
    // For now, we'll create a basic preview configuration
    // The GitHub Action should handle the actual deployment by calling the API

    logger.info(
      `Webhook processed for PR #${pullRequest.number}. Waiting for GitHub Action to deploy.`
    );
  }

  /**
   * Handle PR closed
   */
  private async handlePRClosed(prNumber: number): Promise<void> {
    logger.info(`Handling PR ${prNumber} closed - destroying preview`);

    try {
      await this.previewService.destroyPreview(prNumber);
      logger.info(`Preview destroyed for closed PR #${prNumber}`);
    } catch (error) {
      logger.error(
        `Failed to destroy preview for closed PR #${prNumber}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Parse preview.yaml content
   */
  parsePreviewYaml(yamlContent: string): any {
    // This would parse the YAML and return structured config
    // Implementation depends on js-yaml library
    const yaml = require("js-yaml");
    return yaml.load(yamlContent);
  }
}
