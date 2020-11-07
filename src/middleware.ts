import { v4 as uuidv4 } from "uuid";
import { HEADER_REQUEST_ID } from "./const";
import * as Joi from "joi";

export const prepRequestForService = (logger) => async (
  ctx: Joi.Context,
  next: () => Promise<{}>
): Promise<void> => {
  // assign request uuid & set in state for logs and response header
  const reqId = uuidv4();
  ctx.response.set(HEADER_REQUEST_ID, reqId);
  ctx.state = { reqId };

  logger.debug(
    {
      reqId,
      method: ctx.method,
      url: ctx.request.url,
    },
    "service_call"
  );

  await next();
};
