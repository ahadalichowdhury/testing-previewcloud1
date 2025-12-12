import compression from "compression";
import cors from "cors";
import express from "express";
import expressWs from "express-ws";
import helmet from "helmet";
import { connectDatabase } from "./config/database";
import { ensureNetwork } from "./config/docker";
import { config } from "./config/env";
import { errorHandler } from "./middleware/errorHandler";
import authRoutes from "./routes/auth.routes";
import healthRoutes from "./routes/health.routes";
import previewRoutes from "./routes/preview.routes";
import swaggerRoutes from "./routes/swagger.routes";
import webhookRoutes from "./routes/webhook.routes";
import { CleanupScheduler } from "./services/cleanup.service";
import { logger } from "./utils/logger";

// Initialize Express with WebSocket support
const wsInstance = expressWs(express());
const app = wsInstance.app;

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, _res, next) => {
  logger.debug(`${req.method} ${req.path}`);
  next();
});

// Routes
app.use("/api/health", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/previews", previewRoutes);
app.use("/api/webhooks", webhookRoutes);
app.use("/api/docs", swaggerRoutes);

// Root endpoint
app.get("/", (_req, res) => {
  res.json({
    name: "PreviewCloud API",
    version: "1.0.0",
    status: "running",
    endpoints: {
      health: "/api/health",
      auth: "/api/auth",
      previews: "/api/previews",
      webhooks: "/api/webhooks",
      docs: "/api/docs",
    },
  });
});

// Error handling
app.use(errorHandler);

// Start server
async function bootstrap() {
  try {
    // Connect to MongoDB
    await connectDatabase();
    logger.info("✓ Database connected");

    // Ensure Traefik network exists
    await ensureNetwork(config.traefikNetwork);
    logger.info(`✓ Docker network '${config.traefikNetwork}' ready`);

    // Initialize cleanup scheduler
    const cleanupScheduler = new CleanupScheduler();
    cleanupScheduler.start();
    logger.info("✓ Cleanup scheduler started");

    // Start server
    app.listen(config.port, () => {
      logger.info(`🚀 PreviewCloud Backend running on port ${config.port}`);
      logger.info(`   Environment: ${config.nodeEnv}`);
      logger.info(`   Base Domain: ${config.baseDomain}`);
      logger.info(`   Max Previews: ${config.maxPreviews}`);
      logger.info(`   Idle Timeout: ${config.idleTimeoutHours} hours`);
    });
  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
}

bootstrap();

// Graceful shutdown
process.on("SIGTERM", () => {
  logger.info("SIGTERM received, shutting down gracefully");
  process.exit(0);
});

process.on("SIGINT", () => {
  logger.info("SIGINT received, shutting down gracefully");
  process.exit(0);
});

export { app };
