"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const pg_1 = require("pg");
let client;
// const config =
//   process.env.STAGE === "local"
//     ? // local connection handled entirely via env vars
//       null
//     : {
//         // TODO: CloudSQL Proxy Connection
//       };
async function connect() {
    if (!client) {
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
                database: process.env.PGPASSWORD,
                password: process.env.PGDATABASE,
            };
            if (process.env.PGPORT) {
                config.port = parseInt(process.env.PGPORT, 10);
            }
        }
        else {
            throw new Error("Set PostgreSQL environment variables PGUSER, PGHOST, PGPASSWORD, PGDATABASE, PGPORT or PGCONNECTIONSTRING");
        }
        client = new pg_1.Client(config);
        await client.connect();
    }
}
exports.connect = connect;
async function disconnect() {
    if (client) {
        await client.end();
        client = null;
    }
}
exports.disconnect = disconnect;
async function query(...args) {
    if (!client) {
        await connect();
    }
    return client.query.apply(client, args);
}
exports.query = query;
async function transaction(commands = []) {
    if (!client) {
        await connect();
    }
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
}
exports.transaction = transaction;
