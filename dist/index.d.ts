import { Pool, QueryConfig, QueryResult } from "pg";
export declare let pool: Pool | null;
export declare function connect(): Promise<void>;
export declare function disconnect(): Promise<void>;
export declare function query(queryTextOrConfig: string | QueryConfig, values?: any[]): Promise<QueryResult>;
export declare function query(command: QueryConfig): Promise<QueryResult>;
export declare function transaction(commands?: Array<QueryConfig>): Promise<Array<QueryResult> | undefined>;
/**
 * Runs an immutable set of migrations against your database.
 * Does not re-run migrations that have already been run.
 * Detects if a migration has changed and warns you and exits.
 * @param migrations Array<string> array of sql strings to run as migrations
 */
export declare function migrate(migrations?: Array<string>): Promise<Array<QueryResult> | undefined>;
/**
 * Runs an immutable set of seed fixtures against your database.
 * Does not re-run fixtures that have already been run.
 * Detects if a fixture has changed and warns you and exits.
 * @param fixtures Array<string> array of sql strings to run as migrations
 */
export declare function seed(fixtures?: Array<string>): Promise<Array<QueryResult> | undefined>;
