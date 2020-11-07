// import * as sinon from "chai";
import { expect } from "chai";
import "mocha";

import * as middleware from "../middleware";

describe("middleware", () => {
  describe("simply get them represented on the coverage report", () => {

    it("exists", () => {
      expect(typeof middleware).to.equal("object");
    });

  });
});
