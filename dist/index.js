"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const crypto_1 = require("crypto");
const pg_1 = require("pg");
async function connect() {
    if (!exports.client) {
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
        exports.client = new pg_1.Client(config);
        await exports.client.connect();
    }
}
exports.connect = connect;
async function disconnect() {
    if (exports.client) {
        await exports.client.end();
        exports.client = null;
    }
}
exports.disconnect = disconnect;
async function query(...args) {
    if (!exports.client) {
        await connect();
    }
    return exports.client.query.apply(exports.client, args);
}
exports.query = query;
async function transaction(commands = []) {
    if (!exports.client) {
        await connect();
    }
    try {
        await exports.client.query("BEGIN");
        const result = await Promise.all(commands.map(command => exports.client.query(command)));
        await exports.client.query("COMMIT");
        return result;
    }
    catch (e) {
        await exports.client.query("ROLLBACK");
        throw e;
    }
}
exports.transaction = transaction;
function hashString(string) {
    return crypto_1.createHash("sha1")
        .update(string, "utf8")
        .digest("hex");
}
async function executeImmutableSequence(sequenceName, commands = []) {
    if (!exports.client) {
        await connect();
    }
    // create the migrations table if it does not exist
    await exports.client.query(`CREATE TABLE IF NOT EXISTS ${sequenceName} (
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
        const existingCommandResult = await exports.client.query(`SELECT * FROM ${sequenceName} WHERE version=$1`, [i]);
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
