import * as ts from ".././interfaces";

import { postgres } from "./postgres";
import { sqlite3 } from "./sqlite3";

export const getDatabaseResources = ({ db }: ts.IDatabaseBootstrap) => {
  const migrationTable: string = db.client.config.migrations.tableName || "";

  if (db.client.config.client === "pg") {
    return postgres({ migrationTable });
  }

  if (db.client.config.client === "sqlite3") {
    return sqlite3({ migrationTable });
  }

  throw new Error("unsupported db engine: postgres & sqlite3 only");
};
