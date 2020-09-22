import { GraphQLModule } from "@graphql-modules/core";
import gql from "graphql-tag";
import GraphQLJSON from "graphql-type-json";
import { UserInputError } from "apollo-server-koa";

import { v4 as uuidv4 } from "uuid";

import * as fs from "fs";

import {
  HEADER_REQUEST_ID,
  SERVICE_VERSION,
  COMPLEX_RESOLVER_SEPERATOR,
  NON_RETURNING_SUCCESS_RESPONSE,
} from "./const";
import { genCountQuery } from "./database";
import {
  IServiceResolverResponse,
  IClassResourceMap,
  IClassResource,
} from "./interfaces";
import {
  contextTransformer,
  getFirstIfSeperated,
  callComplexResource,
  genResourcesMap,
  transformNameforResolver,
  extractSelectedFields,
  permitted,
} from "./utils";

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
      const geoType = !!report.search[field].geoqueryType;

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

    const spacialType = (st: boolean) => (str: string) =>
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
    ].filter(spacialType(hasGeoQueryType));

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
const ln = `
`;

export const gqlSchema = async ({
  validators,
  dbResources,
  dbResourceRawRows,
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
          ${Array.isArray(definition) ? definition.join(ln) : definition}
      }
    `
  );

  const typeDefsString = `
        type Query {
            service_healthz: serviceAppHealthz
            ${query.join(ln)}
        }
        type Mutation {
            ${mutation.join(ln)}
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


        ${items.join(ln)}

    `;

  let typeDefs = null;
  try {
    typeDefs = gql(typeDefsString);
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

const apiType = "GRAPHQL";
export const makeServiceResolver = (resourcesMap: IClassResourceMap) => (
  resource,
  hardDelete: boolean,
  supportsReturn: boolean
) => (operation: string) => async (obj, args, ctx, info) => {
  const reqId = ctx.reqId || "reqId no issued";
  const defaultInput = { payload: {}, context: {}, options: {}, subquery: {} };

  const input = { ...defaultInput, ...args };
  const { payload, context, options, keys, subquery } = input;

  const parseGraphQLInput = (field, op, value) => {
    if (op === "geo") {
      const [_op, ..._field] = field.split("_");
      const _value =
        _op === "polygon"
          ? [value]
          : _op === "radius"
          ? [value.long, value.lat, value.meters]
          : [value.xMin, value.yMin, value.xMax, value.yMax];
      return [`${_field}.geo_${_op}`, _value];
    } else if (["not_range", "range"].includes(op)) {
      return [`${field}.${op}`, [value.min, value.max]];
    } else if (["not_in", "in"].includes(op)) {
      return [`${field}.${op}`, value];
    }

    return [`${field}.${op}`, value];
  };

  const gqlParsePayload = (i: object) =>
    Object.fromEntries(
      Object.entries(i).flatMap(([op, values]) =>
        Object.entries(values).map(([field, value]) =>
          parseGraphQLInput(field, op, value)
        )
      )
    );

  // tslint:disable-next-line: prefer-const
  let { props, fields } = extractSelectedFields(info);
  const callDatabase = props.includes("data");

  if (!supportsReturn && ["create", "update"].includes(operation)) {
    fields = [];
  }
  context.fields = fields;

  if (context.orderBy) {
    context.orderBy = contextTransformer("orderBy", context.orderBy);
  }
  const query = {
    payload:
      operation === "update"
        ? { ...payload, ...keys }
        : operation === "search"
        ? gqlParsePayload(payload)
        : payload,
    context,
    requestId: reqId,
    apiType,
    hardDelete,
  };

  const subPayload = {
    ...subquery, // subquery has `payload` & `context` keys. needs to be typed
    requestId: reqId,
    apiType,
  };

  const _serviceResponse = resource.hasSubquery
    ? callComplexResource(
        resourcesMap,
        resource.name,
        operation,
        query,
        subPayload
      )
    : resource[operation](query);

  const serviceResponse = await _serviceResponse;

  if (serviceResponse.result) {
    try {
      const sql = serviceResponse.result.sql.toString();
      const _records = callDatabase ? await serviceResponse.result.sql : [];
      const data =
        !supportsReturn && ["create", "update"].includes(operation)
          ? operation === "update"
            ? [NON_RETURNING_SUCCESS_RESPONSE]
            : NON_RETURNING_SUCCESS_RESPONSE
          : resource.transformRecords(_records);

      // TODO: add error logging and `dbCallSuccessful` type flag (like in routers) to prevent count if db call failed

      // update & delete will one day support search query for bulk mutation (already supported in the class I think)
      const singleRecord = ["read", "update"].includes(operation); // used to id if response needs to pluck first item in array

      delete serviceResponse.result.sql;
      const debug = {
        now: Date.now(),
        reqId,
        input: {
          payload,
          context,
          options,
        },
        serviceResponse,
      };

      if (subquery) {
        // @ts-ignore
        debug.input.subPayload = subPayload;
      }

      // send count as additional field
      const response: IServiceResolverResponse = {
        data: singleRecord ? (data.length ? data[0] : null) : data,
        sql,
        debug,
      };

      if (callDatabase && operation === "search" && options.count) {
        // later could apply to update & delete

        const { seperator, notWhere, statementContext } = query.context;
        query.context = { seperator, notWhere, statementContext };

        const _searchCountResult = resource.hasSubquery
          ? callComplexResource(
              resourcesMap,
              resource.name,
              operation,
              query,
              subPayload
            )
          : resource[operation](query);

        const { result: searchCountResult } = await _searchCountResult; // validation is now async!

        const sqlSearchCount = genCountQuery(
          resource.db,
          searchCountResult.sql
        );

        const [{ count }] = await sqlSearchCount; // can/should maybe log this

        response.count = count;
      }

      return response;

      // if single record searched and not returned -- 404
      // if ([null, undefined].includes(output)) {
    } catch (err) {
      // log error && // not a user input error
      throw new UserInputError("cnst.INTERNAL_SERVER_ERROR", {
        detail: serviceResponse,
        reqId,
      });
    }
  } else {
    throw new UserInputError("HTTP_STATUS.BAD_REQUEST", {
      detail: serviceResponse,
      reqId,
    });
  }
};

export const gqlModule = async ({
  validators,
  dbResources,
  dbResourceRawRows,
  Resources,
  toSchemaScalar,
  hardDelete,
  metadata,
  supportsReturn,
  permissions,
}) => {
  // resolvers are built. now just need to add gqlschema for complexResources
  const { typeDefsString, typeDefs } = await gqlSchema({
    validators,
    dbResources,
    dbResourceRawRows,
    Resources,
    toSchemaScalar,
    metadata,
    supportsReturn,
    permissions,
  });

  const serviceResolvers = Resources
    // .filter(
    //   (item: any) => ![...item[1].name].includes(":")
    // ) // temp -- will remove when integrating complex into GraphQL
    .reduce(
      ({ Query, Mutation }, [name, resource]) => {
        const allow = permitted(permissions);
        const permit = {
          create: allow(name, "create"),
          read: allow(name, "read"),
          update: allow(name, "update"),
          delete: allow(name, "delete"),
          any: true,
        };
        permit.any =
          permit.create || permit.read || permit.update || permit.delete;

        const ResourceName = transformNameforResolver(name);
        const resourcesMap = genResourcesMap(Resources);

        const resolver = makeServiceResolver(resourcesMap)(
          resource,
          hardDelete,
          resource.supportsReturn
        );

        const output = {
          Query: {
            ...Query,
            [`Read${ResourceName}`]: resolver("read"),
            [`Search${ResourceName}`]: resolver("search"),
          },
          Mutation: {
            ...Mutation,
            [`Create${ResourceName}`]: resolver("create"),
            [`Update${ResourceName}`]: resolver("update"),
            [`Delete${ResourceName}`]: resolver("delete"),
          },
        };

        const keys = Object.values(
          dbResources[getFirstIfSeperated(name)]
        ).filter((item: any) => item.primarykey);

        // if resource lacks keys -- delete resolvers for unique records
        if (!keys.length) {
          delete output.Query[`Read${ResourceName}`];
          delete output.Mutation[`Update${ResourceName}`];
          delete output.Mutation[`Delete${ResourceName}`];
        } else {
          if (!permit.read) {
            delete output.Query[`Read${ResourceName}`];
          }
          if (!permit.update) {
            delete output.Mutation[`Update${ResourceName}`];
          }
          if (!permit.delete) {
            delete output.Mutation[`Delete${ResourceName}`];
          }
        }
        if (!permit.create) {
          delete output.Query[`Create${ResourceName}`];
        }
        if (!permit.read) {
          delete output.Query[`Search${ResourceName}`];
        }
        return output;
      },
      { Query: {}, Mutation: {} }
    );

  const appResolvers = {
    JSONB: GraphQLJSON,
    Query: {
      service_healthz(obj, args, context, info) {
        const { db_info, ...rest } = metadata;
        return {
          serviceVersion: SERVICE_VERSION,
          timestamp: Date.now(),
          metadata: rest,
          db_info,
        };
      },
    },
  };

  const AppModule = new GraphQLModule({
    typeDefs,
    resolvers: [appResolvers, serviceResolvers],
    context({ ctx }) {
      const reqId = uuidv4();
      ctx.response.set(HEADER_REQUEST_ID, reqId);
      return {
        reqId,
      };
    },
  });

  return {
    AppModule,
    typeDefsString,
  };
};
