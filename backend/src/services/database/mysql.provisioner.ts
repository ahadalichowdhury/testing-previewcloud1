import * as fs from "fs";
import mysql from "mysql2/promise";
import * as path from "path";
import { config } from "../../config/env";
import { logger } from "../../utils/logger";
import { IDBProvisioner } from "./provisioner.interface";

export class MySQLProvisioner implements IDBProvisioner {
  private pool: mysql.Pool;

  constructor() {
    this.pool = mysql.createPool({
      host: config.mysqlHost,
      port: config.mysqlPort,
      user: config.mysqlAdminUser,
      password: config.mysqlAdminPassword,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });
  }

  async createDatabase(_previewId: string, dbName: string): Promise<string> {
    try {
      // Check if database already exists
      const exists = await this.databaseExists(dbName);
      if (exists) {
        logger.info(`MySQL database ${dbName} already exists`);
        return this.getConnectionString(dbName);
      }

      // Create database
      await this.pool.query(`CREATE DATABASE \`${dbName}\``);
      logger.info(`MySQL database created: ${dbName}`);

      return this.getConnectionString(dbName);
    } catch (error) {
      logger.error(`Failed to create MySQL database ${dbName}:`, error);
      throw error;
    }
  }

  async runMigrations(
    connectionString: string,
    migrationsPath: string
  ): Promise<void> {
    try {
      logger.info(`Running MySQL migrations from ${migrationsPath}`);

      // Create connection to the specific database
      const connection = await mysql.createConnection(connectionString);

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

          // Split by semicolons and execute each statement
          const statements = sql
            .split(";")
            .map((s) => s.trim())
            .filter((s) => s.length > 0);

          for (const statement of statements) {
            await connection.query(statement);
          }
        }

        logger.info("MySQL migrations completed successfully");
      } finally {
        await connection.end();
      }
    } catch (error) {
      logger.error("Failed to run MySQL migrations:", error);
      throw error;
    }
  }

  async destroyDatabase(_previewId: string, dbName: string): Promise<void> {
    try {
      await this.pool.query(`DROP DATABASE IF EXISTS \`${dbName}\``);
      logger.info(`MySQL database destroyed: ${dbName}`);
    } catch (error) {
      logger.error(`Failed to destroy MySQL database ${dbName}:`, error);
      throw error;
    }
  }

  async databaseExists(dbName: string): Promise<boolean> {
    try {
      const [rows] = await this.pool.query(
        `SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = ?`,
        [dbName]
      );
      return (rows as any[]).length > 0;
    } catch (error) {
      logger.error(`Failed to check MySQL database existence:`, error);
      throw error;
    }
  }

  getConnectionString(dbName: string): string {
    return `mysql://${config.mysqlAdminUser}:${config.mysqlAdminPassword}@${config.mysqlHost}:${config.mysqlPort}/${dbName}`;
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}
