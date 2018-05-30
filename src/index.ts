import { Client, ClientConfig, QueryConfig, QueryResult } from "pg";

let client: Client | null;

// const config =
//   process.env.STAGE === "local"
//     ? // local connection handled entirely via env vars
//       null
//     : {
//         // TODO: CloudSQL Proxy Connection
//       };

async function connect() {
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
}

async function disconnect() {
  if (client) {
    await client.end();
    client = null;
  }
}

async function query(
  queryTextOrConfig: string | QueryConfig,
  values?: any[],
): Promise<QueryResult>;
async function query(command: QueryConfig): Promise<QueryResult>;

async function query(...args: any[]): Promise<QueryResult> {
  if (!client) {
    await connect();
  }
  return client!.query.apply(client, args);
}

async function transaction(
  commands: Array<QueryConfig> = [],
): Promise<Array<QueryResult> | undefined> {
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
}

export { connect, disconnect, query, transaction };
