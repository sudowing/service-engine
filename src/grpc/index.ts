import { grpcSchema } from "./proto";

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
  });
  return {
    protoString,
  };
};
