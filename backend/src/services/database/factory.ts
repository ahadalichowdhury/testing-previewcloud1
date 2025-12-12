import { DatabaseType } from "../../types/preview.types";
import { MongoDBProvisioner } from "./mongodb.provisioner";
import { MySQLProvisioner } from "./mysql.provisioner";
import { PostgresProvisioner } from "./postgres.provisioner";
import { IDBProvisioner } from "./provisioner.interface";

/**
 * Factory to get the appropriate database provisioner
 */
export class DBProvisionerFactory {
  private static provisioners: Map<DatabaseType, IDBProvisioner> = new Map();

  static getProvisioner(type: DatabaseType): IDBProvisioner {
    // Return cached provisioner if exists
    if (this.provisioners.has(type)) {
      return this.provisioners.get(type)!;
    }

    // Create new provisioner
    let provisioner: IDBProvisioner;

    switch (type) {
      case DatabaseType.POSTGRES:
        provisioner = new PostgresProvisioner();
        break;
      case DatabaseType.MYSQL:
        provisioner = new MySQLProvisioner();
        break;
      case DatabaseType.MONGODB:
        provisioner = new MongoDBProvisioner();
        break;
      default:
        throw new Error(`Unsupported database type: ${type}`);
    }

    // Cache provisioner
    this.provisioners.set(type, provisioner);
    return provisioner;
  }

  static async closeAll(): Promise<void> {
    for (const provisioner of this.provisioners.values()) {
      if ("close" in provisioner && typeof provisioner.close === "function") {
        await (provisioner as any).close();
      }
    }
    this.provisioners.clear();
  }
}
