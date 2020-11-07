// import * as sinon from "chai";
import { expect } from "chai";
import "mocha";

import * as graphql from "../graphql";

describe("graphql", () => {
  describe("simply get them represented on the coverage report", () => {

    it("exists", () => {
      expect(typeof graphql).to.equal("object");
    });

  });
});
