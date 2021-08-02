import * as ts from ".././interfaces";

import { dialect as postgres } from "./postgres";
import { dialect as redshift } from "./redshift";
import { dialect as sqlite3 } from "./sqlite3";
import { dialect as mysql } from "./mysql";
import { dialect as mssql } from "./mssql";

export const getDatabaseResources = ({ db }: ts.IDatabaseBootstrap) => {
  const migrationTable: string = db.client.config.migrations.tableName || "";

  const loadDialectConfig = (fn) => ({
    ...fn({ migrationTable }),
    dbGeometryColumns: undefined,
  });

  const supportedClients = {
    pg: postgres({ migrationTable }),
    redshift: loadDialectConfig(redshift),
    sqlite3: loadDialectConfig(sqlite3),
    mysql: loadDialectConfig(mysql),
    mysql2: loadDialectConfig(mysql),
    tedious: loadDialectConfig(mssql),
  };

  if (supportedClients.hasOwnProperty(db.client.config.client)) {
    return supportedClients[db.client.config.client];
  }

  throw new Error("unsupported db engine: postgres, mysql & sqlite3 only");
};
