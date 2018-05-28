# @useful/postgresql

## Example usage

```js
import { connect, disconnect, query, transaction } from "@useful/postgresql";

(async function() {
  await connect();
  const result = await query({
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
