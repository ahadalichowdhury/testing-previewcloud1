/**
 * Interface for database provisioners
 */
export interface IDBProvisioner {
  /**
   * Create a new database for a preview environment
   */
  createDatabase(previewId: string, dbName: string): Promise<string>;

  /**
   * Run migrations on the database
   */
  runMigrations(
    connectionString: string,
    migrationsPath: string
  ): Promise<void>;

  /**
   * Destroy a database
   */
  destroyDatabase(previewId: string, dbName: string): Promise<void>;

  /**
   * Check if database exists
   */
  databaseExists(dbName: string): Promise<boolean>;

  /**
   * Get connection string for a preview database
   */
  getConnectionString(dbName: string): string;
}
