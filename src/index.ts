import { Client, ClientConfig, QueryConfig, QueryResult } from "pg";

export let client: Client | null;

export async function connect() {
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
        password: process.env.PGPASSWORD,
        database: process.env.PGDATABASE,
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

export async function disconnect() {
  if (client) {
    await client.end();
    client = null;
  }
}

export async function query(
  queryTextOrConfig: string | QueryConfig,
  values?: any[],
): Promise<QueryResult>;
export async function query(command: QueryConfig): Promise<QueryResult>;

export async function query(...args: any[]): Promise<QueryResult> {
  if (!client) {
    await connect();
  }
  return client!.query.apply(client, args);
}

export async function transaction(
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
