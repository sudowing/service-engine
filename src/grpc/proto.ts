import { COMPLEX_RESOLVER_SEPERATOR, NEW_LINE } from "../const";
import { IClassResource } from "../interfaces";
import {
  appendIndex,
  getFirstIfSeperated,
  transformNameforResolver,
  permitted,
} from "../utils";

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

    messages[`${ResourceName}`] = [];
    messages[`keys${ResourceName}`] = [];
    messages[`in${ResourceName}`] = [];
    messages[`in_range${ResourceName}`] = [];

    if (hasGeoQueryType) {
      messages[`st_${ResourceName}`] = [];
    }

    messages[`input${ResourceName}`] = [];

    for (const [field, record] of Object.entries(dbResources[name])) {
      const { notnull, type, primarykey }: any = record;
      const schemaScalar = toProtoScalar(type);
      const geoType = !!report.search[field].geoqueryType;

      messages[`in${ResourceName}`].push(`optional ${schemaScalar} ${field}`);
      if (schemaScalar !== "Boolean") {
        messages[`in_range${ResourceName}`].push(
          `repeated ${schemaScalar === "string" ? "string" : "double"} ${field}`
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

      messages[`input${ResourceName}`].push(
        `optional ${schemaScalar} ${field}`
      );
      if (primarykey) {
        messages[`keys${ResourceName}`].push(
          `required ${schemaScalar} ${field}`
        );
      }
    }

    const spacialType = (st: boolean) => (str: string) =>
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
      `optional in${ResourceName} in`,
      `optional in${ResourceName} not_in`,
      // accept DEFINED multiple values {object keys}
      `optional in_range${ResourceName} range`,
      `optional in_range${ResourceName} not_range`,
      // accept DEFINED multiple values of DEFINED type
      `optional st_${ResourceName} geo`,
    ].filter(spacialType(hasGeoQueryType));

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
          `optional in_subquery_${subResourceName} subquery`
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
        : `${ResourceName}`;

      services.push(
        `rpc Create${ResourceName}(input${ResourceName}) returns (${createResponse})`
      );
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
          `required search${ResourceName} keys`,
          `required in${ResourceName} payload`,
        ];

        services.push(
          `rpc Update${ResourceName}(args_update_${ResourceName}) returns (${updateResponse})`
        );
      }

      if (permit.delete) {
        services.push(
          `rpc Delete${ResourceName}(keys${ResourceName}) returns (double)`
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
  validators,
  dbResources,
  dbResourceRawRows,
  Resources,
  toProtoScalar,
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
              ? definition.map(appendIndex).join(NEW_LINE)
              : definition
          }
      }
    `
  );

  messages.serviceAppMetadata = [
    `required string appShortName`,
    `required string title`,
    `required string description`,
    `required string termsOfService`,
    `required string name`,
    `required string email`,
    `required string url`,
    `repeating string servers`,
    `required string appName`,
    `required string routerPrefix`,
  ];

  messages.serviceAppDataBaseInfo = [
    `required string dialect`,
    `required string version`,
  ];

  messages.NonReturningSuccessResponse = [`required bool success`];

  messages.serviceAppDataBaseInfo = [
    `required string dialect`,
    `required string version`,
  ];

  messages.serviceAppHealthz = [
    `required string serviceVersion`,
    `required double timestamp`,
    `required serviceAppMetadata metadata`,
    `required serviceAppDataBaseInfo db_info`,
  ];

  messages.in_range_string = [`required string min`, `required string max`];

  messages.in_range_double = [`required double min`, `required double max`];

  messages.st_radius = [
    `required double long`,
    `required double lat`,
    `required double meters`,
  ];

  messages.st_bbox = [
    `required double xMin`,
    `required double yMin`,
    `required double xMax`,
    `required double yMax`,
  ];

  messages.inputContext = [
    `required string seperator`,
    `required bool notWhere`,
    `required string statementContext`,
    `required string orderBy`,
    `required double page`,
    `required double limit`,
  ];

  // count
  messages.serviceInputOptions = [`required bool count`];
  // `optional serviceInputOptions options`,

  messages.servicePointGeometry = [
    `required string type`,
    `required string coordinates`,
  ];

  services.push(`rpc service_healthz() returns (serviceAppHealthz)`);

  const protoString = `

        ${services.join(NEW_LINE)}
        ${items.join(NEW_LINE)}

    `;

  return {
    protoString,
  };
};
