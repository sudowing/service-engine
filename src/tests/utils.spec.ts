// import * as sinon from "chai";
import { expect } from "chai";
import "mocha";

import * as utils from "../utils";

console.log('**********');
console.log('oooo.utils');
console.log(utils);
console.log('**********');

describe("utils", () => {

  it("some typecastFn", () => {
    const fn = utils.typecastFn;
    const castString = fn('string')
    const castNumber = fn('number')
    const castBoolean = fn('boolean')

    expect(castString('some_string')).to.equal("some_string");
    expect(castString('123')).to.equal("123");
    expect(castString('true')).to.equal("true");

    expect(castNumber('123')).to.equal(123);
    expect(castNumber('-123')).to.equal(-123);
    expect(castNumber('12.34')).to.equal(12.34);
    expect(castNumber('-0.978')).to.equal(-0.978);
    expect(castNumber('0b110011010')).to.equal(410);
    expect(castNumber('0o4732')).to.equal(2522);
    expect(castNumber('0xb7e8')).to.equal(47080);
    expect(castNumber('2e3')).to.equal(2000);
    expect(castNumber('2e-3')).to.equal(0.002);
    expect(isNaN(castNumber('some_string'))).to.equal(true);

    expect(castBoolean('')).to.equal(false);
    expect(castBoolean('0')).to.equal(false);
    expect(castBoolean('f')).to.equal(false);
    expect(castBoolean('false')).to.equal(false);
    expect(castBoolean('true')).to.equal(true);

    const fnArg = () => true;
    const args = ['some_string', '123', 'true', '123', '-123', '12.34', '-0.978', '0b110011010', '0o4732', '0xb7e8', '2e3', '2e-3', 'some_string', '', '0', 'f', 'false', 'true', null, undefined, Infinity, fnArg]
    args.forEach(arg => {
      expect(fn('{}')(arg)).to.equal(arg);
      expect(fn('null')(arg)).to.equal(arg);
      expect(fn('')(arg)).to.equal(arg);
    })


  });

  it("some modifyValidator", () => {
    // const fn = utils.modifyValidator;
    expect("modifyValidator").to.equal("modifyValidator");
  });

  it("some reducerValidatorInspector", () => {
    // const fn = utils.reducerValidatorInspector;
    expect("reducerValidatorInspector").to.equal("reducerValidatorInspector");
  });

  it("some validatorInspector", () => {
    // const fn = utils.validatorInspector;
    expect("validatorInspector").to.equal("validatorInspector");
  });

  it("some error_message_invalid_value", () => {
    // const fn = utils.error_message_invalid_value;
    expect("error_message_invalid_value").to.equal("error_message_invalid_value");
  });

  it("some generateSearchQueryError", () => {
    // const fn = utils.generateSearchQueryError;
    expect("generateSearchQueryError").to.equal("generateSearchQueryError");
  });

  it("some badArgsLengthError", () => {
    // const fn = utils.badArgsLengthError;
    expect("badArgsLengthError").to.equal("badArgsLengthError");
  });

  it("some concatErrorMessages", () => {
    // const fn = utils.concatErrorMessages;
    expect("concatErrorMessages").to.equal("concatErrorMessages");
  });

  it("some validArgsforOperation", () => {
    // const fn = utils.validArgsforOperation;
    expect("validArgsforOperation").to.equal("validArgsforOperation");
  });

  it("some supportMultipleValues", () => {
    // const fn = utils.supportMultipleValues;
    expect("supportMultipleValues").to.equal("supportMultipleValues");
  });

  it("some supportedOperation", () => {
    // const fn = utils.supportedOperation;
    expect("supportedOperation").to.equal("supportedOperation");
  });

  it("some parseFieldAndOperation", () => {
    // const fn = utils.parseFieldAndOperation;
    expect("parseFieldAndOperation").to.equal("parseFieldAndOperation");
  });

  it("some searchQueryParser", () => {
    // const fn = utils.searchQueryParser;
    expect("searchQueryParser").to.equal("searchQueryParser");
  });

});
