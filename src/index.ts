import { createHash } from "crypto";
import { Pool, PoolConfig, PoolClient, QueryConfig, QueryResult } from "pg";

export let pool: Pool | null;

export async function connect() {
  if (!pool) {
    let config: PoolConfig;
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
    pool = new Pool(config);
    pool.on("error", (err: Error, client: PoolClient) => {
      console.error("postgres pool client error:");
      console.error(err);
    });
    // For development only
    // pool.on("connect", (client: PoolClient) => {
    //   console.log("pg client connected");
    // });
    // pool.on("acquire", (client: PoolClient) => {
    //   console.log("pg client acquired");
    // });
    // pool.on("remove", (client: PoolClient) => {
    //   console.log("pg client removed");
    // });
  }
}

export async function disconnect() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}

export async function query(
  queryTextOrConfig: string | QueryConfig,
  values?: any[],
): Promise<QueryResult>;
export async function query(command: QueryConfig): Promise<QueryResult>;

export async function query(...args: any[]): Promise<QueryResult> {
  if (!pool) {
    await connect();
  }
  return pool!.query.apply(pool, args);
}

export async function transaction(
  commands: Array<QueryConfig> = [],
): Promise<Array<QueryResult> | undefined> {
  if (!pool) {
    await connect();
  }
  const client = await pool!.connect();
  try {
    await client!.query("BEGIN");
    const result = await Promise.all(
      commands.map(command => pool!.query(command)),
    );
    await client!.query("COMMIT");
    return result;
  } catch (e) {
    await client!.query("ROLLBACK");
    throw e;
  } finally {
    client!.release();
  }
}

function hashString (string:string):string {
  return createHash("sha1")
    .update(string, "utf8")
    .digest("hex");
}

interface MigrationRecord {
  version: number,
  hash: string,
}

async function executeImmutableSequence(
  sequenceName: string,
  commands: Array<string> = []
): Promise<Array<QueryResult> | undefined> {
  if (!pool) {
    await connect();
  }
  // create the migrations table if it does not exist
  await pool!.query(`CREATE TABLE IF NOT EXISTS ${sequenceName} (
    id        serial PRIMARY KEY,
    version   integer NOT NULL,
    run_at    timestamp WITH TIME ZONE DEFAULT current_timestamp,
    hash      text NOT NULL
  )`);
  let latestCommandVersion: number = 0;
  const migrationsToTrack: Array<QueryConfig> = [];
  // check for changes in any migrations that have already been run
  for (let i: number = 0; i < commands.length; i++) {
    const expectedHash = hashString(commands[i]);
    const existingCommandResult = await pool!.query(
      `SELECT * FROM ${sequenceName} WHERE version=$1`,
      [i],
    );
    const existingCommand = existingCommandResult.rows && existingCommandResult.rows[0];
    if (existingCommand) {
      latestCommandVersion++;
      const actualHash = existingCommand.hash;
      if (actualHash !== expectedHash) {
        throw new Error(`${sequenceName} ${i} does not match existing command run at ${existingCommand.run_at}.`);
      }
    } else {
      migrationsToTrack.push({
        text: `INSERT INTO ${sequenceName}(version, hash) VALUES($1, $2)`,
        values: [i, expectedHash],
      } as QueryConfig);
    }
  }
  // remove any commands that were already run and
  // add the commands that update the `sequenceName` table
  let commandsToRun = (commands.slice(latestCommandVersion)
    .map(command => {
      return { text: command } as QueryConfig;
    }) as Array<QueryConfig>)
    .concat(migrationsToTrack);
  // run the remaining commands
  return commandsToRun.length > 0 ? transaction(commandsToRun) : undefined;
}

/**
 * Runs an immutable set of migrations against your database.
 * Does not re-run migrations that have already been run.
 * Detects if a migration has changed and warns you and exits.
 * @param migrations Array<string> array of sql strings to run as migrations
 */
export async function migrate(
  migrations: Array<string> = []
): Promise<Array<QueryResult> | undefined> {
  return executeImmutableSequence("migrations", migrations);
}

/**
 * Runs an immutable set of seed fixtures against your database.
 * Does not re-run fixtures that have already been run.
 * Detects if a fixture has changed and warns you and exits.
 * @param fixtures Array<string> array of sql strings to run as migrations
 */
export async function seed(
  fixtures: Array<string> = [],
): Promise<Array<QueryResult> | undefined> {
  return executeImmutableSequence("fixtures", fixtures);
}