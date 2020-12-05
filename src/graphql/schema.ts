import gql from "graphql-tag";

import * as fs from "fs";

import { COMPLEX_RESOLVER_SEPERATOR, NEW_LINE } from "../const";
import { IClassResource } from "../interfaces";
import {
  getFirstIfSeperated,
  transformNameforResolver,
  permitted,
} from "../utils";

export const gqlTypes = ({
  dbResources,
  toSchemaScalar,
  Resources,
  supportsReturn,
  permissions,
}) => {
  const resources = Object.fromEntries(Resources);
  const schema = {
    query: [],
    mutation: [],
  };

  for (const name of Object.keys(dbResources)) {
    const allow = permitted(permissions);
    const permit = {
      create: allow(name, "create"),
      read: allow(name, "read"),
      update: allow(name, "update"),
      delete: allow(name, "delete"),
      any: true,
    };
    permit.any = permit.create || permit.read || permit.update || permit.delete;

    const report = (resources[name] as IClassResource).report;
    const hasGeoQueryType =
      report.search &&
      !!Object.values(report.search).filter(
        ({ geoqueryType }) => !!geoqueryType
      ).length;

    const ResourceName = transformNameforResolver(name);

    schema[`type ${ResourceName}`] = [];
    schema[`input keys${ResourceName}`] = [];
    schema[`input in${ResourceName}`] = [];
    schema[`input in_range${ResourceName}`] = [];

    if (hasGeoQueryType) {
      schema[`input st_${ResourceName}`] = [];
    }

    schema[`input input${ResourceName}`] = [];

    for (const [field, record] of Object.entries(dbResources[name])) {
      const { notnull, type, primarykey }: any = record;
      const schemaScalar = toSchemaScalar(type);
      // the check for the search -> field is needed because of config `redactedFields`
      const geoType = !!(
        report.search[field] && report.search[field].geoqueryType
      );

      schema[`input in${ResourceName}`].push(`${field}: ${schemaScalar}`);
      if (schemaScalar !== "Boolean") {
        schema[`input in_range${ResourceName}`].push(
          `${field}: ${
            schemaScalar === "String" ? "in_range_string" : "in_range_float"
          }`
        );
      }

      if (hasGeoQueryType && geoType) {
        schema[`input st_${ResourceName}`] = [
          ...schema[`input st_${ResourceName}`],
          `radius_${field}: st_radius`,
          `bbox_${field}: st_bbox`,
          `polygon_${field}: String`,
        ];
        // .push(`${field}: st_radius | st_bbox | String`);
        // .push(`${field}: String`);
      }

      schema[`type ${ResourceName}`].push(
        `${field}: ${schemaScalar}${notnull ? "!" : ""}`
      );

      schema[`input input${ResourceName}`].push(`${field}: ${schemaScalar}`);
      if (primarykey) {
        schema[`input keys${ResourceName}`].push(`${field}: ${schemaScalar}`);
      }
    }

    const subResourceName = ResourceName.includes(COMPLEX_RESOLVER_SEPERATOR)
      ? ResourceName.split(COMPLEX_RESOLVER_SEPERATOR)[1]
      : undefined;
    if (subResourceName) {
      schema[`input in_subquery_${subResourceName}`] = [
        `payload: in${subResourceName}`,
        `context: inputContext`,
      ];
    }

    const spatialType = (st: boolean) => (str: string) =>
      st || !str.startsWith("geo");

    const searchInterfaces = [
      `equal: in${ResourceName}`,
      `gt: in${ResourceName}`,
      `gte: in${ResourceName}`,
      `lt: in${ResourceName}`,
      `lte: in${ResourceName}`,
      `not: in${ResourceName}`,
      `like: in${ResourceName}`,
      `null: in${ResourceName}`,
      `not_null: in${ResourceName}`,
      // accept multiple values
      `in: in${ResourceName}`,
      `not_in: in${ResourceName}`,
      // accept DEFINED multiple values {object keys}
      `range: in_range${ResourceName}`,
      `not_range: in_range${ResourceName}`,
      // accept DEFINED multiple values of DEFINED type
      `geo: st_${ResourceName}`,
    ].filter(spatialType(hasGeoQueryType));

    schema[`input search${ResourceName}`] = searchInterfaces;

    const simpleQuery = `
        Search${ResourceName}(
            payload: search${ResourceName}
            context: inputContext
            options: serviceInputOptions
        ): resSearch${ResourceName}
    `;
    const complexQuery = `
        Search${ResourceName}(
            payload: search${ResourceName}
            context: inputContext
            options: serviceInputOptions
            subquery: in_subquery_${subResourceName}
        ): resSearch${ResourceName}
    `;

    if (permit.read) {
      schema.query.push(subResourceName ? complexQuery : simpleQuery);
    }

    if (permit.create) {
      // TODO: can also skip defining the response since it wont be used
      const createResponse = !supportsReturn
        ? `NonReturningSuccessResponse`
        : `resCreate${ResourceName}`;

      schema.mutation.push(`
          Create${ResourceName}(
              payload: [input${ResourceName}!]!
          ): ${createResponse}
      `);

      schema[`type resCreate${ResourceName}`] = `
          sql: String
          debug: JSONB
          data: [${ResourceName}]
      `;
    }

    if (permit.read) {
      schema[`type resRead${ResourceName}`] = `
          sql: String
          debug: JSONB
          data: ${ResourceName}
      `;
    }

    if (permit.update) {
      schema[`type resUpdate${ResourceName}`] = `
          sql: String
          debug: JSONB
          data: ${ResourceName}
      `;
    }

    if (permit.delete) {
      schema[`type resDelete${ResourceName}`] = `
          sql: String
          debug: JSONB
          data: Float
      `;
    }

    if (permit.read) {
      schema[`type resSearch${ResourceName}`] = `
          sql: String
          debug: JSONB
          count: Float
          data: [${ResourceName}]
      `;
    }

    const keys = Object.values(dbResources[name]).filter(
      (item: any) => item.primarykey
    );

    // these types if resource is keyed. else delete related defined types
    if (keys.length) {
      if (permit.read) {
        schema.query.push(`
            Read${ResourceName}(
                payload: keys${ResourceName}!
            ): resRead${ResourceName}
        `);
      }

      if (permit.update) {
        // TODO: can also skip defining the response since it wont be used
        const updateResponse = !supportsReturn
          ? `NonReturningSuccessResponse`
          : `resUpdate${ResourceName}`;

        schema.mutation.push(`
            Update${ResourceName}(
                keys: keys${ResourceName}!,
                payload: in${ResourceName}!
            ): ${updateResponse}
        `);
      }

      if (permit.delete) {
        schema.mutation.push(`
            Delete${ResourceName}(
                payload: keys${ResourceName}!
            ): resDelete${ResourceName}
        `);
      }
    } else {
      delete schema[`input keys${ResourceName}`];
      delete schema[`type resRead${ResourceName}`];
      delete schema[`type resUpdate${ResourceName}`];
      delete schema[`type resDelete${ResourceName}`];
    }
  }
  return schema;
};

export const gqlSchema = async ({
  dbResources,
  Resources,
  toSchemaScalar,
  metadata,
  supportsReturn,
  permissions,
}) => {
  // append the complexQueries to the dbResources -- may need to move upstream. or maybe not as its just for the graphql
  Resources.forEach(([name, Resource]: [string, IClassResource]) => {
    if (Resource.hasSubquery) {
      // append a record to `dbResources`
      dbResources[name] = dbResources[getFirstIfSeperated(name)];
    }
  });

  const { query, mutation, ...other } = gqlTypes({
    dbResources,
    toSchemaScalar,
    Resources,
    supportsReturn,
    permissions,
  });

  const items = Object.entries(other).map(
    ([name, definition]) => `
      ${name} {
          ${Array.isArray(definition) ? definition.join(NEW_LINE) : definition}
      }
    `
  );

  const typeDefsString = `
        type Query {
            service_healthz: serviceAppHealthz
            ${query.join(NEW_LINE)}
        }

        type serviceAppMetadata {
          appShortName: String
          title: String
          description: String
          termsOfService: String
          name: String
          email: String
          url: String
          servers: [String]
          appName: String
          routerPrefix: String
        }

        type serviceAppDataBaseInfo {
          dialect: String
          version: String
        }

        type NonReturningSuccessResponseData {
          success: Boolean
        }

        type serviceAppDataBaseInfo {
          dialect: String
          version: String
        }

        type NonReturningSuccessResponse {
          sql: String
          debug: JSONB
          data: NonReturningSuccessResponseData
        }

        type serviceAppHealthz {
            serviceVersion: String
            timestamp: Float
            metadata: serviceAppMetadata
            db_info: serviceAppDataBaseInfo
        }

        input in_range_string {
          min: String
          max: String
        }

        input in_range_float {
          min: Float
          max: Float
        }

        input st_radius {
          long: Float
          lat: Float
          meters: Float
        }

        input st_bbox {
          xMin: Float
          yMin: Float
          xMax: Float
          yMax: Float
        }

        input inputContext {
          seperator: String
          notWhere: Boolean
          statementContext: String
          orderBy: String
          page: Float
          limit: Float
        }


        input serviceInputOptions {
          count: Boolean
        }
        type serviceResponseBase {
          count: Float
          sql: String
          debug: JSONB
        }

        scalar serviceCoordinates

        type servicePointGeometry {
            type: String!
            coordinates: serviceCoordinates!
        }

        # these are for jsonb cases where you do not care to fully type
        scalar JSONB


        ${items.join(NEW_LINE)}

    `;

    const mutationSchema = `
        type Mutation {
            ${mutation.join(NEW_LINE)}
        }
    `;

  let typeDefs = null;
  try {
    typeDefs = gql(
      mutation.length ?
        [typeDefsString, NEW_LINE, mutationSchema].join(NEW_LINE)
        : typeDefsString
    );
  } catch (err) {
    fs.writeFileSync("schema.error.typeDefsString.txt", typeDefsString);
    fs.writeFileSync("schema.error.json", JSON.stringify({ err }));
    throw err;
  }

  return {
    typeDefsString,
    typeDefs,
  };
};
