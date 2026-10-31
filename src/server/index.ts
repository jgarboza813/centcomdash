import { openDatabase } from "./db/database";
import { createApp } from "./app";
const db = openDatabase(
  process.env.CENTCOM_DB_PATH ?? "data/central-command.sqlite",
);
const server = createApp(db).listen(
  Number(process.env.PORT ?? 3001),
  "127.0.0.1",
  () => console.log("Central Command: http://127.0.0.1:3001"),
);
for (const signal of ["SIGINT", "SIGTERM"] as const)
  process.on(signal, () =>
    server.close(() => {
      db.close();
      process.exit(0);
    }),
  );
