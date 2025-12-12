import { AppError } from "../middleware/errorHandler";
import { Preview } from "../models/Preview.model";
import { IUser } from "../models/User.model";
import { logger } from "../utils/logger";

// Plan definitions
export const PLANS = {
  free: {
    maxPreviews: 3,
    maxOrganizations: 1,
    maxMembers: 3,
    maxDatabaseSize: "100MB",
    maxBuildTime: 300, // 5 min
    features: ["basic_support"],
  },
  pro: {
    maxPreviews: 20,
    maxOrganizations: 5,
    maxMembers: 10,
    maxDatabaseSize: "1GB",
    maxBuildTime: 900, // 15 min
    features: ["priority_support", "custom_domains", "advanced_logs"],
  },
  enterprise: {
    maxPreviews: -1, // unlimited
    maxOrganizations: -1,
    maxMembers: -1,
    maxDatabaseSize: "10GB",
    maxBuildTime: 1800, // 30 min
    features: ["dedicated_support", "sla", "sso", "audit_logs"],
  },
};

export class ResourceLimitService {
  /**
   * Check if user can create a new preview
   */
  async checkPreviewLimit(user: IUser): Promise<void> {
    const userPlan = PLANS[user.plan];

    // Check if unlimited
    if (userPlan.maxPreviews === -1) {
      return;
    }

    // Count active previews for user
    const activePreviewsCount = await Preview.countDocuments({
      userId: user._id,
      status: { $in: ["creating", "running", "updating"] },
    });

    logger.info(
      `User ${user.email} has ${activePreviewsCount}/${userPlan.maxPreviews} active previews`
    );

    if (activePreviewsCount >= userPlan.maxPreviews) {
      throw new AppError(
        `Preview limit reached. You have ${activePreviewsCount} active previews. ` +
          `Your ${user.plan} plan allows ${userPlan.maxPreviews} previews. ` +
          `Please destroy some previews or upgrade your plan.`,
        403
      );
    }
  }

  /**
   * Get user's current resource usage
   */
  async getUserUsage(user: IUser): Promise<{
    activePreviewsCount: number;
    totalPreviewsCount: number;
    planLimits: typeof PLANS.free | typeof PLANS.pro | typeof PLANS.enterprise;
  }> {
    const [activeCount, totalCount] = await Promise.all([
      Preview.countDocuments({
        userId: user._id,
        status: { $in: ["creating", "running", "updating"] },
      }),
      Preview.countDocuments({ userId: user._id }),
    ]);

    const planLimits = PLANS[user.plan];

    return {
      activePreviewsCount: activeCount,
      totalPreviewsCount: totalCount,
      planLimits,
    };
  }

  /**
   * Check if user owns the preview
   */
  async checkPreviewOwnership(
    previewId: string,
    userId: string
  ): Promise<void> {
    const preview = await Preview.findOne({
      _id: previewId,
      userId,
    });

    if (!preview) {
      throw new AppError(
        "Preview not found or you don't have permission to access it",
        404
      );
    }
  }

  /**
   * Get plan limits for a user
   */
  getPlanLimits(plan: "free" | "pro" | "enterprise") {
    return PLANS[plan];
  }
}
