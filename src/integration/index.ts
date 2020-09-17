import * as ts from ".././interfaces";

import { dialect as postgres } from "./postgres";
import { dialect as sqlite3 } from "./sqlite3";
import { dialect as mysql } from "./mysql";

export const getDatabaseResources = ({ db }: ts.IDatabaseBootstrap) => {
  const migrationTable: string = db.client.config.migrations.tableName || "";

  if (db.client.config.client === "pg") {
    return postgres({ migrationTable });
  }

  if (db.client.config.client === "sqlite3") {
    return { ...sqlite3({ migrationTable }), dbGeometryColumns: undefined };
  }

  if (db.client.config.client.includes("mysql")) {
    return { ...mysql({ migrationTable }), dbGeometryColumns: undefined };
  }

  throw new Error("unsupported db engine: postgres, mysql & sqlite3 only");
};
