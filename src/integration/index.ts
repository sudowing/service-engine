import * as ts from ".././interfaces";

import { postgres } from "./postgres";

export const getDatabaseResources = ({ db }: ts.IDatabaseBootstrap) => {
  const migrationTable: string = db.client.config.migrations.tableName || "";

  if (db.client.config.client === "pg") {
    return postgres({ migrationTable });
  }

  throw new Error("unsupported db engine: postgres only");
};
