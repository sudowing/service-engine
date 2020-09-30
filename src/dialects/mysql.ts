import * as Joi from "@hapi/joi";
import * as cnst from ".././const";

// defintions based on mysql 8 datatypes
// https://dev.mysql.com/doc/refman/8.0/en/data-types.html

export const joiBase = (type: string) => {
  switch (type) {
    // 11.1 Numeric Data Types
    case cnst.BIT:
    case cnst.TINYINT:
    case cnst.SMALLINT:
    case cnst.MEDIUMINT:
    case cnst.INT:
    case cnst.INTEGER:
      return Joi.number().integer();
    // BIGINT
    // DECIMAL
    // DEC
    // NUMERIC
    // FIXED
    // FLOAT
    // DOUBLE
    // DOUBLE PRECISION
    // REAL

    // 11.2 Date and Time Data Types
    // DATE
    // TIME
    // DATETIME
    // TIMESTAMP
    case cnst.YEAR:
      return Joi.number().integer();

    // 11.3 String Data Types
    // CHAR
    // NATIONAL CHAR
    // NCHAR
    // VARCHAR
    // NATIONAL VARCHAR
    // NVARCHAR
    // BINARY
    // VARBINARY
    // TINYBLOB
    // TINYTEXT
    // BLOB
    // TEXT
    // MEDIUMBLOB
    // MEDIUMTEXT
    // LONGBLOB
    // LONGTEXT
    // ENUM
    // SET

    // 11.4 Spatial Data Types
    case cnst.GEOMETRY:
      return Joi.string().invalid(...cnst.SYMBOLS_GEO_POLYGON); // will want geoJson on output
    case cnst.POINT:
      return Joi.string().invalid(...cnst.SYMBOLS_GEO_POINT); // will want geoJson on output
    case cnst.LINESTRING:
      return Joi.string().invalid(...cnst.SYMBOLS_GEO_LINE); // will want geoJson on output
    case cnst.POLYGON:
      return Joi.string().invalid(...cnst.SYMBOLS_GEO_POLYGON); // will want geoJson on output
    case cnst.MULTIPOINT:
      return Joi.string().invalid(...cnst.SYMBOLS_GEO_POINT); // will want geoJson on output
    case cnst.MULTILINESTRING:
      return Joi.string().invalid(...cnst.SYMBOLS_GEO_LINE); // will want geoJson on output
    case cnst.MULTIPOLYGON:
      return Joi.string().invalid(...cnst.SYMBOLS_GEO_POLYGON); // will want geoJson on output
    case cnst.GEOMETRYCOLLECTION:
      return Joi.string().invalid(...cnst.SYMBOLS_GEO_POLYGON); // will want geoJson on output

    // 11.5 The JSON Data Type
    // JSON

    default:
      return Joi.string();
  }
};

export const toSchemaScalar = (type: string) => {
  switch (type) {
    // 11.1 Numeric Data Types
    case cnst.BIT:
    case cnst.TINYINT:
    case cnst.SMALLINT:
    case cnst.MEDIUMINT:
    case cnst.INT:
    case cnst.INTEGER:
      return "Float";
    // BIGINT
    // DECIMAL
    // DEC
    // NUMERIC
    // FIXED
    // FLOAT
    // DOUBLE
    // DOUBLE PRECISION
    // REAL

    // 11.2 Date and Time Data Types
    // DATE
    // TIME
    // DATETIME
    // TIMESTAMP
    case cnst.YEAR:
      return "Float";

    // 11.3 String Data Types
    // CHAR
    // NATIONAL CHAR
    // NCHAR
    // VARCHAR
    // NATIONAL VARCHAR
    // NVARCHAR
    // BINARY
    // VARBINARY
    // TINYBLOB
    // TINYTEXT
    // BLOB
    // TEXT
    // MEDIUMBLOB
    // MEDIUMTEXT
    // LONGBLOB
    // LONGTEXT
    // ENUM
    // SET

    // 11.4 Spatial Data Types
    // GEOMETRY
    // POINT
    // LINESTRING
    // POLYGON
    // MULTIPOINT
    // MULTILINESTRING
    // MULTIPOLYGON
    // GEOMETRYCOLLECTION
    case cnst.GEOMETRY:
    case cnst.POINT:
    case cnst.LINESTRING:
    case cnst.POLYGON:
    case cnst.MULTIPOINT:
    case cnst.MULTILINESTRING:
    case cnst.MULTIPOLYGON:
    case cnst.GEOMETRYCOLLECTION:
      return "JSONB";
    // 11.5 The JSON Data Type
    // JSON

    default:
      return "String";
  }
};

export const dialect = ({ migrationTable }) => {
  const dbSurveyQuery = `
  SELECT
    detail.TABLE_SCHEMA resource_schema,
    case
      when main.TABLE_TYPE = 'VIEW' then 'view'
      else 'table'
    end resource_type,
    detail.TABLE_NAME resource_name,
    detail.ordinal_position resource_column_id,
    detail.column_name resource_column_name,
    case
      when detail.is_nullable = 'NO' then True
      else False
    end notnull,
    detail.data_type "type",
    case
      stats.index_name
      when 'PRIMARY' then 1
      else 0
    end as primarykey,
    case
      stats.non_unique
      when 1 then 0
      else 1
    end as uniquekey
  FROM
    information_schema.tables main
  JOIN (
    select
      col.TABLE_SCHEMA,
      col.TABLE_NAME,
      col.ordinal_position,
      col.column_name,
      col.data_type,
      case
        when col.character_maximum_length is not null then col.character_maximum_length
        else col.numeric_precision
      end as max_length,
      col.is_nullable
    from
      information_schema.columns col
    where
      col.table_schema not in ('sys',
      'information_schema',
      'mysql',
      'performance_schema')
    order by
      col.table_schema,
      col.table_name,
      col.ordinal_position
    ) detail
      on
      main.TABLE_SCHEMA = detail.TABLE_SCHEMA
      and
      main.TABLE_NAME = detail.TABLE_NAME
  LEFT JOIN information_schema.statistics stats
      on
      detail.TABLE_SCHEMA = stats.index_schema
      and
      detail.TABLE_NAME = stats.table_name
      and
      detail.column_name = stats.column_name
  WHERE
    main.table_schema not in (
      'sys',
      'performance_schema',
      'information_schema',
      'mysql'
    )
    and
    detail.TABLE_NAME not in ('${migrationTable}', '${migrationTable}_lock')
  ORDER BY
    detail.TABLE_SCHEMA,
    detail.TABLE_NAME,
    detail.column_name;
    `;

  const versionQuery = `select version() as db_version;`;
  return {
    dbSurveyQuery,
    versionQuery,
    joiBase,
    toSchemaScalar,
    toProtoScalar: null,
  };
};
