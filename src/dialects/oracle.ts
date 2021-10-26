import * as Joi from "joi";

// defintions based on oracle 19 datatypes
// https://docs.oracle.com/en/database/oracle/oracle-database/19/sqlqr/Data-Types.html#GUID-B6965FC9-3660-4849-BBD6-91725986EBD0

export const joiBase = (type: string) => {
  switch (type) {
    case "smallint":
    case "integer":
    case "bigint":
      return Joi.number();
    default:
      return Joi.string();
  }
};

export const toSchemaScalar = (type: string) => {
  switch (type) {
    case "smallint":
    case "integer":
    case "bigint":
      return "Float";
    default:
      return "String";
  }
};

export const toProtoScalar = (type: string) => {
  switch (type) {
    case "smallint":
    case "integer":
    case "bigint":
      // return "uint32";
      // return "sint32";
      return "sint32";
    default:
      return "string";
  }
};

export const dialect = ({ migrationTable }) => {
  const dbSurveyQuery = `
	WITH tables AS (
		SELECT
			col.owner AS resource_schema
			,'table' resource_type
			,col.table_name resource_name
			,col.COLUMN_ID resource_column_id
			,col.column_name resource_column_name
			,CASE
				WHEN col.nullable <> 'Y' THEN 1
				ELSE 0
			END notnull
			,col.data_type type
			,col.data_precision
			,col.data_length
			,CASE
				WHEN pk.primary_key = 'PK' THEN 1
				ELSE 0
			END primarykey
			,CASE
				WHEN uk.unique_key = 'UK' THEN 1
				ELSE 0
			END uniquekey
		FROM
			all_tables tab
		INNER JOIN all_tab_columns col ON
			col.owner = tab.owner
			AND col.table_name = tab.table_name
		LEFT JOIN all_col_comments comm ON
			col.owner = comm.owner
			AND col.table_name = comm.table_name
			AND col.column_name = comm.column_name
		LEFT JOIN (
			SELECT
				constr.owner,
				col_const.table_name,
				col_const.column_name,
				'PK' primary_key
			FROM
				all_constraints constr
			INNER JOIN all_cons_columns col_const ON
				constr.constraint_name = col_const.constraint_name
				AND col_const.owner = constr.owner
			WHERE
				constr.constraint_type = 'P') pk ON
			col.table_name = pk.table_name
			AND col.column_name = pk.column_name
			AND col.owner = pk.owner
		LEFT JOIN (
			SELECT
				constr.owner,
				col_const.table_name,
				col_const.column_name,
				'FK' foreign_key
			FROM
				all_constraints constr
			INNER JOIN all_cons_columns col_const ON
				constr.constraint_name = col_const.constraint_name
				AND col_const.owner = constr.owner
			WHERE
				constr.constraint_type = 'R'
			GROUP BY
				constr.owner,
				col_const.table_name,
				col_const.column_name) fk ON
			col.table_name = fk.table_name
			AND col.column_name = fk.column_name
			AND col.owner = fk.owner
		LEFT JOIN (
			SELECT
				constr.owner,
				col_const.table_name,
				col_const.column_name,
				'UK' unique_key
			FROM
				all_constraints constr
			INNER JOIN all_cons_columns col_const ON
				constr.constraint_name = col_const.constraint_name
				AND constr.owner = col_const.owner
			WHERE
				constr.constraint_type = 'U'
		UNION
			SELECT
				ind.owner,
				col_ind.table_name,
				col_ind.column_name,
				'UK' unique_key
			FROM
				all_indexes ind
			INNER JOIN all_ind_columns col_ind ON
				ind.index_name = col_ind.index_name
			WHERE
				ind.uniqueness = 'UNIQUE') uk ON
			col.table_name = uk.table_name
			AND col.column_name = uk.column_name
			AND col.owner = uk.owner
		LEFT JOIN (
			SELECT
				constr.owner,
				col_const.table_name,
				col_const.column_name,
				'Check' check_constraint
			FROM
				all_constraints constr
			INNER JOIN all_cons_columns col_const ON
				constr.constraint_name = col_const.constraint_name
				AND col_const.owner = constr.owner
			WHERE
				constr.constraint_type = 'C'
			GROUP BY
				constr.owner,
				col_const.table_name,
				col_const.column_name) check_const ON
			col.table_name = check_const.table_name
			AND col.column_name = check_const.column_name
			AND col.owner = check_const.owner
	),
	views AS (
		SELECT
			col.owner AS resource_schema,
			'view' resource_type,
			col.table_name resource_name,
			col.COLUMN_ID resource_column_id,
			col.column_name resource_column_name,
		CASE
				WHEN col.nullable <> 'Y' THEN 1
				ELSE 0
			END notnull,
			col.data_type type,
			col.data_precision,
			col.data_length,
			0 primarykey,
			0 uniquekey
		FROM
			all_views v
		INNER JOIN all_tab_columns col ON
			v.view_name = col.table_name
		INNER JOIN all_col_comments comm ON
			col.table_name = comm.table_name
			AND col.owner = comm.owner
			AND col.column_name = comm.column_name
	),
	mat_views AS (
		SELECT
			col.owner AS resource_schema
			,'materialized view' resource_type
			,col.table_name resource_name
			,col.COLUMN_ID resource_column_id
			,col.column_name resource_column_name
			,CASE
				WHEN col.nullable <> 'Y' THEN 1
				ELSE 0
			END notnull
			,col.data_type type
			,col.data_precision
			,col.data_length
			,0 primarykey
			,0 uniquekey
		FROM
			all_mviews v
		INNER JOIN all_tab_columns col ON
			v.mview_name = col.table_name
		INNER JOIN all_col_comments comm ON
			col.table_name = comm.table_name
			AND col.owner = comm.owner
			AND col.column_name = comm.column_name
	),
	resources AS (
		SELECT * FROM tables
		UNION
		SELECT * FROM views
		UNION
		SELECT * FROM mat_views
	)
	SELECT
		 resource_schema "resource_schema"
		,resource_type "resource_type"
		,resource_name "resource_name"
		,resource_column_id "resource_column_id"
		,resource_column_name "resource_column_name"
		,notnull "notnull"
		,type "type"
		,data_precision "data_precision"
		,data_length "data_length"
		,primarykey "primarykey"
		,uniquekey "uniquekey"
	FROM resources
	WHERE
		resource_schema NOT IN (
			'ANONYMOUS'
			,'DBSFWUSER'
			,'AUDSYS'
			,'DVSYS'
			,'OJVMSYS'
			,'GSMADMIN_INTERNAL'
			,'CTXSYS'
			,'DBSNMP'
			,'EXFSYS'
			,'LBACSYS'
			,'MDSYS'
			,'MGMT_VIEW'
			,'OLAPSYS'
			,'OWBSYS'
			,'ORDPLUGINS'
			,'ORDSYS'
			,'OUTLN'
			,'SI_INFORMTN_SCHEMA'
			,'SYS'
			,'SYSMAN'
			,'SYSTEM'
			,'TSMSYS'
			,'WK_TEST'
			,'WKSYS'
			,'WKPROXY'
			,'WMSYS'
			,'XDB'
			,'APEX_040000'
			,'APEX_PUBLIC_USER'
			,'DIP'
			,'FLOWS_30000'
			,'FLOWS_FILES'
			,'MDDATA'
			,'ORACLE_OCM'
			,'SPATIAL_CSW_ADMIN_USR'
			,'SPATIAL_WFS_ADMIN_USR'
			,'XS$NULL'
			,'PUBLIC'
			,'${migrationTable}', '${migrationTable}_lock'
		)
	ORDER BY
		resource_schema
		,resource_type
		,resource_name
		,resource_column_id
  `.replace(/[\n\r\t]/g, " ");

  const versionQuery = `SELECT BANNER_FULL "db_version" FROM v$version`;

  return {
    dbSurveyQuery,
    versionQuery,
    joiBase,
    toSchemaScalar,
    toProtoScalar,
  };
};
