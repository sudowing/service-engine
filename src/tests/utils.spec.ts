// import * as sinon from "chai";
import { expect } from "chai";
import "mocha";

import * as utils from "../utils";

console.log('**********');
console.log('oooo.utils');
console.log(utils);
console.log('**********');

describe("utils", () => {
  it("some test", () => { expect("test").to.equal("test"); });

  it("some typecastFn", () => {
    expect("typecastFn").to.equal("typecastFn");
  });

  it("some modifyValidator", () => {
    expect("modifyValidator").to.equal("modifyValidator");
  });

  it("some reducerValidatorInspector", () => {
    expect("reducerValidatorInspector").to.equal("reducerValidatorInspector");
  });

  it("some validatorInspector", () => {
    expect("validatorInspector").to.equal("validatorInspector");
  });

  it("some error_message_invalid_value", () => {
    expect("error_message_invalid_value").to.equal("error_message_invalid_value");
  });

  it("some generateSearchQueryError", () => {
    expect("generateSearchQueryError").to.equal("generateSearchQueryError");
  });

  it("some badArgsLengthError", () => {
    expect("badArgsLengthError").to.equal("badArgsLengthError");
  });

  it("some concatErrorMessages", () => {
    expect("concatErrorMessages").to.equal("concatErrorMessages");
  });

  it("some validArgsforOperation", () => {
    expect("validArgsforOperation").to.equal("validArgsforOperation");
  });

  it("some supportMultipleValues", () => {
    expect("supportMultipleValues").to.equal("supportMultipleValues");
  });

  it("some supportedOperation", () => {
    expect("supportedOperation").to.equal("supportedOperation");
  });

  it("some parseFieldAndOperation", () => {
    expect("parseFieldAndOperation").to.equal("parseFieldAndOperation");
  });

  it("some searchQueryParser", () => {
    expect("searchQueryParser").to.equal("searchQueryParser");
  });

});
