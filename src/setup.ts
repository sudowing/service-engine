import { writeFileSync } from "fs";

import * as protoLoader from "@grpc/proto-loader";
import { pascalCase } from "change-case";
import * as grpc from "@grpc/grpc-js";

import { Resource } from "./class";
import {
  STARTUP_FAILED,
  BAD_CONFIG_COMPLEX_RESOURCE,
  BAD_GRPC_BIND,
  UNSUPPORTED_CHARACTER_IN_DB,
} from "./const";
import { aggregationFnBuilder } from "./database";
import { getDatabaseResources } from "./dialects";
import { TDatabaseResources } from "./interfaces";

import { gqlModule } from "./graphql";
import { grpcModule } from "./grpc";
import { serviceRouters } from "./rest";

import { genDatabaseResourceValidators } from "./utils";

const PROTO_PATH = __dirname + "/service.proto";

export const prepare = async ({
  db,
  st,
  metadata,
  logger,
  middleware,
  supportsReturn,
  complexResources,
  hardDelete,
  permissions,
  pageLimit,
  grpcPort,
  redactedFields,
}) => {
  // these are specific to the db engine version
  const {
    dbSurveyQuery,
    versionQuery,
    joiBase,
    toSchemaScalar,
    toProtoScalar,
    dbGeometryColumns,
  } = getDatabaseResources({
    db,
  });

  const getRows = (item) => (item.hasOwnProperty("rows") ? item.rows : item);

  const [dbResourceRawRows, dbVersionRawRows] = await Promise.all([
    db.raw(dbSurveyQuery),
    db.raw(versionQuery),
  ]).then((payload: any) => payload.map(getRows));

  metadata.db_info = {
    dialect: db.client.config.client,
    version: dbVersionRawRows[0].db_version,
    pageLimit,
  };

  const fields = ["resource_schema", "resource_name", "resource_column_name"];

  const REGEX_LEGAL_SDL = /[0-9a-zA-Z_]+/g;
  const flagNonSupportedSchemaChars = (record) =>
    Object.entries(record).filter(([key, value]) => {
      return (
        fields.includes(key) &&
        value.toString().length &&
        value.toString().match(REGEX_LEGAL_SDL).length > 1
      );
    }).length > 0;

  const problemResources = dbResourceRawRows.filter(
    flagNonSupportedSchemaChars
  );
  if (!!problemResources.length) {
    logger.fatal(
      {
        summary: "unsupported character breaking GraphqL Schema",
        detail: UNSUPPORTED_CHARACTER_IN_DB,
        problemResources,
        fieldsOfConcern: fields,
      },
      STARTUP_FAILED
    );
    process.exit(1);
  }

  const { validators, dbResources } = await genDatabaseResourceValidators({
    db,
    dbResourceRawRows,
    joiBase,
  });

  // once validators have been created -- remove any redacted fields.
  // prevents publication to GraphQL, gRPC & REST responses.
  Object.entries(redactedFields).forEach(
    ([resourceName, columns]: [string, string[]]) => {
      columns.forEach((column) => {
        if (dbResources[resourceName] && dbResources[resourceName][column]) {
          delete dbResources[resourceName][column];
        }
      });
    }
  );

  const mapSchemaResources = dbResourceRawRows.reduce(
    (resourceMap, { resource_schema, resource_name }) => ({
      ...resourceMap,
      [`${resource_schema}_${resource_name}`]: {
        resource_schema,
        resource_name,
      },
    }),
    {}
  );

  let geoFields = {};
  if (dbGeometryColumns && mapSchemaResources.public_geometry_columns) {
    const _results = await db.raw(dbGeometryColumns);
    const geoRows = _results.hasOwnProperty("rows") ? _results.rows : _results;

    const fn = (accum, { type, srid, ...curr }) => {
      const resourceName = `${curr.resource_schema}_${curr.resource_name}`;
      if (!accum[resourceName]) {
        accum[resourceName] = {};
      }
      accum[resourceName][curr.resource_column_name] = {
        type,
        srid,
      };
      return accum;
    };

    geoFields = geoRows.reduce(fn, {});
  }

  // this has other uses -- needs to be isolated
  const Resources = Object.entries(validators).map(
    ([name, validator]: TDatabaseResources) => [
      name,
      new Resource({
        db,
        st,
        logger,
        name,
        validator,
        schemaResource: mapSchemaResources[name],
        middlewareFn:
          middleware && middleware[name] ? middleware[name] : undefined,
        geoFields: geoFields[name] || undefined,
        supportsReturn,
        pageLimit,
        redactedFields: redactedFields[name] || [],
      }),
    ]
  );

  // build the complex resources based on the provided configs
  (complexResources || []).forEach(
    ({ topResourceName, subResourceName, calculatedFields, groupBy }) => {
      // confirm they exist else
      if (!dbResources[topResourceName] || !dbResources[subResourceName]) {
        logger.fatal(
          {
            summary: "bad configuration",
            detail: BAD_CONFIG_COMPLEX_RESOURCE,
            complex_query: { topResourceName, subResourceName },
          },
          STARTUP_FAILED
        );
        process.exit(1);
      }

      const name = `${topResourceName}:${subResourceName}`;
      Resources.push([
        name,
        new Resource({
          db,
          st,
          logger,
          name,
          validator: validators[topResourceName],
          schemaResource: mapSchemaResources[topResourceName],
          middlewareFn:
            middleware && middleware[name] ? middleware[name] : undefined,
          subResourceName,
          aggregationFn: aggregationFnBuilder(db)(calculatedFields, groupBy),
          geoFields: geoFields[name] || undefined,
          supportsReturn,
          pageLimit,
          redactedFields: redactedFields[name] || [],
        }),
      ]);
    }
  );

  const { AppModule } = await gqlModule({
    dbResources,
    Resources,
    toSchemaScalar,
    hardDelete,
    metadata,
    supportsReturn,
    permissions,
  });

  const AppShortName = pascalCase(metadata.appShortName);

  const { protoString, grpcMethods } = await grpcModule({
    dbResources,
    Resources,
    toProtoScalar,
    hardDelete,
    metadata,
    supportsReturn,
    permissions,
    AppShortName,
    logger,
  });

  const { appRouter, serviceRouter } = await serviceRouters({
    db,
    st,
    logger,
    metadata,
    validators,
    dbResources,
    dbResourceRawRows,
    Resources,
    toSchemaScalar,
    protoString,
    hardDelete,
    supportsReturn,
    permissions,
  });

  // setup grpc service

  // write schema to proto file with specific path
  writeFileSync(PROTO_PATH, protoString);
  const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    bytes: Array,
  });
  const protoService = grpc.loadPackageDefinition(packageDefinition).service;
  const grpcService = new grpc.Server();
  grpcService.addService(protoService[AppShortName].service, grpcMethods);
  grpcService.bindAsync(
    `0.0.0.0:${grpcPort}`,
    grpc.ServerCredentials.createInsecure(),
    (err, port) => {
      if (err) {
        logger.fatal(
          {
            summary: "gRPC service not bound to port",
            detail: BAD_GRPC_BIND,
            error: err,
            port,
          },
          STARTUP_FAILED
        );
        process.exit(1);
      }

      grpcService.start();
    }
  );

  return { appRouter, serviceRouter, AppModule, AppShortName, grpcService };
};
