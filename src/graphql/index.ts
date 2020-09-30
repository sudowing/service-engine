import { GraphQLModule } from "@graphql-modules/core";
import GraphQLJSON from "graphql-type-json";

import { SERVICE_VERSION } from "../const";
import {
  getFirstIfSeperated,
  genResourcesMap,
  transformNameforResolver,
  permitted,
} from "../utils";

import { makeServiceResolver } from "./resolvers";
import { gqlSchema } from "./schema";

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
      const reqId = ctx.response.header["x-request-id"] || "uuidv4()";
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
