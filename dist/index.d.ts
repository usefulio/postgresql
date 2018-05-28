import { QueryConfig, QueryResult } from "pg";
/**
 * Connects to database using environment variables PGUSER, PGHOST, PGPASSWORD,
 * PGDATABASE, PGPORT or single PGCONNECTIONSTRING variable for the connection
 * string.
 *
 * @async
 * @function connect
 */
declare const connect: () => Promise<void>;
/**
 * Disconnects from database.
 *
 * @async
 * @function disconnect
 */
declare const disconnect: () => Promise<void>;
/**
 * Executes query.
 *
 * @async
 * @function query
 * @param {text: String, values: [String/Number/etc]} command
 * @returns {Promise<QueryResult | undefined>}
 */
declare const query: (command: QueryConfig) => Promise<QueryResult | undefined>;
/**
 * Runs a set of queries as a transaction.
 * See: https://node-postgres.com/features/transactions
 *
 * @async
 * @function transaction
 * @param {Array<QueryConfig>} commands the set of SQL commands you want to run.
 * It's an array of objects where each one have the `text` and `values`
 * properties.
 * @returns {Promise<QueryResult | undefined>}
 */
declare const transaction: (commands?: QueryConfig[]) => Promise<QueryResult[] | undefined>;
export { connect, disconnect, query, transaction };
