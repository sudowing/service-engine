import * as Joi from "@hapi/joi";
import * as cnst from ".././const";

// defintions based on sqlite 3 datatypes
// https://www.sqlite.org/datatype3.html

export const joiBase = (type: string) => {
  switch (type) {
    case "int":
    case "integer":
    case "tinyint":
    case "smallint":
    case "mediumint":
    case "bigint":
    case "unsigned big int":
    case "int2":
    case "int8":
      return Joi.number().integer();
    // character(n) -- ignore. use default
    // varchar(n) -- ignore. use default
    // varying character(n) -- ignore. use default
    // nchar(n) -- ignore. use default
    // native character(n) -- ignore. use default
    // nvarchar(n) -- ignore. use default
    case "text":
    case "clob":
      return Joi.string();
    case "blob":
    case "":
      return Joi.string();
    case "real":
    case "double":
    case "double precision":
    case "float":
      return Joi.number();
    case "numeric":
    // decimal(n1, n2) -- check for starts with
    case "boolean":
    case "date":
    case "datetime":
      return Joi.number();
    default:
      const match = type.match(cnst.REGEX_CHAR);
      if (match) {
        return Joi.string().max(Number(match.groups.len));
      }
      if (type.startsWith("decimal")) {
        return Joi.number();
      }

      return Joi.string();
  }
};

export const toSchemaScalar = (type: string) => {
  switch (type) {
    case "int":
    case "integer":
    case "tinyint":
    case "smallint":
    case "mediumint":
    case "bigint":
    case "unsigned big int":
    case "int2":
    case "int8":
      return "Float";
    // character(n) -- ignore. use default
    // varchar(n) -- ignore. use default
    // varying character(n) -- ignore. use default
    // nchar(n) -- ignore. use default
    // native character(n) -- ignore. use default
    // nvarchar(n) -- ignore. use default
    case "text":
    case "clob":
      return "String";
    case "blob":
    case "":
      return "String";
    case "real":
    case "double":
    case "double precision":
    case "float":
      return "Float";
    case "numeric":
    // decimal(n1, n2) -- check for starts with
    case "boolean":
    case "date":
    case "datetime":
      return "Float";
    default:
      // this doesn't matter here as the schema cannot enforce
      // const match = type.match(cnst.REGEX_CHAR);
      // if (match) {
      //   return Joi.string().length(Number(match.groups.len));
      // }
      if (type.startsWith("decimal")) {
        return "Float";
      }

      return "String";
  }
};

export const dialect = ({ migrationTable }) => {
  const dbSurveyQuery = `
    SELECT
        '' resource_schema,
        m.type resource_type,
        m.name resource_name,
        p.cid resource_column_id,
        p.name resource_column_name,
        p."notnull" "notnull",
        lower(p.type) type,
        p.pk primarykey,
        CASE unique_idx.origin
            WHEN 'u'
                THEN 1
            ELSE 0
        END uniquekey
      FROM
        sqlite_master AS m
      JOIN
        pragma_table_info(m.name) AS p
      left join (
      SELECT
        m.name resource_name,
        ii.name resource_column_name,
        il."unique" uniquekey,
        il.origin
      FROM
        sqlite_master AS m,
        pragma_index_list(m.name) AS il,
        pragma_index_info(il.name) AS ii
      WHERE
        m.type = 'table'
        and il.origin = 'u'
        and il."unique" = 1
    ) unique_idx
      on
          m.name = unique_idx.resource_name
          and
          p.name =unique_idx.resource_column_name
      where
        m.type in ('table', 'view')
        and m.name not in ('${migrationTable}', '${migrationTable}_lock')
      ORDER BY
        m.name,
        p.name;
    `;

  const versionQuery = `select sqlite_version() as db_version;`;

  return { dbSurveyQuery, versionQuery, joiBase, toSchemaScalar, toProtoScalar };
};
