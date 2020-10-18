import { grpcSchema } from "./proto";
import { grpcMethodGenerator } from "./methods";

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

  const grpcMethods = grpcMethodGenerator({logger});


  return {
    protoString,
    grpcMethods
  };
};
