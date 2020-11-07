// import * as sinon from "chai";
import { expect } from "chai";
import "mocha";

import * as clss from "../class";

describe("clss", () => {
  describe("simply get them represented on the coverage report", () => {
    it("exists", () => {
      expect(typeof clss).to.equal("object");
    });
  });
});
