import bcrypt from "bcryptjs";
import crypto from "crypto";
import { v4 as uuidv4 } from "uuid";

/**
 * Sanitize a string to be safe for use in container/database names
 */
export function sanitizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 63);
}

/**
 * Generate a unique ID for resources
 */
export function generateUniqueId(): string {
  return uuidv4().split("-")[0];
}

/**
 * Generate a container name
 */
export function generateContainerName(
  prNumber: number,
  serviceName: string
): string {
  const sanitized = sanitizeName(serviceName);
  const id = generateUniqueId();
  return `pr-${prNumber}-${sanitized}-${id}`;
}

/**
 * Generate a database name
 */
export function generateDatabaseName(prNumber: number): string {
  return `pr_${prNumber}_db`;
}

/**
 * Generate a preview URL
 */
export function generatePreviewUrl(
  prNumber: number,
  repoOwner: string,
  serviceName: string,
  baseDomain: string
): string {
  const sanitizedOwner = sanitizeName(repoOwner);
  const sanitizedService = sanitizeName(serviceName);
  return `pr-${prNumber}-${sanitizedOwner}.${sanitizedService}.${baseDomain}`;
}

/**
 * Hash a password for basic auth
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

/**
 * Generate htpasswd format for Traefik basic auth
 */
export async function generateHtpasswd(
  username: string,
  password: string
): Promise<string> {
  const hashed = await hashPassword(password);
  return `${username}:${hashed}`;
}

/**
 * Encrypt sensitive data
 */
export function encrypt(text: string, secret: string): string {
  const cipher = crypto.createCipher("aes-256-cbc", secret);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return encrypted;
}

/**
 * Decrypt sensitive data
 */
export function decrypt(encryptedText: string, secret: string): string {
  const decipher = crypto.createDecipher("aes-256-cbc", secret);
  let decrypted = decipher.update(encryptedText, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

/**
 * Sleep for specified milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: Error;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (i < maxRetries - 1) {
        await sleep(delay * Math.pow(2, i));
      }
    }
  }

  throw lastError!;
}

/**
 * Truncate string to max length
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength - 3) + "...";
}

/**
 * Parse boolean from string
 */
export function parseBoolean(
  value: string | undefined,
  defaultValue: boolean = false
): boolean {
  if (!value) return defaultValue;
  return value.toLowerCase() === "true" || value === "1";
}
