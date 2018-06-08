import { Client, QueryConfig, QueryResult } from "pg";
export declare let client: Client | null;
export declare function connect(): Promise<void>;
export declare function disconnect(): Promise<void>;
export declare function query(queryTextOrConfig: string | QueryConfig, values?: any[]): Promise<QueryResult>;
export declare function query(command: QueryConfig): Promise<QueryResult>;
export declare function transaction(commands?: Array<QueryConfig>): Promise<Array<QueryResult> | undefined>;
