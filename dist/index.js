"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
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
