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

describe('Store', function() {

  describe('create:', function() {

    it('should produce a new Rx.Observable', function() {
      var store = Store.create({
        getInitialValue: function() { }
      });
      store.should.be.an.instanceOf(Rx.Observable);
    });

    it('should throw an error if argument passed is not an object', function() {
      Store.create.bind(this, 5)
        .should
        .throw('expects an object as argument, given : 5');
    });

  });

  describe('getInitialValue:', function() {

    it('should publish null if getInitialValue returns null', function() {
      var store = Store.create({
        getInitialValue: function () {}
      });

      store.subscribe(function(val) {
        expect(val).to.be.undefined;
      });
    });

    it(
      'should return a value on initial subscription if `getInitialValue` ' +
      'returns a value',
      function() {
        var store = Store.create({
          getInitialValue: function () {
            return 5;
          }
        });

        store.subscribe(function(val) {
          expect(val).to.be.a('number');
        });
      }
    );

    it('should throw an error if getInitialValue is not defined', function() {
      Store.create.bind(this, {})
        .should
        .throw('getInitialValue should be a function given : undefined');
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

    describe('with promises and observables', function() {
      var store, value;


      it(
        'should resolve and publish a value if getInitialValue returns ' +
         ' a Promise',
        function () {
          value = 1;
          store = Store.create({
            getInitialValue: function () {
              return Q.resolve(value);
            }
          });

          store.subscribe(function(val) {
            val.should.equal(value);
          });
        }
      );

      it(
        'should notify observers if get initial value promise is rejected'
      );


      it(
        'should publish the observable\'s resolve value if getInitialValue ' +
          'returns an observable',
        function() {
          value = 2;

          store = Store.create({
            getInitialValue: function () {
              return Rx.Observable.of(value);
            }
          });

          store.subscribe(function(val) {
            val.should.equal(value);
          });
        }
      );

      it(
        'should notify observers if get initial value observable errors',
        function() {
          store = Store.create({
            getInitialValue: function () {
              return Rx.Observable.throw('snarf?');
            }
          });

          store.subscribe(function() { }, function(err) {
            err.should.be.instanceOf(Error);
          });
        }
      );
    });
  });

  describe('operations', function() {

    describe('getOperations', function() {

      it('should accept a single observable', function() {
        var fn = function() {
          var store = Store.create({
            getInitialValue: function() {
              return {};
            },
            getOperations: function() {
              return Rx.Observable.of({
                value: 'pi'
              });
            }
          });
          store.subscribe(function() { });
        };
        expect(fn).not.to.throw();
      });

      it('should accept an array of observables', function() {
        var fn = function() {
          var store = Store.create({
            getInitialValue: function() {
              return {};
            },
            getOperations: function() {
              return [
                Rx.Observable.of({
                  value: 'pi'
                }),
                Rx.Observable.of({
                  value: 'i'
                }),
                Rx.Observable.of({
                  value: 'ro'
                })
              ];
            }
          });
          store.subscribe(function() { });
        };

        expect(fn).not.to.throw();
      });


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

      it(
        'should throw if it does not return an observable',
        function() {
          var fn = function() {
            var store = Store.create({
              getInitialValue: function () {
                return {};
              },

              getOperations: function() {
                return 'not the momma';
              }
            });
            store.subscribe(function() { });
          };
          expect(fn).to.throw();
        }
      );

      it(
        'should throw if it return an array with a non-observable',
        function() {
          var fn = function() {
            var store = Store.create({
              getInitialValue: function () {
                return {};
              },

              getOperations: function() {
                return [
                  Rx.Observable.from('is the momma'),
                  'not the momma'
                ];
              }
            });
            store.subscribe(function() { });
          };
          expect(fn).to.throw();
        }
      );
    });

    describe('set value', function() {

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
        'the value held by the store should be the one returned by the ' +
          'value held by the object passed to `getOperations`',
        function() {
          spy.should.have.been.calledWith(value);
        }
      );

      it('should have notified observers with the new value', function() {
        operations.onNext({value: newValue});
        spy.should.have.been.calledWith(newValue);
      });

      it('should have called observers twice', function() {
        spy.should.have.been.calledTwice;
      });
    });

    describe('transforms', function() {

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
        'should passed to the value held by the store to the operations ' +
          'transform',
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
          'the function passed to `applyOperation`',
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

    describe('canceling', function () {

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
      });

      it(
        'should have notified observers with the initial value',
        function () {
          spy.should.have.been.calledOnce;
          spy.should.have.been.calledWith(value);
        }
      );

      it(
        'should have notified observers with the new value',
        function () {
          operations.onNext({
            value: newValue,
            confirm: defer.promise
          });
          spy.should.have.been.calledTwice;
          spy.should.have.been.calledWith(newValue);
        }
      );

      it(
        'observers should have been notified about the canceling',
        function(done) {
          defer.reject();
          defer.promise.then(
            function() { },
            function() {
              spy.should.have.been.calledThrice;
              spy.should.have.been.calledWith(value);
              done();
            });
        }
      );

      describe('with nesting', function() {

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

        it(
          'should have notified observers with the transformed value ' +
            'after the first operation has been applied',
          function() {
            spy.should.have.been.calledWith(['foo']);
          }
        );

        it(
          'should have notified observers with the transformed value ' +
            'after the second operation has been applied',
          function() {
            operations.onNext({
              transform: function (arr) {
                return arr.concat('bar');
              },
              confirm: deferred2.promise
            });
            spy.should.have.been.calledWith(['foo', 'bar']);
          }
        );

        it(
          'should have notified observers with result of applying the ' +
            'second operation on the old value after the first ' +
            'operation has failed',
          function(done) {
            deferred1.reject();
            deferred1.promise.catch(function() {
              spy.should.have.been.calledWith(['bar']);
              done();
            });
          }
        );

        it(
          'should have notified observers with the initial value after' +
            ' the second operation has failed',
            function(done) {
            deferred2.reject();
            deferred2.promise.catch(function() {
              spy.should.have.been.calledWith([]);
              done();
            });
          }
        );
      });
    });

  });

  describe('lifecycle', function() {

    var initialValue;
    var initialValueSpy;
    var operations;
    var operationsSpy;
    var store, disposable;

    beforeEach(function() {
      initialValue = new Rx.Subject();
      initialValueSpy = sinon.spy(function () {
        return initialValue;
      });

      operations = new Rx.Subject();
      operationsSpy = sinon.spy(function () {
        return operations;
      });

      store = Store.create({
        getInitialValue: initialValueSpy,
        getOperations: operationsSpy
      });
    });

    it(
      'should not have called getInitialValue and getOperatons' +
      'before a subscription',
      function() {
        initialValueSpy.should.not.have.been.called;
        operationsSpy.should.not.have.been.called;
      }
    );

    it(
      'should subscribe to operations observable on initial subscription',
      function () {
        store.subscribe(function () { });
        initialValue.hasObservers().should.be.true;
        initialValueSpy.should.have.been.calledOne;
      }
    );

    it(
      'should not subscribe to operations until initial value observable ' +
      'publishes first value',
      function () {
        store.subscribe(function(value) {
          value.should.equal('snarf');
        });
        operationsSpy.should.not.have.been.called;
        initialValue.onNext('snarf');
        operationsSpy.should.have.been.calledOnce;
        operations.hasObservers().should.be.true;
      }
    );

    it(
      'should dispose subscriptions to observable and initial value ' +
      'observable when store disposes last observer',
      function() {
        var disposable = store.subscribe(function() { });
        initialValue.hasObservers().should.be.true;
        initialValue.onNext(true);
        operations.hasObservers().should.be.true;
        disposable.dispose();
        initialValue.hasObservers().should.be.false;
        operations.hasObservers().should.be.false;
      }
    );

    it(
      'should resubscribe to observables when store is resubscribed',
      function() {
        var disposable = store.subscribe(function() { });
        initialValue.onNext(true);
        operations.hasObservers().should.be.true;
        disposable.dispose();
        initialValue.hasObservers().should.be.false;
        operations.hasObservers().should.be.false;
        store.subscribe(function() {});
        initialValue.onNext(true);
        initialValue.hasObservers().should.be.true;
        operations.hasObservers().should.be.true;
      }
    );
  });
});
