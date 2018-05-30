import { QueryConfig, QueryResult } from "pg";
declare function connect(): Promise<void>;
declare function disconnect(): Promise<void>;
declare function query(queryTextOrConfig: string | QueryConfig, values?: any[]): Promise<QueryResult>;
declare function query(command: QueryConfig): Promise<QueryResult>;
declare function transaction(commands?: Array<QueryConfig>): Promise<Array<QueryResult> | undefined>;
export { connect, disconnect, query, transaction };
