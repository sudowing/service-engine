// import * as statusCodes from "http-status-codes";
// import { Context } from "koa";
// import * as Router from "koa-router";
// import { GET } from "./const";
// import * as ts from "./interfaces";
// import {
//   generateOperations,
//   nameRestEndpointGetRecords,
//   uniqueKeyComponents,
//   validatorInspector,
// } from "./utils";

// const controller = (
//   operation: ts.IOperation,
//   opts?: ts.IParamsControllerSpecs
// ) => async (ctx: Context) => {
//   const query = ctx.method === GET ? ctx.request.query : ctx.request.body;
//   const payload = Array.isArray(query) ? query : [query || {}];

//   // get context

//   // if (count) ctx.response.set(cnst.X_REQUEST_COUNT, count.toString());
//   // if (sql) ctx.response.set(cnst.X_REQUEST_SQL, sql);

//   try {
//     const { sql } = await operation({
//       payload: opts.unique ? payload[0] : payload,
//     });
//     const body = { sql: sql.toString() };

//     ctx.response.status = statusCodes.OK;
//     ctx.response.body = body;
//   } catch (err) {
//     const body = { err };

//     ctx.response.status = statusCodes.BAD_REQUEST;
//     ctx.response.body = body;
//   }
// };

// export const generateServiceRouter = ({
//   db,
//   st,
//   resources,
// }: ts.IServiceConfig) =>
//   Object.entries(resources).reduce((router: Router, [resource, validator]) => {
//     const { resourceEndpoint, uniqueEndpoint } = nameRestEndpointGetRecords(
//       resource
//     );

//     const { create, read, update, del } = generateOperations({
//       db,
//       st,
//       validator,
//       resource,
//     });

//     router.post(resourceEndpoint, controller(create));

//     router.get(resourceEndpoint, controller(read));
//     router.put(resourceEndpoint, controller(update));
//     router.del(resourceEndpoint, controller(del));

//     // if unique make record endpoint
//     if (uniqueKeyComponents(validatorInspector(validator)).length) {
//       router.get(uniqueEndpoint, controller(read, { unique: true }));
//       router.put(uniqueEndpoint, controller(update, { unique: true }));
//       router.del(uniqueEndpoint, controller(del, { unique: true }));
//     }

//     return router;
//   }, new Router());
