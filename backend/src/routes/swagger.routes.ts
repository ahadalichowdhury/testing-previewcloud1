import { Router } from "express";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "../config/swagger";

const router = Router();

// Clean swagger spec to remove any /v1 prefixes from paths
const swaggerSpecAny = swaggerSpec as any;
const cleanSwaggerSpec = {
  ...swaggerSpecAny,
  paths: Object.keys(swaggerSpecAny.paths || {}).reduce(
    (acc: any, path: string) => {
      // Remove any /v1 prefix if it exists
      const cleanPath = path.replace(/^\/v1/, "");
      acc[cleanPath] = swaggerSpecAny.paths[path];
      return acc;
    },
    {} as any
  ),
};

// Swagger UI static files middleware - handles CSS, JS, etc.
router.use("/", swaggerUi.serve);

// Swagger UI setup - serves the HTML page
router.get(
  "/",
  swaggerUi.setup(cleanSwaggerSpec, {
    customCss: ".swagger-ui .topbar { display: none }",
    customSiteTitle: "PreviewCloud API Documentation",
    customJs: `
      window.onload = function() {
        // Fix for Swagger UI adding /v1 prefix
        const originalFetch = window.fetch;
        window.fetch = function(url, options) {
          // Remove /v1 from URL if present
          if (typeof url === 'string' && url.includes('/v1/')) {
            url = url.replace('/v1/', '/');
          }
          return originalFetch.call(this, url, options);
        };
      };
    `,
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      filter: true,
      tryItOutEnabled: true,
      supportedSubmitMethods: ["get", "post", "put", "delete", "patch"],
      validatorUrl: null,
      deepLinking: true,
      requestInterceptor: (request: any) => {
        // Remove /v1 from request URL if present
        if (request.url && request.url.includes("/v1/")) {
          request.url = request.url.replace("/v1/", "/");
        }
        return request;
      },
    },
  })
);

// Serve OpenAPI JSON
router.get("/json", (_req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.send(cleanSwaggerSpec);
});

// Debug endpoint to check if route is working
router.get("/test", (_req, res) => {
  res.json({
    success: true,
    message: "Swagger route is working",
    paths: Object.keys(cleanSwaggerSpec.paths || {}).length,
  });
});

export default router;
