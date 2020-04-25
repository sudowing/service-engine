import * as bunyan from "bunyan";
import * as knex from "knex";
import * as knexPostgis from "knex-postgis";

import * as Joi from "@hapi/joi";
import { SEARCH_QUERY_CONTEXT } from "./const";
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

  contextParser(rawContext: ts.IParamsSearchQueryParser) {
    return util.queryContextParser(this.validator, rawContext);
  }

  // context in by post
  create(input: ts.IParamsProcessBase) {
    // const { requestId } = input;

    if (input.context) {
      const { errors, context } = this.contextParser(input.context);
      if (errors) return util.rejectResource("context_errors", errors);
      // returned context is mutated if passed
      input.context = context;
    }

    const { error, value: query } = util.validateOneOrMany(
      this.schema.create,
      input.payload
    );
    if (error) return util.rejectResource("validation_error", error);

    const sql = util.toCreateQuery({
      ...this.queryBase(),
      query,
      context: input.context,
    });
    return util.resolveResource({ sql });
  }

  read(input: ts.IParamsProcessBase) {
    // const { requestId } = input;

    if (input.context) {
      const { errors, context } = this.contextParser(input.context);
      if (errors) return util.rejectResource("context_errors", errors);
      // returned context is mutated if passed
      input.context = context;
    }

    const { error, value: query } = this.schema.read.validate(input.payload);
    if (error) return util.rejectResource("validation_error", error);

    const sql = util.toReadQuery({
      ...this.queryBase(),
      query,
      context: input.context,
    });
    return util.resolveResource({ sql });
  }

  update(input: ts.IParamsProcessWithSearch) {
    // const { requestId } = input;

    if (input.context) {
      const { errors, context } = this.contextParser(input.context);
      if (errors) return util.rejectResource("context_errors", errors);
      // returned context is mutated if passed
      input.context = context;
    }

    // need to remove context keys || dont know if this is true please check (25 April)
    const { error, value: query } = util.validateOneOrMany(
      this.schema.update,
      input.payload
    );
    if (error) return util.rejectResource("validation_error", error);

    // if (input.searchQuery) {
    //   const validSearch = this.schema.search.validate(input.searchQuery);
    //   if (validSearch.error) util.rejectResource('validSearch', validSearch.error);
    // }

    const sql = util.toUpdateQuery({
      ...this.queryBase(),
      query,
      context: input.context,
      searchQuery: undefined, // undefined for now -- will accept mass updates
    });
    return util.resolveResource({ sql });
  }

  // soft delete VS hard delete defined by db query fn
  delete(input: ts.IParamsProcessDelete) {
    // const { requestId } = input;

    if (input.context) {
      const { errors, context } = this.contextParser(input.context);
      if (errors) return util.rejectResource("context_errors", errors);
      // returned context is mutated if passed
      input.context = context;
    }

    // need to remove context keys
    const { error, value: query } = util.validateOneOrMany(
      this.schema.update,
      input.payload
    );
    if (error) return util.rejectResource("validation_error", error);

    // if (input.searchQuery) {
    //   const validSearch = this.schema.search.validate(input.searchQuery);
    //   if (validSearch.error) util.rejectResource('validSearch', validSearch.error);
    // }

    const sql = util.toDeleteQuery({
      ...this.queryBase(),
      query,
      context: input.context,
      searchQuery: undefined, // undefined for now -- will accept mass updates
      hardDelete: input.hardDelete,
    });
    return util.resolveResource({ sql });
  }
  search(input: ts.IParamsProcessBase) {
    // const { requestId } = input;

    if (input.context) {
      const { errors: contextErrors, context } = this.contextParser(
        input.context
      );
      if (contextErrors)
        return util.rejectResource("context_errors", contextErrors);
      // returned context is mutated if passed
      input.context = context;
    }
    else {
      input.context = SEARCH_QUERY_CONTEXT;
    }

    const { errors, components } = this.meta.searchQueryParser(
      input.payload,
      input.context
    );
    if (errors.length) return util.rejectResource("context_errors", errors);

    const sql = util.toSearchQuery({
      ...this.queryBase(),
      context: input.context,
      components,
    });
    return util.resolveResource({ sql });
  }
}
