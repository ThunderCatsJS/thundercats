/* eslint-disable no-unused-expressions */
var chai = require('chai');
chai.should();
var Action = require('./../lib/action');
var chaiAsPromised = require('chai-as-promised');
var sinon = require('sinon');
var sinonChai = require('sinon-chai');

chai.use(chaiAsPromised);
chai.use(sinonChai);

describe('Action', function() {

  describe('Create', function() {
    it('should create a function observable', function() {
      var action = Action.create();
      action.should.be.a('function');
      action.subscribe.should.to.be.a('function');
    });
  });

  describe('Call', function() {
    var action;

    beforeEach(function() {
      action = Action.create();
    });

    it(
      'should notify passed value to subscribed observer when called',
      function(done) {
        action.first().subscribe(function (val) {
          val.should.equal(3);
          done();
        });

        action(3);
      }
    );
  });

  describe('Map', function() {
    var value1 = {};
    var value2 = {};
    var map;
    var spy;
    var action;

    beforeEach(function() {
      map = function() {
        return value2;
      };

      spy = sinon.spy(map);
      action = Action.create(spy);
    });

    it(
      'should pass the value passed as parameter to the map function',
      function(done) {
        action.first().subscribe(function() {
          done();
        });
        action(value1);
        spy.should.have.been.calledOnce;
        spy.should.have.been.calledWith(value1);
      }
    );


    it(
      'should pass the result of the map function to observers',
      function(done) {
        action.first().subscribe(function(val) {
          val.should.equal(value2);
          done();
        });
        action(value1);
      }
    );

    it('should throw an error when an error is thrown in the map', function() {
      Action.create(function() {
        throw new Error('test');
      }).should.throw();
    });
  });

  describe('disposal', function() {

    var spy;
    var action;

    beforeEach(function() {
      action = Action.create();
      spy = sinon.spy();
    });

    it('should call observer that isn\'t disposed', function() {
      action.subscribe(spy);
      action(3);
      spy.should.have.been.called;
    });

    it('should not call observer that has been disposed', function() {
      action.subscribe(spy).dispose();
      action(3);
      spy.should.not.have.been.called;
    });
  });

  describe('observers', function() {

    var action, disposable;
    beforeEach(function() {
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
      disposable = action.subscribe(function() { });
      disposable.dispose();
      action.hasObservers().should.be.false;
    });
  });
});
