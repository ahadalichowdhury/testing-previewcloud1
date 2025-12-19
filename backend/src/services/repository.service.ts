import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { logger } from "../utils/logger";

export class RepositoryService {
  private reposDir: string;

  constructor() {
    // Use a dedicated directory for cloned repositories
    this.reposDir = process.env.REPOS_DIR || "/tmp/previewcloud-repos";

    // Ensure directory exists
    if (!fs.existsSync(this.reposDir)) {
      fs.mkdirSync(this.reposDir, { recursive: true });
    }
  }

  /**
   * Clone or update a repository
   */
  async cloneOrUpdate(
    repoOwner: string,
    repoName: string,
    branch: string,
    commitSha: string
  ): Promise<string> {
    const repoPath = path.join(this.reposDir, `${repoOwner}-${repoName}`);
    const repoUrl = `https://github.com/${repoOwner}/${repoName}.git`;

    try {
      if (fs.existsSync(repoPath)) {
        // Repository exists, update it
        logger.info(
          `Updating repository: ${repoOwner}/${repoName} (${branch})`
        );

        // Fetch latest changes
        execSync(`git fetch origin ${branch}`, {
          cwd: repoPath,
          stdio: "pipe",
        });

        // Checkout specific commit
        execSync(`git checkout ${commitSha}`, {
          cwd: repoPath,
          stdio: "pipe",
        });
      } else {
        // Clone repository
        logger.info(`Cloning repository: ${repoOwner}/${repoName} (${branch})`);

        // Clone with depth 1 for faster cloning (shallow clone)
        execSync(
          `git clone --depth 1 --branch ${branch} ${repoUrl} "${repoPath}"`,
          {
            stdio: "pipe",
          }
        );

        // If commitSha is provided and different from branch HEAD, fetch and checkout
        if (commitSha) {
          try {
            execSync(`git fetch --depth 100 origin ${branch}`, {
              cwd: repoPath,
              stdio: "pipe",
            });
            execSync(`git checkout ${commitSha}`, {
              cwd: repoPath,
              stdio: "pipe",
            });
          } catch (error) {
            logger.warn(
              `Could not checkout commit ${commitSha}, using branch ${branch}`
            );
          }
        }
      }

      logger.info(`Repository ready at: ${repoPath}`);
      return repoPath;
    } catch (error) {
      logger.error(
        `Failed to clone/update repository: ${repoOwner}/${repoName}`,
        error
      );
      throw new Error(
        `Failed to clone repository: ${(error as Error).message}`
      );
    }
  }

  /**
   * Clean up repository directory (optional, for cleanup tasks)
   */
  async cleanup(repoOwner: string, repoName: string): Promise<void> {
    const repoPath = path.join(this.reposDir, `${repoOwner}-${repoName}`);

    if (fs.existsSync(repoPath)) {
      try {
        fs.rmSync(repoPath, { recursive: true, force: true });
        logger.info(`Cleaned up repository: ${repoPath}`);
      } catch (error) {
        logger.error(`Failed to cleanup repository: ${repoPath}`, error);
      }
    }
  }

  /**
   * Get repository path without cloning
   */
  getRepoPath(repoOwner: string, repoName: string): string {
    return path.join(this.reposDir, `${repoOwner}-${repoName}`);
  }
}
