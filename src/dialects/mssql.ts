import * as Joi from "joi";

// defintions based on sql-server 1 datatypes
// https://docs.microsoft.com/en-us/sql/t-sql/data-types/data-types-transact-sql?view=sql-server-ver15


export const joiBase = (type: string) => {
  switch (type) {
    // Exact numerics
    case 'bigint':
    case 'numeric':
        return Joi.string();
    case 'bit':
    case 'smallint':
        return Joi.number().integer();
    case 'decimal':
    case 'smallmoney':
        return Joi.string();
    case 'int':
    case 'tinyint':
        return Joi.number().integer();
    case 'money':
        return Joi.string();
    // Approximate numerics
    case 'float':
        return Joi.string();
    case 'real':
        return Joi.number();
    // Date and time
    case 'date':
    case 'datetimeoffset':
    case 'datetime2':
    case 'smalldatetime':
    case 'datetime':
    case 'time':
        return Joi.string();
    // Character strings
    case 'char':
    case 'varchar':
    case 'text':
        return Joi.string();
    // Unicode character strings
    case 'nchar':
    case 'nvarchar':
    case 'ntext':
    case 'Binary strings':
    case 'binary':
    case 'varbinary':
    case 'image':
        return Joi.string();
    // Other data types
    case 'cursor':
    case 'rowversion':
    case 'hierarchyid':
    case 'uniqueidentifier':
    case 'sql_variant':
    case 'xml':
    case 'table':
        return Joi.string();
    default:
        return Joi.string();
  }
};

export const toSchemaScalar = (type: string) => {
  switch (type) {
    // Exact numerics
    case 'bigint':
    case 'numeric':
        return 'String';
    case 'bit':
    case 'smallint':
        return 'Float';
    case 'decimal':
    case 'smallmoney':
        return 'String';
    case 'int':
    case 'tinyint':
        return 'Float';
    case 'money':
        return 'String';
    // Approximate numerics
    case 'float':
        return 'String';
    case 'real':
        return 'Float';
    // Date and time
    case 'date':
    case 'datetimeoffset':
    case 'datetime2':
    case 'smalldatetime':
    case 'datetime':
    case 'time':
        return 'String';
    // Character strings
    case 'char':
    case 'varchar':
    case 'text':
        return 'String';
    // Unicode character strings
    case 'nchar':
    case 'nvarchar':
    case 'ntext':
    case 'Binary strings':
    case 'binary':
    case 'varbinary':
    case 'image':
        return 'String';
    // Other data types
    case 'cursor':
    case 'rowversion':
    case 'hierarchyid':
    case 'uniqueidentifier':
    case 'sql_variant':
    case 'xml':
    case 'table':
        return 'String';
    default:
        return 'String';
  }
};

export const toProtoScalar = (type: string) => {
  switch (type) {
    // Exact numerics
    case 'bigint':
    case 'numeric':
        return 'string';
    case 'bit':
    case 'smallint':
        return 'uint32';
    case 'decimal':
    case 'smallmoney':
        return 'string';
    case 'int':
    case 'tinyint':
        return 'uint32';
    case 'money':
        return 'string';
    // Approximate numerics
    case 'float':
        return 'string';
    case 'real':
        return 'string';
    // Date and time
    case 'date':
    case 'datetimeoffset':
    case 'datetime2':
    case 'smalldatetime':
    case 'datetime':
    case 'time':
        return 'string';
    // Character strings
    case 'char':
    case 'varchar':
    case 'text':
        return 'string';
    // Unicode character strings
    case 'nchar':
    case 'nvarchar':
    case 'ntext':
    case 'Binary strings':
    case 'binary':
    case 'varbinary':
    case 'image':
        return 'string';
    // Other data types
    case 'cursor':
    case 'rowversion':
    case 'hierarchyid':
    case 'uniqueidentifier':
    case 'sql_variant':
    case 'xml':
    case 'table':
        return 'string';
    default:
        return 'string';
  }
};

export const dialect = ({ migrationTable }) => {
  const dbSurveyQuery = `
        with keys as (
            SELECT
                main.TABLE_CATALOG
                ,main.TABLE_SCHEMA
                ,main.TABLE_NAME
                ,main.COLUMN_NAME
                ,detail.CONSTRAINT_TYPE
            FROM
                INFORMATION_SCHEMA.CONSTRAINT_COLUMN_USAGE main
            JOIN
                INFORMATION_SCHEMA.TABLE_CONSTRAINTS detail
                    on
                        main.TABLE_CATALOG = detail.TABLE_CATALOG
                        and
                        main.TABLE_SCHEMA = detail.TABLE_SCHEMA
                        and
                        main.TABLE_NAME = detail.TABLE_NAME
                        and
                        main.CONSTRAINT_NAME = detail.CONSTRAINT_NAME
            where
                detail.CONSTRAINT_TYPE in ('PRIMARY KEY', 'UNIQUE')
        ),
        survey as (
            SELECT
                detail.TABLE_CATALOG,
                detail.TABLE_SCHEMA resource_schema,
                case
                when main.TABLE_TYPE = 'VIEW' then 'view'
                else 'table'
                end resource_type,
                detail.TABLE_NAME resource_name,
                detail.ordinal_position resource_column_id,
                detail.column_name resource_column_name,
                case
                when detail.is_nullable = 'NO' then 1
                else 0
                end notnull,
                detail.data_type "type"
            FROM
                information_schema.tables main
            JOIN (
                select
                col.TABLE_CATALOG,
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
                col.table_schema not in (
                    'sys',
                    'information_schema'
                )
                ) detail
                on
                main.TABLE_SCHEMA = detail.TABLE_SCHEMA
                and
                main.TABLE_NAME = detail.TABLE_NAME
            WHERE
                main.table_schema not in (
                'sys',
                'information_schema'
                )
        )
        select
            survey.resource_schema
            ,survey.resource_type
            ,survey.resource_name
            ,survey.resource_column_id
            ,survey.resource_column_name
            ,survey.notnull
            ,survey.type
            ,case
            when keys.CONSTRAINT_TYPE = 'PRIMARY KEY' then 1
            else 0
            end primarykey
            ,case
            when keys.CONSTRAINT_TYPE = 'UNIQUE' then 1
            else 0
            end uniquekey
        from
            survey
        left join keys
            on
                keys.TABLE_CATALOG = survey.TABLE_CATALOG
                and
                keys.TABLE_SCHEMA = survey.resource_schema
                and
                keys.TABLE_NAME = survey.resource_name
                and
                keys.COLUMN_NAME = survey.resource_column_name
        order by
            survey.resource_schema
            ,survey.resource_type
            ,survey.resource_name
            ,survey.resource_column_id
        ;
    `;

  const versionQuery = `select @@version as db_version;`;

  return {
    dbSurveyQuery,
    versionQuery,
    joiBase,
    toSchemaScalar,
    toProtoScalar,
  };
};



