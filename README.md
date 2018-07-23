# @useful/postgresql

## Example usage

```js
import { connect, disconnect, query, transaction, migrate, seed } from "@useful/postgresql";

(async function() {
  await connect();
  const migrationResult = await migrate([
    `CREATE TABLE users (
      id    BIGSERIAL PRIMARY KEY,
      name  character varying(255)
    )`,
    `CREATE TABLE roles (
      id    SERIAL PRIMARY KEY,
      name  character varying(255)
    )`,
  ]);
  const seedResult = await seed([
    `INSERT INTO users(name) VALUES('Mr. Spock')`,
    `INSERT INTO roles(name) VALUES('Chief Science Officer')`,
  ]);
  const queryResult = await query({
    text: "SELECT * FROM users",
    values: [],
  });
  const results = await transaction([
    {
      text: "SELECT * FROM users",
      values: [],
    },
    {
      text: "SELECT * FROM roles",
      values: [],
    },
  ]);
  await disconnect();
})();
```
