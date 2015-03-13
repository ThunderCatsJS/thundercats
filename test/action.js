/* eslint-disable no-unused-vars, no-undefined, no-unused-expressions */
var mocha = require('mocha');
var chai = require('chai');
var expect = chai.expect;
var should = chai.should();
var Action = require('./../lib/action');
var Invariant = require('../lib/invariant');
var Store = require('../lib/store');
var Rx = require('rx');
var sinon = require('sinon');
var Q = require('q');
var chaiAsPromised = require('chai-as-promised');
var sinonChai = require('sinon-chai');

chai.use(chaiAsPromised);
chai.use(sinonChai);

describe('# Action', function() {

  describe('## Create', function() {

    it('should be a function', function() {
      var action = Action.create();
      action.should.be.a.function;
    });
  });

  describe('## Call', function() {
    var action;

    before(function() {
      action = Action.create();
    });

    it('should notify passed value to subscribed observer when called', function() {
      action.subscribe(function (val) {
        val.should.equal(3);
      });
    });

    after(function() {
      action(3);
    });
  });

  describe('## Map', function() {

    var value1 = {}, value2 = {};
    var spy = sinon.spy();
    var action;


    //it('should pass the value passed as parameter to the map function', function() {
    //  action = Action.create(function(val) {
    //    return value2;
    //  });
    //});

    before(function() {
      action = Action.create(function(val) {
        return value2;
      });
    });

    it('should pass the result of the map function to observers', function() {
      action.subscribe(function(val) {
        val.should.equal(value2);
      });
    });

    //it('should return the value returned by map', function() {
    //  action(value1).should.equal.value2;
    //});

    it('should throw an error when an error is thrown in the map', function() {
      Action.create(function() {
        throw new Error('test');
      }).should.throw();
    });
  });

  describe('## Disposal', function() {

    var spy1 = sinon.spy(), spy2 = sinon.spy(), spy3 = sinon.spy();
    var action;

    before(function() {
      action = Action.create();

    });

    it('should not call observer that has been disposed', function() {
      action.subscribe(spy1).dispose();
      action(3);
      spy1.should.not.have.been.called;
    });

    it('should call observer that isn\'t disposed', function() {
      action.subscribe(spy2);
      action(3);
      spy2.should.have.been.called;
    });

    it('should not call observer that has been disposed', function() {
      action.subscribe(spy3).dispose();
      action(3);
      spy3.should.not.have.been.called;
    });
  });

  describe('## Observers', function() {

    var action, disposable;
    before(function() {
      action = Action.create();
    });

    it('should return false if the action has no observers', function() {
      action.hasObservers().should.be.false;
    });

    it('should return true if the action as observers', function() {
      disposable = action.subscribe(function () {});
      action.hasObservers().should.be.true;
    });

    it('should return false if observers have been disposed of', function() {
      disposable.dispose();
      action.hasObservers().should.be.false;
    });
  });
});

// todo done above
