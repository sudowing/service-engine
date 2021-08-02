import * as ts from ".././interfaces";

import { dialect as postgres } from "./postgres";
import { dialect as redshift } from "./redshift";
import { dialect as sqlite3 } from "./sqlite3";
import { dialect as mysql } from "./mysql";
import { dialect as mssql } from "./mssql";

export const getDatabaseResources = ({ db }: ts.IDatabaseBootstrap) => {
  const migrationTable: string = db.client.config.migrations.tableName || "";

  if (db.client.config.client === "pg") {
    return postgres({ migrationTable });
  }

  if (db.client.config.client === "redshift") {
    return { ...redshift({ migrationTable }), dbGeometryColumns: undefined };
  }  

  if (db.client.config.client === "sqlite3") {
    return { ...sqlite3({ migrationTable }), dbGeometryColumns: undefined };
  }

  // support mysql && mysql2
  if (db.client.config.client.includes("mysql")) {
    return { ...mysql({ migrationTable }), dbGeometryColumns: undefined };
  }

  if (db.client.config.client === "tedious") {
    return { ...mssql({ migrationTable }), dbGeometryColumns: undefined };
  }

  throw new Error("unsupported db engine: postgres, mysql & sqlite3 only");
};
