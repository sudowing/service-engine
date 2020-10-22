import { SERVICE_VERSION } from "../const";
import { grpcSchema } from "./proto";
import { grpcMethodFactory } from "./methods";

export const grpcModule = ({
  validators,
  dbResources,
  dbResourceRawRows,
  Resources,
  toProtoScalar,
  hardDelete,
  metadata,
  supportsReturn,
  permissions,
  AppShortName,
  logger,
}: any) => {
  const { protoString } = grpcSchema({
    validators,
    dbResources,
    dbResourceRawRows,
    Resources,
    toProtoScalar,
    metadata,
    supportsReturn,
    permissions,
    AppShortName,
  });

  const grpcMethods = grpcMethodFactory({
    Resources,
    dbResources,
    hardDelete,
    permissions,
  });

  grpcMethods.service_healthz = async ({request: args}, callback) => {
    const { db_info, ...rest } = metadata;
    const response = {
      serviceVersion: SERVICE_VERSION,
      timestamp: Date.now(),
      metadata: rest,
      db_info,
    };

    callback(null, response);
  }

  return {
    protoString,
    grpcMethods,
  };
};
