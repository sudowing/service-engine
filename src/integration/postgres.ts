import * as Joi from "@hapi/joi";
import * as cnst from ".././const";

// defintions based on psql 12 datatypes
// https://www.postgresql.org/docs/12/datatype.html

export const joiBase = (type: string) => {
  switch (type) {
    // 8.1. Numeric Types":
    case "smallint":
    case "integer":
    case "bigint":
      return Joi.number().integer();
    case "decimal":
    case "numeric":
    case "real":
    case "double precision":
      return Joi.string(); // string because of arbitrary presision that cannot be jsonified -- have special values (Infinity, -Infinity, NaN)
    case "smallserial":
    case "serial":
    case "bigserial":
      return Joi.number().integer();
    case "int2":
    case "int4":
    case "int8":
      return Joi.number().integer();
    // 8.2. Monetary Types":
    case "money || bigint in js":
      return Joi.string(); // string as it is arbitrary length
    // 8.3. Character Types":
    // case "character varying(n)": // ignore. default will be string
    // case "varchar(n)": // ignore. default will be string
    // case "character(n)": // ignore. default will be string
    // case "char(n)": // ignore. default will be string
    case "character varying":
    case "text":
    case '"char"':
    case "name":
      return Joi.string();
    // 8.4. Binary Data Types":
    case "bytea":
      return Joi.string();
    // 8.5. Date/Time Types":
    // case "timestamp": tz optional // ignore. default will be string
    // case "timestamp": wtz // ignore. default will be string
    case "timestamp without time zone":
    case "date":
    // case "time": tz optional // ignore. default will be string
    // case "time": wtz // ignore. default will be string
    case "interval":
      return Joi.string();
    // 8.6. Boolean Type":
    case "boolean":
      return Joi.boolean();
    // 8.7. Enumerated Types":
    // ignore. default will be string
    // 8.8. Geometric Types":
    case "point":
    case "geometry(Point)":
      return Joi.string().invalid(...cnst.SYMBOLS_GEO_POINT); // will want geoJson on output
    case "line":
    case "geometry(Line)":
    case "geometry(MultiLineString)":
          return Joi.string().invalid(...cnst.SYMBOLS_GEO_LINE); // will want geoJson on output
    case "lseg":
    case "geometry(Lseg)":
      return Joi.string().invalid(...cnst.SYMBOLS_GEO_LSEG); // will want geoJson on output
    case "box":
    case "geometry(Box)":
      return Joi.string().invalid(...cnst.SYMBOLS_GEO_BOX); // will want geoJson on output
    case "path":
    case "geometry(Path)":
      return Joi.string().invalid(...cnst.SYMBOLS_GEO_PATH); // will want geoJson on output
    case "polygon":
    case "geometry":
    case "geometry(Polygon)":
    case "geometry(MultiPolygon)":
          return Joi.string().invalid(...cnst.SYMBOLS_GEO_POLYGON); // will want geoJson on output
    case "circle":
    case "geometry(Circle)":
      return Joi.string().invalid(...cnst.SYMBOLS_GEO_CIRCLE); // will want geoJson on output
    // 8.9. Network Address Types":
    case "cidr":
    case "inet":
    case "macaddr":
      return Joi.string();
    // 8.10. Bit String Types":
    // case "bit(n)": // ignore. default will be string
    // case "bit varying(n)": // ignore. default will be string
    // 8.11. Text Search Types":
    // 8.11.1. tsvector":
    // 8.11.2. tsquery":
    // 8.12. UUID Type":
    case "uuid":
      return Joi.string();
    // 8.13. XML Type":
    case "xml":
      return Joi.string();
    // 8.14. JSON Types":
    case "json":
    case "jsonb":
    case "jsonpath":
      return Joi.string(); // will want to use JSONB on output

    // 8.15. Arrays":
    // ignore. default will be string
    // in the future -- breaking change will type

    // 8.16. Composite Types":
    // ignore. default will be string

    // 8.17. Range Types":
    case "int4range":
    case "int8range":
      return Joi.number().integer();
    case "numrange":
    case "* float":
      return Joi.number();
    case "tsrange":
    case "tstzrange":
    case "daterange":
      return Joi.string();
    // 8.18. Domain Types": // ignore. let default catch it
    // 8.19. Object Identifier Types":
    case "oid":
      return Joi.number().integer();
    case "regproc":
    case "regprocedure":
    case "regoper":
    case "regoperator":
    case "regclass":
    case "regtype":
    case "regrole":
    case "regnamespace":
    case "regconfig":
    case "regdictionary":
      return Joi.string();
    // 8.20. pg_lsn Type":
    case "pg_lsn":
      return Joi.string();
    default:
      const match = type.match(cnst.REGEX_CHAR);
      if (match) {
        return Joi.string().max(Number(match.groups.len));
      }

      return Joi.string(); // string to support custom data types in the db & ignored char/text fields
  }
};

export const toSchemaScalar = (type: string) => {
  switch (type) {
    // 8.1. Numeric Types":
    case "smallint":
    case "integer":
    case "bigint":
      return "Float";
    case "decimal":
    case "numeric":
    case "real":
    case "double precision":
      return "String"; // String because of arbitrary precision that cannot be jsonifieds
    case "smallserial":
    case "serial":
    case "bigserial":
      return "Float";
    case "int2":
    case "int4":
    case "int8":
      return "Float";
    // 8.2. Monetary Types":
    case "money || bigint in js":
      return "String"; // string as it is arbitrary length
    // 8.3. Character Types":
    // case "character varying(n)": // ignore. default will be string
    // case "varchar(n)": // ignore. default will be string
    // case "character(n)": // ignore. default will be string
    // case "char(n)": // ignore. default will be string
    case "character varying":
    case "text":
    case '"char"':
    case "name":
      return "String";
    // 8.4. Binary Data Types":
    case "bytea":
      return "String";
    // 8.5. Date/Time Types":
    // case "timestamp": tz optional // ignore. default will be string
    // case "timestamp": wtz // ignore. default will be string
    case "timestamp without time zone":
    case "date":
    // case "time": tz optional // ignore. default will be string
    // case "time": wtz // ignore. default will be string
    case "interval":
      return "String";
    // 8.6. Boolean Type":
    case "boolean":
      return "Boolean";
    // 8.7. Enumerated Types":
    // ignore. default will be string
    // 8.8. Geometric Types":
    case "point":
    case "line":
    case "lseg":
    case "box":
    case "path":
    case "path":
    case "polygon":
    case "circle":
      return "String"; // will want geoJson on output
    // 8.9. Network Address Types":
    case "cidr":
    case "inet":
    case "macaddr":
      return "String";
    // 8.10. Bit String Types":
    // case "bit(n)": // ignore. default will be string
    // case "bit varying(n)": // ignore. default will be string
    //    return 'String';

    // 8.11. Text Search Types":
    // 8.11.1. tsvector":
    // 8.11.2. tsquery":

    // 8.12. UUID Type":
    case "uuid":
    case "string":
      return "String";
    // 8.13. XML Type":
    case "xml":
      return "String";
    // 8.14. JSON Types":
    case "json":
    case "jsonb":
    case "jsonpath":
      return "String"; // will want to use JSONB on output

    // 8.15. Arrays":
    // ignore. default will be string
    // in the future -- breaking change will type

    // 8.16. Composite Types":
    // ignore. default will be string

    // 8.17. Range Types":
    case "int4range":
    case "int8range":
      return "Float";
    case "numrange":
    case "* float":
      return "Float";
    case "tsrange":
    case "tstzrange":
    case "daterange":
      return "String";
    // 8.18. Domain Types": // ignore. let default catch it
    // 8.19. Object Identifier Types":
    case "oid":
      return "Float";
    case "regproc":
    case "regprocedure":
    case "regoper":
    case "regoperator":
    case "regclass":
    case "regtype":
    case "regrole":
    case "regnamespace":
    case "regconfig":
    case "regdictionary":
      return "String";
    // 8.20. pg_lsn Type":
    case "pg_lsn":
      return "String";
    default:
      return "String";
  }
};

export const postgres = ({ migrationTable }) => {
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
              c.relkind in ('r', 'v', 'm') -- tables, views, materialized views
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

  return { dbSurveyQuery, joiBase, toSchemaScalar };
};
