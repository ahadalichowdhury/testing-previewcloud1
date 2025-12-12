import * as fs from "fs";
import * as path from "path";
import { Client, Pool } from "pg";
import { config } from "../../config/env";
import { generateDatabaseName } from "../../utils/helpers";
import { logger } from "../../utils/logger";
import { IDBProvisioner } from "./provisioner.interface";

export class PostgresProvisioner implements IDBProvisioner {
  private pool: Pool;

  constructor() {
    this.pool = new Pool({
      host: config.postgresHost,
      port: config.postgresPort,
      user: config.postgresAdminUser,
      password: config.postgresAdminPassword,
      database: "postgres",
    });
  }

  async createDatabase(prNumber: number): Promise<string> {
    const dbName = generateDatabaseName(prNumber);

    try {
      // Check if database already exists
      const exists = await this.databaseExists(prNumber);
      if (exists) {
        logger.info(`PostgreSQL database ${dbName} already exists`);
        return this.getConnectionString(prNumber);
      }

      // Create database
      await this.pool.query(`CREATE DATABASE ${dbName}`);
      logger.info(`PostgreSQL database created: ${dbName}`);

      return this.getConnectionString(prNumber);
    } catch (error) {
      logger.error(`Failed to create PostgreSQL database ${dbName}:`, error);
      throw error;
    }
  }

  async runMigrations(
    connectionString: string,
    migrationsPath: string
  ): Promise<void> {
    try {
      logger.info(`Running PostgreSQL migrations from ${migrationsPath}`);

      // Create client with the preview database
      const client = new Client({ connectionString });
      await client.connect();

      try {
        // Read migration files
        if (!fs.existsSync(migrationsPath)) {
          logger.warn(`Migrations path not found: ${migrationsPath}`);
          return;
        }

        const files = fs
          .readdirSync(migrationsPath)
          .filter((f) => f.endsWith(".sql"))
          .sort();

        for (const file of files) {
          const filePath = path.join(migrationsPath, file);
          const sql = fs.readFileSync(filePath, "utf-8");

          logger.info(`Executing migration: ${file}`);
          await client.query(sql);
        }

        logger.info("PostgreSQL migrations completed successfully");
      } finally {
        await client.end();
      }
    } catch (error) {
      logger.error("Failed to run PostgreSQL migrations:", error);
      throw error;
    }
  }

  async destroyDatabase(prNumber: number): Promise<void> {
    const dbName = generateDatabaseName(prNumber);

    try {
      // Terminate active connections
      await this.pool.query(`
        SELECT pg_terminate_backend(pg_stat_activity.pid)
        FROM pg_stat_activity
        WHERE pg_stat_activity.datname = '${dbName}'
          AND pid <> pg_backend_pid()
      `);

      // Drop database
      await this.pool.query(`DROP DATABASE IF EXISTS ${dbName}`);
      logger.info(`PostgreSQL database destroyed: ${dbName}`);
    } catch (error) {
      logger.error(`Failed to destroy PostgreSQL database ${dbName}:`, error);
      throw error;
    }
  }

  async databaseExists(prNumber: number): Promise<boolean> {
    const dbName = generateDatabaseName(prNumber);

    try {
      const result = await this.pool.query(
        `SELECT 1 FROM pg_database WHERE datname = $1`,
        [dbName]
      );
      return result.rowCount! > 0;
    } catch (error) {
      logger.error(`Failed to check PostgreSQL database existence:`, error);
      throw error;
    }
  }

  getConnectionString(prNumber: number): string {
    const dbName = generateDatabaseName(prNumber);
    return `postgresql://${config.postgresAdminUser}:${config.postgresAdminPassword}@${config.postgresHost}:${config.postgresPort}/${dbName}`;
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}
