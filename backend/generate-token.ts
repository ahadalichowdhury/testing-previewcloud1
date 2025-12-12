#!/usr/bin/env ts-node
/**
 * Generate an API token for testing
 * Run: npx ts-node generate-token.ts
 */

import crypto from "crypto";
import jwt from "jsonwebtoken";

// Use the secret from your .env or generate a test one
const JWT_SECRET =
  process.env.JWT_SECRET || "dev-jwt-secret-change-in-production-abc123";

// Generate a simple API token (JWT)
const token = jwt.sign(
  {
    type: "api",
    createdAt: new Date().toISOString(),
  },
  JWT_SECRET,
  {
    expiresIn: "30d", // 30 days
  }
);

console.log("\n╔══════════════════════════════════════════════════════════╗");
console.log("║  🔑 PreviewCloud API Token                               ║");
console.log("╠══════════════════════════════════════════════════════════╣");
console.log("║                                                          ║");
console.log("║  Copy this token to use in Swagger UI:                  ║");
console.log("║                                                          ║");
console.log(`║  ${token.substring(0, 50)}...`);
console.log("║                                                          ║");
console.log("╚══════════════════════════════════════════════════════════╝\n");

console.log("Full Token:");
console.log(token);
console.log("\n");

console.log("📝 How to use in Swagger UI:");
console.log("1. Go to http://localhost:3001/api/docs");
console.log('2. Click the "Authorize" 🔓 button (top right)');
console.log('3. Paste the token above (without "Bearer")');
console.log('4. Click "Authorize" and "Close"');
console.log("5. Now you can test protected endpoints!\n");

// Also generate a simple API key
const apiKey = crypto.randomBytes(32).toString("hex");
console.log("Alternative API Key:");
console.log(apiKey);
console.log("\n");
