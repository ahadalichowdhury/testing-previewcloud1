import { Router } from "express";
import * as logsController from "../controllers/logs.controller";
import * as previewController from "../controllers/preview.controller";
import { verifyApiToken } from "../middleware/auth";
import { asyncHandler } from "../middleware/errorHandler";

const router = Router();

// Preview routes
router.post(
  "/",
  verifyApiToken,
  asyncHandler(previewController.createOrUpdatePreview)
);
router.get("/", asyncHandler(previewController.listPreviews));
router.get("/:prNumber", asyncHandler(previewController.getPreview));
router.delete(
  "/:prNumber",
  verifyApiToken,
  asyncHandler(previewController.destroyPreview)
);

// Log routes
router.get("/:prNumber/logs", asyncHandler(logsController.getLogs));
router.get(
  "/:prNumber/logs/paginated",
  asyncHandler(logsController.getPaginatedLogs)
);
router.get("/:prNumber/logs/stats", asyncHandler(logsController.getLogStats));

// Note: WebSocket routes are handled in index.ts with express-ws

export default router;
