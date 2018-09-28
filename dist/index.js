"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const crypto_1 = require("crypto");
const pg_1 = require("pg");
async function connect() {
    if (!exports.pool) {
        let config;
        if (process.env.PGCONNECTIONSTRING) {
            config = {
                connectionString: process.env.PGCONNECTIONSTRING,
            };
        }
        else if (process.env.PGUSER ||
            process.env.PGHOST ||
            process.env.PGPASSWORD ||
            process.env.PGDATABASE ||
            process.env.PGPORT) {
            config = {
                user: process.env.PGUSER,
                host: process.env.PGHOST,
                password: process.env.PGPASSWORD,
                database: process.env.PGDATABASE,
            };
            if (process.env.PGPORT) {
                config.port = parseInt(process.env.PGPORT, 10);
            }
        }
        else {
            throw new Error("Set PostgreSQL environment variables PGUSER, PGHOST, PGPASSWORD, PGDATABASE, PGPORT or PGCONNECTIONSTRING");
        }
        exports.pool = new pg_1.Pool(config);
        exports.pool.on("error", (err, client) => {
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
exports.connect = connect;
async function disconnect() {
    if (exports.pool) {
        await exports.pool.end();
        exports.pool = null;
    }
}
exports.disconnect = disconnect;
async function query(...args) {
    if (!exports.pool) {
        await connect();
    }
    return exports.pool.query.apply(exports.pool, args);
}
exports.query = query;
async function transaction(commands = []) {
    if (!exports.pool) {
        await connect();
    }
    const client = await exports.pool.connect();
    try {
        await client.query("BEGIN");
        const result = await Promise.all(commands.map(command => client.query(command)));
        await client.query("COMMIT");
        return result;
    }
    catch (e) {
        await client.query("ROLLBACK");
        throw e;
    }
    finally {
        client.release();
    }
}
exports.transaction = transaction;
function hashString(string) {
    return crypto_1.createHash("sha1")
        .update(string, "utf8")
        .digest("hex");
}
async function executeImmutableSequence(sequenceName, commands = []) {
    if (!exports.pool) {
        await connect();
    }
    // create the migrations table if it does not exist
    await exports.pool.query(`CREATE TABLE IF NOT EXISTS ${sequenceName} (
    id        serial PRIMARY KEY,
    version   integer NOT NULL,
    run_at    timestamp WITH TIME ZONE DEFAULT current_timestamp,
    hash      text NOT NULL
  )`);
    let latestCommandVersion = 0;
    const migrationsToTrack = [];
    // check for changes in any migrations that have already been run
    for (let i = 0; i < commands.length; i++) {
        const expectedHash = hashString(commands[i]);
        const existingCommandResult = await exports.pool.query(`SELECT * FROM ${sequenceName} WHERE version=$1`, [i]);
        const existingCommand = existingCommandResult.rows && existingCommandResult.rows[0];
        if (existingCommand) {
            latestCommandVersion++;
            const actualHash = existingCommand.hash;
            if (actualHash !== expectedHash) {
                throw new Error(`${sequenceName} ${i} does not match existing command run at ${existingCommand.run_at}.`);
            }
        }
        else {
            migrationsToTrack.push({
                text: `INSERT INTO ${sequenceName}(version, hash) VALUES($1, $2)`,
                values: [i, expectedHash],
            });
        }
    }
    // remove any commands that were already run and
    // add the commands that update the `sequenceName` table
    let commandsToRun = commands.slice(latestCommandVersion)
        .map(command => {
        return { text: command };
    })
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
async function migrate(migrations = []) {
    return executeImmutableSequence("migrations", migrations);
}
exports.migrate = migrate;
/**
 * Runs an immutable set of seed fixtures against your database.
 * Does not re-run fixtures that have already been run.
 * Detects if a fixture has changed and warns you and exits.
 * @param fixtures Array<string> array of sql strings to run as migrations
 */
async function seed(fixtures = []) {
    return executeImmutableSequence("fixtures", fixtures);
}
exports.seed = seed;
