/**
 * Interface for database provisioners
 */
export interface IDBProvisioner {
  /**
   * Create a new database for a preview environment
   */
  createDatabase(prNumber: number): Promise<string>;

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
  destroyDatabase(prNumber: number): Promise<void>;

  /**
   * Check if database exists
   */
  databaseExists(prNumber: number): Promise<boolean>;

  /**
   * Get connection string for a preview database
   */
  getConnectionString(prNumber: number): string;
}
