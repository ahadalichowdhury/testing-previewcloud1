import * as fs from "fs";
import { MongoClient } from "mongodb";
import * as path from "path";
import { config } from "../../config/env";
import { logger } from "../../utils/logger";
import { IDBProvisioner } from "./provisioner.interface";

export class MongoDBProvisioner implements IDBProvisioner {
  private client: MongoClient;
  private adminUri: string;

  constructor() {
    // Build admin connection string
    if (config.mongodbAdminUser && config.mongodbAdminPassword) {
      this.adminUri = `mongodb://${config.mongodbAdminUser}:${config.mongodbAdminPassword}@${config.mongodbHost}:${config.mongodbPort}/admin`;
    } else {
      this.adminUri = `mongodb://${config.mongodbHost}:${config.mongodbPort}`;
    }

    this.client = new MongoClient(this.adminUri);
  }

  async createDatabase(_previewId: string, dbName: string): Promise<string> {
    try {
      await this.client.connect();

      // Check if database already exists
      const exists = await this.databaseExists(dbName);
      if (exists) {
        logger.info(`MongoDB database ${dbName} already exists`);
        return this.getConnectionString(dbName);
      }

      // MongoDB creates database automatically when you insert data
      // So we just create a dummy collection to initialize it
      const db = this.client.db(dbName);
      await db.createCollection("_init");
      logger.info(`MongoDB database created: ${dbName}`);

      return this.getConnectionString(dbName);
    } catch (error) {
      logger.error(`Failed to create MongoDB database ${dbName}:`, error);
      throw error;
    } finally {
      await this.client.close();
    }
  }

  async runMigrations(
    connectionString: string,
    migrationsPath: string
  ): Promise<void> {
    try {
      logger.info(`Running MongoDB migrations from ${migrationsPath}`);

      const client = new MongoClient(connectionString);
      await client.connect();

      try {
        // Read migration files
        if (!fs.existsSync(migrationsPath)) {
          logger.warn(`Migrations path not found: ${migrationsPath}`);
          return;
        }

        const files = fs
          .readdirSync(migrationsPath)
          .filter((f) => f.endsWith(".js") || f.endsWith(".json"))
          .sort();

        for (const file of files) {
          const filePath = path.join(migrationsPath, file);
          logger.info(`Executing migration: ${file}`);

          if (file.endsWith(".js")) {
            // Execute JavaScript migration
            const migration = require(filePath);
            if (typeof migration.up === "function") {
              await migration.up(client.db());
            }
          } else if (file.endsWith(".json")) {
            // Load JSON data
            const data = JSON.parse(fs.readFileSync(filePath, "utf-8"));
            if (data.collection && data.documents) {
              await client
                .db()
                .collection(data.collection)
                .insertMany(data.documents);
            }
          }
        }

        logger.info("MongoDB migrations completed successfully");
      } finally {
        await client.close();
      }
    } catch (error) {
      logger.error("Failed to run MongoDB migrations:", error);
      throw error;
    }
  }

  async destroyDatabase(_previewId: string, dbName: string): Promise<void> {
    try {
      await this.client.connect();
      await this.client.db(dbName).dropDatabase();
      logger.info(`MongoDB database destroyed: ${dbName}`);
    } catch (error) {
      logger.error(`Failed to destroy MongoDB database ${dbName}:`, error);
      throw error;
    } finally {
      await this.client.close();
    }
  }

  async databaseExists(dbName: string): Promise<boolean> {
    try {
      await this.client.connect();
      const adminDb = this.client.db().admin();
      const dbs = await adminDb.listDatabases();
      return dbs.databases.some((db: any) => db.name === dbName);
    } catch (error) {
      logger.error(`Failed to check MongoDB database existence:`, error);
      throw error;
    } finally {
      await this.client.close();
    }
  }

  getConnectionString(dbName: string): string {
    if (config.mongodbAdminUser && config.mongodbAdminPassword) {
      return `mongodb://${config.mongodbAdminUser}:${config.mongodbAdminPassword}@${config.mongodbHost}:${config.mongodbPort}/${dbName}`;
    }

    return `mongodb://${config.mongodbHost}:${config.mongodbPort}/${dbName}`;
  }

  async close(): Promise<void> {
    await this.client.close();
  }
}
