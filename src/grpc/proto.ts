import { COMPLEX_RESOLVER_SEPERATOR, NEW_LINE } from "../const";
import { IClassResource } from "../interfaces";
import {
  appendIndex,
  getFirstIfSeperated,
  transformNameforResolver,
  permitted,
  appendSemicolon,
} from "../utils";

export const searchMessage = (ResourceName: string) => [
  `repeated ${ResourceName} data`,
  `optional int32 count`,
];

export const grpcTypes = ({
  dbResources,
  toProtoScalar,
  Resources,
  supportsReturn,
  permissions,
}) => {
  const resources = Object.fromEntries(Resources);
  const messages: any = {};
  const services = [];

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

    messages[`resSearch${ResourceName}`] = searchMessage(ResourceName);
    messages[`resCreate${ResourceName}`] = [searchMessage(ResourceName)[0]]; // omit the count

    messages[`${ResourceName}`] = [];
    messages[`keys${ResourceName}`] = [];
    messages[`in${ResourceName}`] = [];
    messages[`in_arr_${ResourceName}`] = [];
    messages[`in_range${ResourceName}`] = [];

    if (hasGeoQueryType) {
      messages[`st_${ResourceName}`] = [];
    }

    messages[`input${ResourceName}`] = [];

    for (const [field, record] of Object.entries(dbResources[name])) {
      const { notnull, type, primarykey }: any = record;
      const schemaScalar = toProtoScalar(type);

      // the check for the search -> field is needed because of config `redactedFields`
      const geoType = !!(
        report.search[field] && report.search[field].geoqueryType
      );

      messages[`in${ResourceName}`].push(`optional ${schemaScalar} ${field}`);
      messages[`in_arr_${ResourceName}`].push(
        `repeated ${schemaScalar} ${field}`
      );

      if (schemaScalar !== "Boolean") {
        messages[`in_range${ResourceName}`].push(
          `repeated ${schemaScalar === "string" ? "string" : "float"} ${field}`
        );
      }

      if (hasGeoQueryType && geoType) {
        messages[`st_${ResourceName}`] = [
          ...messages[`st_${ResourceName}`],
          `optional st_radius radius_${field}`,
          `optional st_bbox bbox_${field}`,
          `optional string polygon_${field}`,
        ];
      }

      messages[`${ResourceName}`].push(
        `${notnull ? "required" : "optional"} ${schemaScalar} ${field}`
      );

      // json as input should be a sting to get validated and stored correctly
      messages[`input${ResourceName}`].push(
        `optional ${
          schemaScalar === "google.protobuf.Struct" ? "string" : schemaScalar
        } ${field}`
      );
      if (primarykey) {
        messages[`keys${ResourceName}`].push(
          `required ${schemaScalar} ${field}`
        );
      }
    }

    const spatialType = (st: boolean) => (str: string) =>
      st || !str.endsWith("geo");

    const searchInterfaces = [
      `optional in${ResourceName} equal`,
      `optional in${ResourceName} gt`,
      `optional in${ResourceName} gte`,
      `optional in${ResourceName} lt`,
      `optional in${ResourceName} lte`,
      `optional in${ResourceName} not`,
      `optional in${ResourceName} like`,
      `optional in${ResourceName} null`,
      `optional in${ResourceName} not_null`,
      // accept multiple values
      `optional in_arr_${ResourceName} in`,
      `optional in_arr_${ResourceName} not_in`,
      // accept DEFINED multiple values {object keys}
      `optional in_range${ResourceName} range`,
      `optional in_range${ResourceName} not_range`,
      // accept DEFINED multiple values of DEFINED type
      `optional st_${ResourceName} geo`,
    ].filter(spatialType(hasGeoQueryType));

    messages[`search${ResourceName}`] = searchInterfaces;

    if (permit.read) {
      messages[`args_search_${ResourceName}`] = [
        `optional search${ResourceName} payload`,
        `optional inputContext context`,
        `optional serviceInputOptions options`,
      ];

      const subResourceName = ResourceName.includes(COMPLEX_RESOLVER_SEPERATOR)
        ? ResourceName.split(COMPLEX_RESOLVER_SEPERATOR)[1]
        : undefined;

      if (subResourceName) {
        messages[`args_search_${ResourceName}`].push(
          `optional search${subResourceName} subquery`
        );
      }

      services.push(
        `rpc Search${ResourceName}(args_search_${ResourceName}) returns (resSearch${ResourceName})`
      );
    }

    if (permit.create) {
      // TODO: can also skip defining the response since it wont be used
      const createResponse = !supportsReturn
        ? `NonReturningSuccessResponse`
        : `resCreate${ResourceName}`;

      services.push(
        `rpc Create${ResourceName}(args_create_${ResourceName}) returns (${createResponse})`
      );
      messages[`args_create_${ResourceName}`] = [
        `repeated input${ResourceName} payload`,
      ];
    }

    const keys = Object.values(dbResources[name]).filter(
      (item: any) => item.primarykey
    );

    // these types if resource is keyed. else delete related defined types
    if (keys.length) {
      if (permit.read) {
        services.push(
          `rpc Read${ResourceName}(keys${ResourceName}) returns (${ResourceName})`
        );
      }

      if (permit.update) {
        // TODO: can also skip defining the response since it wont be used
        const updateResponse = !supportsReturn
          ? `NonReturningSuccessResponse`
          : `${ResourceName}`;

        messages[`args_update_${ResourceName}`] = [
          `required keys${ResourceName} keys`,
          `required input${ResourceName} payload`,
        ];

        services.push(
          `rpc Update${ResourceName}(args_update_${ResourceName}) returns (${updateResponse})`
        );
      }

      if (permit.delete) {
        services.push(
          `rpc Delete${ResourceName}(keys${ResourceName}) returns (res_float)`
        );
      }
    } else {
      delete messages[`keys${ResourceName}`];
      delete messages[`type resRead${ResourceName}`];
      delete messages[`type resUpdate${ResourceName}`];
    }
  }
  return {
    messages,
    services,
  };
};

export const grpcSchema = ({
  dbResources,
  Resources,
  toProtoScalar,
  metadata,
  supportsReturn,
  permissions,
  AppShortName,
}) => {
  // append the complexQueries to the dbResources -- may need to move upstream. or maybe not as its just for the graphql
  Resources.forEach(([name, Resource]: [string, IClassResource]) => {
    if (Resource.hasSubquery) {
      // append a record to `dbResources`
      dbResources[name] = dbResources[getFirstIfSeperated(name)];
    }
  });

  const { messages, services } = grpcTypes({
    dbResources,
    toProtoScalar,
    Resources,
    supportsReturn,
    permissions,
  });

  const items = Object.entries(messages).map(
    ([name, definition]) => `
      message ${name} {
          ${
            Array.isArray(definition)
              ? definition.map(appendIndex).map(appendSemicolon).join(NEW_LINE)
              : appendSemicolon(definition)
          }
      }
    `
  );

  // count
  messages.serviceInputOptions = [`required bool count`];
  // `optional serviceInputOptions options`,

  messages.servicePointGeometry = [
    `required string type`,
    `required string coordinates`,
  ];

  services.push(`rpc service_healthz(no_args) returns (serviceAppHealthz)`);

  const protoString = `

      syntax = "proto3";

      package service;

      import "google/protobuf/struct.proto";

      service ${AppShortName} {
        ${services.map(appendSemicolon).join(NEW_LINE)}
      }

      message no_args {

      }

      message res_float {
        required float number = 1;
      }


      message serviceAppMetadata {
        string appShortName = 1;
        string title = 2;
        string description = 3;
        string termsOfService = 4;
        string name = 5;
        string email = 6;
        string url = 7;
        repeated string servers = 8;
        string appName = 9;
        string routerPrefix = 10;
      }

      message serviceAppDataBaseInfo {
        string dialect = 1;
        string version = 2;
      }


      message NonReturningSuccessResponse {
        required bool success = 1;
      }

      message serviceAppHealthz {
        required string serviceVersion = 1;
        required float timestamp = 2;
        required serviceAppMetadata metadata = 3;
        required serviceAppDataBaseInfo db_info = 4;
      }





      message in_range_string {
        required string min = 1;
        required string max = 2;
      }

      message in_range_float {
        required float min = 1;
        required float max = 2;
      }

      message st_radius {
        required float long = 1;
        required float lat = 2;
        required float meters = 3;
      }

      message st_bbox {
        required float xMin = 1;
        required float yMin = 2;
        required float xMax = 3;
        required float yMax = 4;
      }

      message inputContext {
        optional string seperator = 1;
        optional bool notWhere = 2;
        optional string statementContext = 3;
        optional string orderBy = 4;
        optional float page = 5;
        optional float limit = 6;
        optional string fields = 7;
        optional bool distinct = 8;
      }


      message serviceInputOptions {
        optional bool count = 1;
      }

      message servicePointGeometry {
        required string type = 1;
        required string coordinates = 2;
      }

      ${items.join(NEW_LINE)}

    `;

  return {
    protoString,
  };
};
