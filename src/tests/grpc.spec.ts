// import * as sinon from "chai";
import { expect } from "chai";
import "mocha";

import * as grpc from "../grpc";

describe("grpc", () => {
  describe("simply get them represented on the coverage report", () => {
    it("exists", () => {
      expect(typeof grpc).to.equal("object");
    });
  });
});
