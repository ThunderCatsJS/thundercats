/* eslint-disable no-unused-vars, no-undefined */
var mocha = require('mocha');
var chai = require('chai');
var expect = chai.expect;
var Action = require('./../lib/action');
var Invariant = require('../lib/invariant');
var Store = require('../lib/store');
var Rx = require('rx');
var sinon = require('sinon');
var Q = require('q');

describe('Store', function() {

  describe('#Errors:', function() {

    it('should throw an error if argument passed is not an object', function() {
      Store.create.bind(this, 5).should.
        throw('Invariant Violation: Store.create(...): expect an object as argument, given : 5');
    });

    it('should throw an error if getInitialValue is not defined', function() {
      Store.create.bind(this, {}).should.
        throw('Invariant Violation: Store.create(...): getInitialValue should be a function given : undefined');
    });

    it('should throw an error if getInitialValue is not a function', function() {
      Store.create.bind(this, {getInitialValue: true}).should.
        throw('Invariant Violation: Store.create(...): getInitialValue should be a function given : true');
    });

    it('should throw an error if getOperations is not a function', function() {
      Store.create.bind(this, {getInitialValue: function() {}, getOperations: {}}).should.
        throw('Invariant Violation: Store.create(...): getOperations should be a function given : [object Object]');
    });
  });

  describe('#Behavior:', function() {
    var store;

    before(function() {
      store = Store.create({
        getInitialValue: function getInitialValue() {}
      });
    });
    var value = 5;

    it('should produce a new Rx.Observable', function() {
      store.should.be.an.instanceOf(Rx.Observable);
    });

    it('should not publish a value if getInitialValue return neither a promise nor an observable', function() {
      store.subscribe(function(val) {
        expect(undefined).to.equal(val);
      });
    });

    before(function() {
      store = Store.create({
        getInitialValue: function () {
          return Q.resolve(value);
        }
      });
    });

    it('should resolve and publish a value if getInitialValue returns a Promise', function () {
      store.subscribe(function(val) {
        val.should.eventually.equal(5);
      });
    });
  });
});
