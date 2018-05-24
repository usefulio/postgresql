import { Client } from "pg";
import crypto from "crypto";

let client;
const config = process.env.STAGE === "local" ? 
  // local connection handled entirely via env vars
  null 
  : {
    // TODO: CloudSQL Proxy Connection
  };

/**
 * Connects to database using info defined in environment variables 
 * (MONGO_URL, MONGO_DATABASE, MONGO_SSL, MONGO_SSL_VALIDATE).
 *
 * @async
 * @function connect
 */
const connect = async () => {
  if (!client) {
    client = new Client(config);
    // Connect to Postgres server.
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
 * Runs a query.
 *
 * @function query
 * @param {String} text the SQL you want to run
 * @param {Array} values the array of values you want 
 *  to inject into the query
 * @return {Db} MongoDB instance of the Db class.
 */
const query = async (text, values) => {
  if (!client) {
    await connect();
  }
  return client.query(text, values);
};

/**
 * Runs a set of queries as a transaction.
 * See: https://node-postgres.com/features/transactions
 *
 * @function transaction
 * @param {Array[{text: String, values: [String/Number/etc]}]} commands the set of SQL commands you want to run
 *  It's an array of objects who each have a `text` string and a `values` array.
 * @return {Db} MongoDB instance of the Db class.
 */
const transaction = async (commands = []) => {
  if (!client) {
    await connect();
  }
  try {
    await client.query('BEGIN')
    for(let command of commands){
      await client.query(command);
    }
    await client.query('COMMIT');
  } catch(e) {
    await client.query('ROLLBACK')
    throw e;
  }
  return client.query(text, values);
};

/**
 * Generates ID string.
 *
 * @function generateId
 * @param {number} charsCount - Length of the ID string.
 * @return {string} randomized ID string.
 */
const generateId = (charsCount = 17) => {
  const CHARS = "23456789ABCDEFGHJKLMNPQRSTWXYZabcdefghijkmnopqrstuvwxyz";
  const digits = [];
  for (let i = 0; i < charsCount; i++) {
    let bytes;
    try {
      bytes = crypto.randomBytes(4);
    } catch (e) {
      bytes = crypto.pseudoRandomBytes(4);
    }
    const hexString = bytes.toString("hex").substring(0, 8);
    const fraction = parseInt(hexString, 16) * 2.3283064365386963e-10;
    const index = Math.floor(fraction * CHARS.length);
    digits[i] = CHARS.substr(index, 1);
  }
  return digits.join("");
};

export { connect, disconnect, query, transaction };