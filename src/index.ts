import { Client, ClientConfig, QueryConfig, QueryResult } from "pg";

let client: Client | null;

// const config =
//   process.env.STAGE === "local"
//     ? // local connection handled entirely via env vars
//       null
//     : {
//         // TODO: CloudSQL Proxy Connection
//       };

/**
 * Connects to database using environment variables PGUSER, PGHOST, PGPASSWORD,
 * PGDATABASE, PGPORT or single PGCONNECTIONSTRING variable for the connection
 * string.
 *
 * @async
 * @function connect
 */
const connect = async () => {
  if (!client) {
    let config: ClientConfig;
    if (process.env.PGCONNECTIONSTRING) {
      config = {
        connectionString: process.env.PGCONNECTIONSTRING,
      };
    } else if (
      process.env.PGUSER ||
      process.env.PGHOST ||
      process.env.PGPASSWORD ||
      process.env.PGDATABASE ||
      process.env.PGPORT
    ) {
      config = {
        user: process.env.PGUSER,
        host: process.env.PGHOST,
        database: process.env.PGPASSWORD,
        password: process.env.PGDATABASE,
      };
      if (process.env.PGPORT) {
        config.port = parseInt(process.env.PGPORT, 10);
      }
    } else {
      throw new Error(
        "Set PostgreSQL environment variables PGUSER, PGHOST, PGPASSWORD, PGDATABASE, PGPORT or PGCONNECTIONSTRING",
      );
    }
    client = new Client(config);
    await client.connect();
  }
};

/**
 * Disconnects from database.
 *
 * @async
 * @function disconnect
 */
const disconnect = async () => {
  if (client) {
    await client.end();
    client = null;
  }
};

/**
 * Executes query.
 *
 * @async
 * @function query
 * @param {text: String, values: [String/Number/etc]} command
 * @returns {Promise<QueryResult | undefined>}
 */
const query = async (
  command: QueryConfig,
): Promise<QueryResult | undefined> => {
  if (!client) {
    await connect();
  }
  return await client!.query(command);
};

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
const transaction = async (
  commands: Array<QueryConfig> = [],
): Promise<Array<QueryResult> | undefined> => {
  if (!client) {
    await connect();
  }
  try {
    await client!.query("BEGIN");
    const result = await Promise.all(
      commands.map(command => client!.query(command)),
    );
    await client!.query("COMMIT");
    return result;
  } catch (e) {
    await client!.query("ROLLBACK");
    throw e;
  }
};

export { connect, disconnect, query, transaction };
