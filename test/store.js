/* eslint-disable no-unused-vars, no-undefined, no-unused-expressions */
var mocha = require('mocha');
var chai = require('chai');
var expect = chai.expect;
var should = chai.should();
var Action = require('./../lib/action');
var Store = require('../lib/store');
var Mixin = require('../lib/ObservableStateMixin');
var Rx = require('rx');
var sinon = require('sinon');
var Q = require('q');
var chaiAsPromised = require('chai-as-promised');
var sinonChai = require('sinon-chai');

chai.use(chaiAsPromised);
chai.use(sinonChai);

describe('# Store', function() {

  describe('## Errors:', function() {

    it('should throw an error if argument passed is not an object', function() {
      Store.create.bind(this, 5).should.
        throw('expects an object as argument, given : 5');
    });

    it('should throw an error if getInitialValue is not defined', function() {
      Store.create.bind(this, {}).should.
        throw('getInitialValue should be a function given : undefined');
    });
  });

  describe('## Behavior:', function() {

    describe('### No Promise or Observable', function() {
      var store;

      before(function() {
        store = Store.create({
          getInitialValue: function getInitialValue() {}
        });
      });

      it(
        'should not publish a value if getInitialValue returns neither ' +
          'a promise nor an observable',
        function() {
          store.subscribe(function(val) {
            expect(val).to.be.undefined;
          });
        }
      );
    });

    describe('### Promises and Observables', function() {
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

      it(
        'should resolve and publish a value if getInitialValue returns ' +
         ' a Promise',
        function () {
          store.subscribe(function(val) {
            val.should.equal(value);
          });
        }
      );

      before(function() {
        value = 2;
        store = Store.create({
          getInitialValue: function () {
            return Rx.Observable.of(value);
          }
        });
      });

      it(
        'should publish the observable\'s resolve value if getInitialValue ' +
          'returns an observable',
        function() {
          store.subscribe(function(val) {
            val.should.equal(value);
          });
        }
      );

    });
  });

  describe('## Operations', function() {

    describe('### getOperations', function() {

      it('should accept a single observable', function() {
        var fn = function() {
          Store.create({
            getInitialValue: function() {
              return {};
            },
            getOperations: function() {
              return Rx.Observable.of(2);
            }
          });
        };
        expect(fn).not.to.throw();
      });

      it('should accept an array of observables', function() {
        var fn = function() {
          Store.create({
            getInitialValue: function() {
              return {};
            },
            getOperations: function() {
              return [
                Rx.Observable.of(2),
                Rx.Observable.of(3),
                Rx.Observable.of(5)
              ];
            }
          });
        };

        expect(fn).not.to.throw();
      });

      it(
        'should throw an error if getInitialValue is not a function',
        function() {
          var fn = function() {
            Store.create({
              getInitialValue: 'Not the momma',

              getOperations: function () {
                return Rx.Observable.of(5);
              }
            });
          };
          expect(fn).to.throw();
        }
      );

      it(
        'should throw an error if getOperations is not a function',
        function() {
          var fn = function() {
            Store.create({
              getInitialValue: function () {
                return {};
              },
              getOperations: 'Not the momma'
            });
          };
          expect(fn).to.throw();
        }
      );

    });

    describe('### Basic transformation properties', function() {

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

      it(
        'should passed to the value held by the store to the function ' +
          'operation',
        function() {
          operations.onNext({
            transform: function(val) {
              val.should.equal(value);
              return newValue;
            }
          });
        }
      );

      it(
        'the value held by the store should be the one returned by ' +
          'the function passed to \'applyOperation\'',
        function() {
          spy.should.have.been.calledWith(value);
        }
      );

      it('observers should have been notified with the new value', function() {
        spy.should.have.been.calledWith(newValue);
      });

      it('store have been called twice', function() {
        spy.should.have.been.calledTwice;
      });

    });

    describe('### Basic set value operation', function() {

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

    describe('### Operations canceling', function () {

      describe('#### Basic operations', function () {

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

        it(
          'observers should have been notified with the initial value',
          function () {
            spy.should.have.been.calledWith(value);
          }
        );

        it(
          'observers should have been notified with the new value',
          function () {
            spy.should.have.been.calledWith(newValue);
          }
        );


        before(function() {
          defer.reject();
        });

        it(
          'observers should have been notified about the canceling',
          function() {
            spy.should.have.been.calledWith(value);
          }
        );

        it('store should have been called three times', function() {
          spy.should.have.been.calledThrice;
        });
      });

      describe('#### Nesting', function() {

        var operations = new Rx.Subject();
        var spy = sinon.spy();
        var deferred1 = Q.defer();
        var deferred2 = Q.defer();
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

          operations.onNext({
            transform: function (arr) {
              return arr.concat('foo');
            },
            confirm: deferred1.promise
          });
        });

        it('observers should have been notified with the transformed value ' +
        'after the first operation has been applied', function() {
          spy.should.have.been.calledWith(['foo']);
        });

        before(function() {
          operations.onNext({
            transform: function (arr) {
              return arr.concat('bar');
            },
            confirm: deferred2.promise
          });
        });

        it('observers should have been notified with the transformed value ' +
        'after the second operation has been applied', function() {
          spy.should.have.been.calledWith(['foo', 'bar']);
        });

        before(function() {
          deferred1.reject();
        });

        it('observers should have been notified with result of applying the ' +
        'second operation on the old value after the first ' +
        'operation has failed', function() {
          spy.should.have.been.calledWith(['bar']);
        });

        before(function() {
          deferred2.reject();
        });

        it('observers should have been notified with the initial value after' +
        ' the second operation has failed', function() {
          spy.should.have.been.calledWith([]);
        });
      });
    });

    describe('### Lifecycle', function() {

      var initialValue = new Rx.Subject();
      var initialValueSpy = sinon.spy(function () {
        return initialValue;
      });

      var operations = new Rx.Subject();
      var operationsSpy = sinon.spy(function () {
        return operations;
      });
      var store, disposable;

      describe('#### Before subscription events', function() {

        before(function() {
          store = Store.create({
            getInitialValue: initialValueSpy,
            getOperations: operationsSpy
          });
        });

        it(
          'getInitialValue and getOperatons should not have been called ' +
           'before a subsription',
          function() {
            initialValueSpy.should.not.have.been.called;
            operationsSpy.should.not.have.been.called;
          }
        );

      });

      describe('#### Subscription event setup', function() {

        before(function () {
          disposable = store.subscribe(function () {
          });
        });

        it(
          'on the first subscription the store should get the initialValue ' +
            'and subscribe to the returned observable',
          function () {
            initialValueSpy.should.have.been.calledOnce;
            initialValue.hasObservers();
          }
        );

        it(
          'until initialValue\'s observable pushes a new value getOperations ' +
            'should not have been called',
          function () {
            operationsSpy.should.not.have.been.called;
          }
        );

      });

      describe('#### Subscription event operations', function() {
        before(function() {
          initialValue.onNext({});
        });

        it(
          'when the initialValue resolves to a value operations spy should ' +
          'have been called',
          function() {
            operationsSpy.should.have.been.called;
            operations.hasObservers();
          }
        );
      });

      describe('', function() {

        var oldOperations = operations;
        operations = new Rx.Subject();

        before(function () {
          initialValue.onNext({});
        });

        it(
          'when the initialValue pushes a new value the store should ' +
            'dispose of the subscription to operations, re-invoke ' +
            'getOperations and subscribe to the returned observable',
          function() {
            operationsSpy.should.have.been.calledTwice;
            operations.hasObservers();
            oldOperations.hasObservers();
          }
        );
      });

      describe('', function() {

        before(function() {
          disposable.dispose();
        });

        it(
          'when all the subscription to the store has been disposed, it ' +
            'should dispose the subscription on operations and initialValue',
          function() {
            !initialValue.hasObservers();
            !operations.hasObservers();
          }
        );
      });

      describe('', function() {

        before(function() {
          store.subscribe(function() {});
        });

        it('on resubscribe it should restart the process', function() {
          store.subscribe(function() {});
          initialValueSpy.should.have.been.calledTwice;
          initialValue.hasObservers();
          operationsSpy.should.have.been.calledTwice;
          !operations.hasObservers();
        });

        it('on resubscribe it should restart the process', function() {
          initialValue.onNext({});
          operationsSpy.should.have.been.calledThrice;
          operations.hasObservers();
        });
      });

    });
  });
});
