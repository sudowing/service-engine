import * as bunyan from "bunyan";
import * as knex from "knex";
import * as knexPostgis from "knex-postgis";

import * as Joi from "@hapi/joi";
import * as cnst from "./const";
import * as ts from "./interfaces";
import * as util from "./utils";

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

    // this.middleware
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

  // context in by post
  create(input: ts.IParamsProcessBase) {
    // const { requestId } = input;

    const { context, ...parsed } = this.contextParser(input);
    if (parsed.error)
      return util.rejectResource(parsed.errorType, parsed.error);

    const { error, value: query } = util.validateOneOrMany(
      this.schema.create,
      input.payload
    );
    if (error) return util.rejectResource(cnst.VALIDATION_ERROR, error);

    const sql = util.toCreateQuery({
      ...this.queryBase(),
      query,
      context,
    });
    return util.resolveResource({ sql });
  }

  read(input: ts.IParamsProcessBase) {
    // const { requestId } = input;

    const { context, ...parsed } = this.contextParser(input);
    if (parsed.error)
      return util.rejectResource(parsed.errorType, parsed.error);

    const { error, value: query } = this.schema.read.validate(input.payload);
    if (error) return util.rejectResource(cnst.VALIDATION_ERROR, error);

    const sql = util.toReadQuery({
      ...this.queryBase(),
      query,
      context,
    });
    return util.resolveResource({ sql });
  }

  update(input: ts.IParamsProcessWithSearch) {
    // const { requestId } = input;

    const { context, ...parsed } = this.contextParser(input);
    if (parsed.error)
      return util.rejectResource(parsed.errorType, parsed.error);

    // need to remove context keys || dont know if this is true please check (25 April)
    const { error, value: query } = util.validateOneOrMany(
      this.schema.update,
      input.payload
    );
    if (error) return util.rejectResource(cnst.VALIDATION_ERROR, error);

    // if (input.searchQuery) {
    //   const validSearch = this.schema.search.validate(input.searchQuery);
    //   if (validSearch.error) util.rejectResource('validSearch', validSearch.error);
    // }

    const sql = util.toUpdateQuery({
      ...this.queryBase(),
      query,
      context,
      searchQuery: undefined, // undefined for now -- will accept mass updates
    });
    return util.resolveResource({ sql });
  }

  // soft delete VS hard delete defined by db query fn
  delete(input: ts.IParamsProcessDelete) {
    // const { requestId } = input;

    const { context, ...parsed } = this.contextParser(input);
    if (parsed.error)
      return util.rejectResource(parsed.errorType, parsed.error);

    // need to remove context keys
    const { error, value: query } = util.validateOneOrMany(
      this.schema.update,
      input.payload
    );
    if (error) return util.rejectResource(cnst.VALIDATION_ERROR, error);

    // if (input.searchQuery) {
    //   const validSearch = this.schema.search.validate(input.searchQuery);
    //   if (validSearch.error) util.rejectResource('validSearch', validSearch.error);
    // }

    const sql = util.toDeleteQuery({
      ...this.queryBase(),
      query,
      context,
      searchQuery: undefined, // undefined for now -- will accept mass updates
      hardDelete: input.hardDelete,
    });
    return util.resolveResource({ sql });
  }
  search(input: ts.IParamsProcessBase) {
    // const { requestId } = input;
    const { context, ...parsed } = this.contextParser(input);
    if (parsed.error)
      return util.rejectResource(parsed.errorType, parsed.error);

    const { errors, components } = this.meta.searchQueryParser(
      input.payload,
      input.context
    );
    if (errors.length) return util.rejectResource(cnst.CONTEXT_ERRORS, errors);

    const sql = util.toSearchQuery({
      ...this.queryBase(),
      context,
      components,
    });
    return util.resolveResource({ sql });
  }
}
