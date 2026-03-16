import { app } from "./app.js";
import { config } from "./config.js";
import { ensureSqliteSchema } from "./lib/sqlite.js";

ensureSqliteSchema();

app.listen(config.port, () => {
  console.log(`API listening on http://localhost:${config.port}`);
});
