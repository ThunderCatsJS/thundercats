/* eslint-disable no-unused-vars, no-undefined, no-unused-expressions */
var mocha = require('mocha');
var chai = require('chai');
var expect = chai.expect;
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

describe('#Store', function() {

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

    describe('#No Promise or Observable', function() {
      var store;

      before(function() {
        store = Store.create({
          getInitialValue: function getInitialValue() {}
        });
      });

      it('should not publish a value if getInitialValue returns neither a promise nor an observable', function() {
        store.subscribe(function(val) {
          expect(val).to.be.undefined;
        });
      });
    });

    describe('#Promises and Observables', function() {
      var store, value;

      before(function() {
        value = 1;
        store = Store.create({
          getInitialValue: function () {
            return Q.resolve(value);
          }
        });
      });

      it('should produce a new Rx.Observable', function() {
        store.should.be.an.instanceOf(Rx.Observable);
      });

      it('should resolve and publish a value if getInitialValue returns a Promise', function () {
        store.subscribe(function(val) {
          val.should.equal(value);
        });
      });

      before(function() {
        value = 2;
        store = Store.create({
          getInitialValue: function () {
            return Rx.Observable.of(value);
          }
        });
      });

      it('should publish the observable\'s resolve value if getInitialValue returns an observable', function() {
        store.subscribe(function(val) {
          val.should.equal(value);
        });
      });
    });
  });

  describe('#Operations', function() {

    describe('#Errors', function() {

      var store;

      before(function () {
        store = Store.create({
          getInitialValue: function () {
            return {};
          },
          getOperations: function () {
            return Rx.Observable.of(5);
          }
        });
      });

      it('should throw an error if getInitialValue is not a function', function() {
        store.subscribe.bind(function () {}).should.throw();
      });

      before(function () {
        var store = Store.create({
          getInitialValue: function () {
            return {};
          },
          getOperations: function () {
            return Rx.Observable.of({});
          }
        });
      });

      it('should throw an error if getInitialValue is not a function', function() {
        store.subscribe.bind(function() {}).should.throw();
      });
    });

    describe('#Basic transformation properties', function() {

      var value = { hello: 'world' };
      var newValue = { foo: 'bar' };
      var operations = new Rx.Subject();
      var spy = sinon.spy();
      var store;

      before(function() {
        store = Store.create({
          getInitialValue: function () {
            return value;
          },

          getOperations: function () {
            return operations;
          }
        });
        store.subscribe(spy);
      });

      it('should passed to the value held by the store to the function operation', function() {
        operations.onNext({
          transform: function(val) {
            val.should.equal(value);
            return newValue;
          }
        });
      });

      it('the value held by the store should be the one returned by the function' +
      ' passed to \'applyOperation\'', function() {
        spy.should.have.been.calledWith(value);
      });

      it('observers should have been notified with the new value', function() {
        spy.should.have.been.calledWith(newValue);
      });

      it('store have been called twice', function() {
        spy.should.have.been.calledTwice;
      });
    });

    describe('#Basic set value operation', function() {

      var value = { hello: 'world' };
      var newValue = { foo: 'bar' };
      var operations = new Rx.Subject();
      var spy = sinon.spy();
      var store;

      before(function() {
        store = Store.create({
          getInitialValue: function () {
            return value;
          },

          getOperations: function () {
            return operations;
          }
        });
        store.subscribe(spy);
        operations.onNext({value: newValue});
      });

      it('the value held by the store should be the one returned by the ' +
      'function passed to \'applyOperation\'', function() {
        spy.should.have.been.calledWith(value);
      });

      it('observers should have been notified with the new value', function() {
        spy.should.have.been.calledWith(newValue);
      });

      it('store have been called twice', function() {
        spy.should.have.been.calledTwice;
      });
    });

    describe('#Operations canceling', function () {

      describe('#Basic operations', function () {

        var value = {};
        var newValue = {};
        var operations = new Rx.Subject();
        var spy = sinon.spy();
        var defer = Q.defer();
        var store;

        before(function() {
          store = Store.create({
            getInitialValue: function() {
              return value;
            },
            getOperations: function() {
              return operations;
            }
          });
          store.subscribe(spy);
          operations.onNext({
            value: newValue,
            confirm: defer.promise
          });
        });

        it('observers should have been notified with the initial value', function () {
          spy.should.have.been.calledWith(value);
        });

        it('observers should have been notified with the new value', function () {
          spy.should.have.been.calledWith(newValue);
        });


        before(function() {
          defer.reject();
        });

        it('observers should have been notified about the canceling', function() {
          spy.should.have.been.calledWith(value);
        });

        it('store should have been called three times', function() {
          spy.should.have.been.calledThrice;
        });
      });

      describe('#Nesting', function() {

        var operations = new Rx.Subject();
        var spy = sinon.spy();
        var deferred1 = Q.defer();
        var store;

        before(function() {
          store = Store.create({
            getInitialValue: function() {
              return [];
            },
            getOperations: function() {
              return operations;
            }
          });
          store.subscribe(spy);
        });

      });


    });

  });
});
