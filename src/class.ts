import * as bunyan from "bunyan";
import * as knex from "knex";
import * as knexPostgis from "knex-postgis";

import * as Joi from "@hapi/joi";
import * as cnst from "./const";
import * as ts from "./interfaces";
import * as util from "./utils";

export const genericResourceCall = (
  operation: string,
  schema: Joi.Schema,
  caller: ts.IClassResource
) => (input: ts.IParamsProcessBase) => {
  const resource = caller.name;
  const { requestId } = input;
  caller.logger.info(
    {
      ...input,
      resource,
      operation,
    },
    "resource_call"
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

  const sql = util.toCreateQuery({
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

  return util.resolveResource({ sql });
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
      if (result.errors)
        rejection = util.rejectResource(cnst.CONTEXT_ERRORS, result.errors);
      // returned context is mutated if passed
      context = result.context;
    }
    return {
      ...rejection,
      context,
    };
  }

  create(input: ts.IParamsProcessBase) {
    return genericResourceCall(cnst.CREATE, this.schema.create, this)(input);
  }
  read(input: ts.IParamsProcessBase) {
    return genericResourceCall(cnst.READ, this.schema.read, this)(input);
  }
  update(input: ts.IParamsProcessWithSearch) {
    return genericResourceCall(cnst.UPDATE, this.schema.update, this)(input);
  }
  delete(input: ts.IParamsProcessDelete) {
    return genericResourceCall(cnst.DELETE, this.schema.delete, this)(input);
  }

  search(input: ts.IParamsProcessBase) {
    const { requestId } = input;
    this.logger.info(
      {
        ...input,
        resource: this.name,
        operation: cnst.SEARCH,
      },
      "resource_search"
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

    const sql = util.toSearchQuery({
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

    return util.resolveResource({ sql });
  }
}
