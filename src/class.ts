import * as bunyan from "bunyan";
import * as knex from "knex";
import * as knexPostgis from "knex-postgis";

import * as Joi from "@hapi/joi";
import * as cnst from "./const";
import * as database from "./database";
import * as ts from "./interfaces";
import * as util from "./utils";

export const genericResourceCall = (
  operation: string,
  schema: Joi.Schema,
  fields: string[],
  toQuery: any,
  caller: ts.IClassResource
) => (
  input:
    | ts.IParamsProcessBase
    | ts.IParamsProcessWithSearch
    | ts.IParamsProcessDelete
) => {
  const resource = caller.name;
  const { requestId } = input;
  caller.logger.debug(
    {
      ...input,
      resource,
      operation,
    },
    cnst.RESOURCE_CALL
  );

  const { context, ...parsed } = caller.contextParser(input);
  if (parsed.error) {
    caller.logger.error(
      {
        requestId,
        resource,
        operation,
        errors: parsed.error,
      },
      cnst.CONTEXT_ERRORS
    );
    return util.rejectResource(parsed.errorType, parsed.error);
  }

  // set fields to all available by default
  context.fields = context.fields || fields;

  const { error, value: query } = util.validateOneOrMany(schema, input.payload);
  if (error) {
    caller.logger.error(
      {
        requestId,
        resource,
        operation,
        error,
      },
      cnst.VALIDATION_ERROR
    );

    return util.rejectResource(cnst.VALIDATION_ERROR, error);
  }

  const sql = toQuery({
    ...caller.queryBase(),
    query,
    context,
  });

  caller.logger.info(
    {
      requestId,
      resource,
      operation,
      sql: sql.toString(),
    },
    cnst.RESOURCE_RESPONSE
  );

  return util.resolveResource({ sql, context, query });
};

export class Resource implements ts.IClassResource {
  public db: knex;
  public st: knexPostgis.KnexPostgis;
  public logger: bunyan;
  public name: string;
  public validator: Joi.Schema;
  public schema: ts.IValidationExpanderSchema;
  public report: ts.IValidationExpanderReport;
  public meta: ts.IValidationExpanderMeta;
  public generics: ts.TResponseGenerics;

  // need to add logger statements throughout
  constructor({
    db,
    st,
    logger,
    name,
    validator,
  }: ts.IClassResourceConstructor) {
    this.db = db;
    this.st = st;
    this.logger = logger;
    this.name = name;
    this.validator = validator;
    const { schema, report, meta } = util.validationExpander(validator);
    this.schema = schema;
    this.report = report;
    this.meta = meta;

    // these generic calls need to be defined in the contstructor so they only get called once
    const generics = {
      create: genericResourceCall(
        cnst.CREATE,
        schema.create,
        Object.keys(report.create),
        database.toCreateQuery,
        this
      ),
      read: genericResourceCall(
        cnst.READ,
        schema.read,
        Object.keys(report.read),
        database.toReadQuery,
        this
      ),
      update: genericResourceCall(
        cnst.UPDATE,
        schema.update,
        Object.keys(report.update),
        database.toUpdateQuery,
        this
      ),
      delete: genericResourceCall(
        cnst.DELETE,
        schema.delete,
        Object.keys(report.delete),
        database.toDeleteQuery,
        this
      ),
    };

    this.generics = generics;

    // this.middleware || for read && search
    // this.permissions (CRUD, hard/soft delete)
  }

  queryBase() {
    return {
      db: this.db,
      st: this.st,
      resource: this.name,
    };
  }

  contextParser(input: ts.IParamsProcessBase) {
    let context: ts.ISearchQueryContext = cnst.SEARCH_QUERY_CONTEXT;
    let rejection: ts.IRejectResource = {
      errorType: undefined,
      error: undefined,
    };
    if (input.context) {
      const result = util.queryContextParser(this.validator, input.context);
      if (result.errors.length) {
        rejection = util.rejectResource(cnst.CONTEXT_ERRORS, result.errors);
      }
      // returned context is mutated if passed
      context = result.context;
    }
    return {
      ...rejection,
      context,
    };
  }

  // these generic calls need to be defined in the contstructor so they only get called once
  create(input: ts.IParamsProcessBase) {
    return this.generics.create(input);
  }
  read(input: ts.IParamsProcessBase) {
    return this.generics.read(input);
  }
  update(input: ts.IParamsProcessWithSearch) {
    return this.generics.update(input);
  }
  delete(input: ts.IParamsProcessDelete) {
    return this.generics.delete(input);
  }


  search(input: ts.IParamsProcessBase) {
    const { requestId } = input;
    this.logger.debug(
      {
        ...input,
        resource: this.name,
        operation: cnst.SEARCH,
      },
      cnst.RESOURCE_CALL
    );
    const { context, ...parsed } = this.contextParser(input);
    if (parsed.error) {
      this.logger.error(
        {
          requestId,
          resource: this.name,
          operation: cnst.SEARCH,
          errors: parsed.error,
        },
        cnst.CONTEXT_ERRORS
      );
      return util.rejectResource(parsed.errorType, parsed.error);
    }

    const { errors, components } = this.meta.searchQueryParser(
      input.payload,
      input.context
    );
    if (errors.length) {
      this.logger.error(
        {
          requestId,
          resource: this.name,
          operation: cnst.DELETE,
          errors,
        },
        cnst.VALIDATION_ERROR
      );
      return util.rejectResource(cnst.CONTEXT_ERRORS, errors);
    }

    const sql = database.toSearchQuery({
      ...this.queryBase(),
      context,
      components,
    });

    this.logger.info(
      {
        requestId,
        resource: this.name,
        operation: cnst.SEARCH,
        sql: sql.toString(),
      },
      cnst.RESOURCE_RESPONSE
    );

    return util.resolveResource({ sql, query: components, context });
  }
}
