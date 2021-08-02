import * as Joi from "joi";

// definitions based on AWS Docs
// https://docs.aws.amazon.com/redshift/latest/dg/c_Supported_data_types.html

export const joiBase = (type: string) => {
  switch (type) {
    case "smallint":
    case "int2":
    case "integer":
    case "int":
    case "int4":
      return Joi.number().integer();
    case "bigint":
    case "int8":
    case "decimal":
    case "numeric":
      return Joi.string();
    case "real":
      return Joi.number();
    case "float4":
    case "double precision":
    case "float8":
    case "float":
      return Joi.string();
    case "boolean":
    case "bool":
      return Joi.boolean();
    case "char":
    case "character":
    case "nchar":
    case "bpchar":
    case "varchar":
    case "character varying":
    case "nvarchar":
    case "text":
    case "date":
    case "timestamp":
    case "timestamp without time zone":
      return Joi.string();
    default:
      return Joi.string();
  }
};

export const toSchemaScalar = (type: string) => {
  switch (type) {
    case "smallint":
    case "int2":
    case "integer":
    case "int":
    case "int4":
      return "Float";
    case "bigint":
    case "int8":
    case "decimal":
    case "numeric":
      return "String";
    case "real":
      return "Float";
    case "float4":
    case "double precision":
    case "float8":
    case "float":
      return "String";
    case "boolean":
    case "bool":
      return "Boolean";
    case "char":
    case "character":
    case "nchar":
    case "bpchar":
    case "varchar":
    case "character varying":
    case "nvarchar":
    case "text":
    case "date":
    case "timestamp":
    case "timestamp without time zone":
      return "String";
    default:
      return "String";
  }
};

export const toProtoScalar = (type: string) => {
  switch (type) {
    case "smallint":
    case "int2":
    case "integer":
    case "int":
    case "int4":
      return "uint32";
    case "bigint":
    case "int8":
    case "decimal":
    case "numeric":
      return "string";
    case "real":
      return "string";
    case "float4":
    case "double precision":
    case "float8":
    case "float":
      return "string";
    case "boolean":
    case "bool":
      return "bool";
    case "char":
    case "character":
    case "nchar":
    case "bpchar":
    case "varchar":
    case "character varying":
    case "nvarchar":
    case "text":
    case "date":
    case "timestamp":
    case "timestamp without time zone":
      return "string";
    default:
      return "string";
  }
};

export const dialect = ({ migrationTable }) => {
  const dbSurveyQuery = `
        select distinct
        resource_schema,
        resource_type,
        resource_name,
        resource_column_id,
        resource_column_name,
        "notnull",
        "type",
        case
            when primarykey >0 then true
            else false
        end as primarykey,
        case
            when uniquekey >0 then true
            else false
        end as uniquekey
        from
        (
        select
            "oid",
            resource_schema,
            resource_type,
            resource_name,
            resource_column_id,
            resource_column_name,
            "notnull",
            "type",
            max(primarykey) primarykey,
            max(uniquekey) uniquekey
        from
            (
            select
                c.oid oid,
                s.nspname resource_schema,
                case
                when c.relkind = 'r' then 'table'
                when c.relkind = 'p' then 'partition'
                when c.relkind = 'v' then 'view'
                when c.relkind = 'm' then 'materialized view'
                else 'unknown'
                end as resource_type,
                c.relname as resource_name,
                a.attnum as resource_column_id,
                a.attname as resource_column_name,
                a.attnotnull as notnull,
                pg_catalog.format_type(a.atttypid, a.atttypmod) as type,
                case
                when p.contype = 'p' then 1
                else 0
                end as primarykey,
                case
                when p.contype = 'u' then 1
                else 0
                end as uniquekey
            from
                pg_attribute a
            join pg_class c on
                c.oid = a.attrelid
            join pg_namespace s on
                c.relnamespace = s.oid
            left join pg_attrdef d on
                d.adrelid = c.oid
                and d.adnum = a.attnum
            left join pg_namespace n on
                n.oid = c.relnamespace
            left join pg_constraint p on
                p.conrelid = c.oid
                and a.attnum = any (p.conkey)
            where
                c.relkind in ('r', 'p', 'v', 'm') -- tables, views, materialized views
                and a.attnum > 0
                and not a.attisdropped
                and s.nspname not in ('information_schema', 'pg_catalog')
                and c.relname not in ('knex_migrations', 'knex_migrations_lock')
                and c.relname not in ('${migrationTable}', '${migrationTable}_lock')
            ) main
        group by
            "oid",
            resource_schema,
            resource_type,
            resource_name,
            resource_column_id,
            resource_column_name,
            "notnull",
            "type"
            ) base
        order by
        resource_schema,
        resource_name,
        resource_column_name;
  `;

  const versionQuery = `select version() as db_version;`;

  return {
    dbSurveyQuery,
    versionQuery,
    joiBase,
    toSchemaScalar,
    toProtoScalar,
  };
};
