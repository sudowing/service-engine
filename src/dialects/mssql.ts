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



