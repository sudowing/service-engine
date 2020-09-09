import { GraphQLModule } from "@graphql-modules/core";
import gql from "graphql-tag";
import GraphQLJSON from "graphql-type-json";
import { UserInputError } from "apollo-server-koa";

import { v4 as uuidv4 } from "uuid";

import {
  HEADER_REQUEST_ID,
  SERVICE_VERSION,
  COMPLEX_RESOLVER_SEPERATOR,
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
} from "./utils";

export const gqlTypes = ({ dbResources, toSchemaScalar }) => {
  const schema = {
    query: [],
    mutation: [],
  };

  for (const name of Object.keys(dbResources)) {
    const ResourceName = transformNameforResolver(name);

    schema[`type ${ResourceName}`] = [];
    schema[`input keys${ResourceName}`] = [];
    schema[`input in${ResourceName}`] = [];
    schema[`input input${ResourceName}`] = [];

    for (const [field, record] of Object.entries(dbResources[name])) {
      const { notnull, type, primarykey }: any = record;
      const schemaScalar = toSchemaScalar(type);

      schema[`input in${ResourceName}`].push(`${field}: ${schemaScalar}`);

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

    const simpleQuery = `
        Search${ResourceName}(
            payload: in${ResourceName}
            context: inputContext
            options: serviceInputOptions
        ): resSearch${ResourceName}
    `;
    const complexQuery = `
        Search${ResourceName}(
            payload: in${ResourceName}
            context: inputContext
            options: serviceInputOptions
            subquery: in_subquery_${subResourceName}
        ): resSearch${ResourceName}
    `;

    schema.query.push(subResourceName ? complexQuery : simpleQuery);
    schema.mutation.push(`
        Create${ResourceName}(
            payload: [input${ResourceName}!]!
        ): resCreate${ResourceName}
    `);

    schema[`type resCreate${ResourceName}`] = `
          sql: String
          debug: JSONB
          data: [${ResourceName}]
      `;

    schema[`type resRead${ResourceName}`] = `
          sql: String
          debug: JSONB
          data: ${ResourceName}
      `;

    schema[`type resUpdate${ResourceName}`] = `
          sql: String
          debug: JSONB
          data: ${ResourceName}
      `;

    schema[`type resDelete${ResourceName}`] = `
          sql: String
          debug: JSONB
          data: Float
      `;

    schema[`type resSearch${ResourceName}`] = `
          sql: String
          debug: JSONB
          count: Float
          data: [${ResourceName}]
      `;

    const keys = Object.values(dbResources[name]).filter(
      (item: any) => item.primarykey
    );

    // these types if resource is keyed. else delete related defined types
    if (keys.length) {
      schema.query.push(`
          Read${ResourceName}(
              payload: keys${ResourceName}!
          ): resRead${ResourceName}
      `);
      schema.mutation.push(`
          Update${ResourceName}(
              keys: keys${ResourceName}!,
              payload: in${ResourceName}!
          ): resUpdate${ResourceName}
          Delete${ResourceName}(
              payload: keys${ResourceName}!
          ): resDelete${ResourceName}
      `);
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

        type serviceAppHealthz {
            serviceVersion: String
            timestamp: Float
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
  hardDelete
) => (operation: string) => async (obj, args, ctx, info) => {
  const reqId = ctx.reqId || "reqId no issued";
  const defaultInput = { payload: {}, context: {}, options: {}, subquery: {} };

  const input = { ...defaultInput, ...args };
  const { payload, context, options, keys, subquery } = input;

  context.fields = extractSelectedFields(info);
  if (context.orderBy) {
    context.orderBy = contextTransformer("orderBy", context.orderBy);
  }

  const query = {
    payload: operation !== "update" ? payload : { ...payload, ...keys },
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

  const serviceResponse = await _serviceResponse; // validation is now async!

  if (serviceResponse.result) {
    try {
      const sql = serviceResponse.result.sql.toString();
      const _records = await serviceResponse.result.sql;
      const data = resource.transformRecords(_records);

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

      if (operation === "search" && options.count) {
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
}) => {
  // resolvers are built. now just need to add gqlschema for complexResources
  const { typeDefsString, typeDefs } = await gqlSchema({
    validators,
    dbResources,
    dbResourceRawRows,
    Resources,
    toSchemaScalar,
  });

  const serviceResolvers = Resources
    // .filter(
    //   (item: any) => ![...item[1].name].includes(":")
    // ) // temp -- will remove when integrating complex into GraphQL
    .reduce(
      ({ Query, Mutation }, [name, resource]) => {
        const ResourceName = transformNameforResolver(name);
        const resourcesMap = genResourcesMap(Resources);

        const resolver = makeServiceResolver(resourcesMap)(
          resource,
          hardDelete
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
        }

        return output;
      },
      { Query: {}, Mutation: {} }
    );

  const appResolvers = {
    JSONB: GraphQLJSON,
    Query: {
      service_healthz(obj, args, context, info) {
        return {
          serviceVersion: SERVICE_VERSION,
          timestamp: Date.now(),
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
