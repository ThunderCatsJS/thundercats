/* eslint-disable no-unused-vars, no-undefined, no-unused-expressions */
var mocha = require('mocha');
var chai = require('chai');
var expect = chai.expect;
var should = chai.should();
var sinon = require('sinon');
var chaiAsPromised = require('chai-as-promised');

var Rx = require('rx');
var Q = require('q');
var Store = require('../').Store;
var Mixin = require('../').ObservableStateMixin;
var inherits = require('../utils').inherits;

chai.use(chaiAsPromised);
chai.use(require('sinon-chai'));

describe('Store', function() {
  describe('construct', function() {
    var store, observable;

    beforeEach(function() {
      observable = new Rx.Subject();
      function ExtendStore() {
        Store.call(this);
      }

      inherits(ExtendStore, Store);

      ExtendStore.prototype.getInitialValue = function() {
        return { name: 'Lion-O' };
      };

      ExtendStore.prototype.getOperations = function() {
        return observable;
      };

      ExtendStore.prototype.opsOnError = function(err) {
        console.log('an error occurred in operations with ' + err);
      };

      ExtendStore.prototype.opsOnCompleted = function() {
        throw new Error('ops completed unexpectedly');
      };

      store = new ExtendStore();
    });

    it('should be an instance of ThunderCats Store', function() {
      store.should.be.an.instanceOf(Store);
    });

    it('should be an observable', function() {
      var spy = sinon.spy();
      store.subscribe.should.be.a('function');
      store.subscribe(spy);
      observable.onNext({ value: { name: 'purr' }});
      spy.should.have.been.calledWith({ name: 'purr' });
    });

    it('should override built in operations onError handler', function() {
      expect(function() {
        var spy = sinon.spy();
        store.subscribe(spy);
        observable.onError(new Error('Do not cross streams'));
      }).to.not.throw();
    });

    it('should override built in operations onComplete handler', function() {
      expect(function() {
        var spy = sinon.spy();
        store.subscribe(spy);
        observable.onCompleted("I ain't got nothing left");
      }).to.throw(/ops completed/);
    });

    it(
      'should throw an error if in getInitialValue is not provided',
      function() {
        expect(function() {
          store = new Store();
          store.subscribe(function() { });
        }).to.throw(/getInitialValue not implemented/);
      }
    );

    it(
      'should throw an error if in getOperations is not provided',
      function() {
        expect(function() {
          function ExtendStore() {
            Store.call(this);
          }
          inherits(ExtendStore, Store);
          ExtendStore.prototype.getInitialValue = function() {
            return { name: 'Lion-O' };
          };
          store = new ExtendStore();
          store.subscribe(function() { });
        }).to.throw(/getOperations not implemented/);
      }
    );
  });

  describe('create', function() {

    it('should be an observable', function() {
      var store = Store.create({
        getInitialValue: function() { }
      });
      store.should.be.an.instanceOf(Store);
      store.subscribe.should.be.a('function');
    });

    it('should throw an error if argument passed is not an object', function() {
      Store.create.bind(this, 5)
        .should
        .throw(/expects an object as argument/);
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
        .throw(/getInitialValue should be a function/);
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
        expect(fn).to.throw(/getInitialValue should be a function/);
      }
    );

    describe('with promises and observables', function() {
      var store, value;

      it(
        'should resolve and publish a value if getInitialValue returns ' +
        ' and resolves a Promise',
        function () {
          value = { name: 'Lion-O' };
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
        'should notify observers if get initial value promise is rejected',
        function(done) {
          value = { name: 'Lion-O' };
          var spy = sinon.spy();
          store = Store.create({
            name: 'Bob',
            getInitialValue: function () {
              return Q.reject(value);
            }
          });

          store.subscribe(spy, function(val) {
            spy.should.not.have.been.called;
            val.should.equal(value);
            done();
          });
        }
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

      it('should throw if operations observable errors', function() {
        var observable = new Rx.Subject();
        var fn = function() {
          var store = Store.create({
            getInitialValue: function () {
              return {};
            },
            getOperations: function() {
              return observable;
            }
          });
          store.subscribe(function() { });
          observable.onError(new Error('catastrophy'));
        };
        expect(fn).to.throw(/catastrophy/);
      });
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
        'should pass the value held by the store to the observers',
        function() {
          spy.should.have.been.calledWith(value);
        }
      );

      it('should have notified observers with the new value', function() {
        operations.onNext({value: newValue});
        spy.should.have.been.calledWith(newValue);
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
        'should pass the value held by the store to operations',
        function() {
          spy.should.have.been.calledWith(value);
        }
      );

      it(
        'should passed to the value held by the store to the operations ' +
        'transform',
        function() {
          spy.should.have.not.been.calledWith(newValue);
          operations.onNext({
            transform: function(val) {
              val.should.equal(value);
              return newValue;
            }
          });
        }
      );

      it('should have notified observers with the new value', function() {
        spy.should.have.been.calledWith(newValue);
        spy.should.have.been.calledTwice;
      });
    });

    describe('confirming', function() {

      var value = {};
      var newValue = {};
      var operations;
      var spy;
      var defer;
      var store;

      before(function() {
        operations = new Rx.Subject();
        spy = sinon.spy();
        defer = Q.defer();
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
        'should register a new entry in store history with confirm promise',
        function() {
          store._history.size.should.equal(0);
          operations.onNext({
            value: newValue,
            confirm: defer.promise
          });
          store._history.size.should.equal(1);
        }
      );

      it('should respect previous operations', function() {
        var defer2 = Q.defer();
        operations.onNext({
          value: {},
          confirm: defer2.promise
        });
        defer2.reject();
      });

      it('should remove that entry on promise resolve', function(done) {
        defer.resolve();
        defer.promise.then(function() {
          store._history.size.should.equal(0);
          done();
        });
      });
    });

    describe('canceling', function () {

      var value = {};
      var newValue = {};
      var operations;
      var spy;
      var defer;
      var defer2;
      var store;

      before(function() {
        operations = new Rx.Subject();
        spy = sinon.spy();
        defer = Q.defer();
        store = Store.create({
          getInitialValue: function() {
            return {};
          },
          getOperations: function() {
            return operations;
          }
        });
        store.subscribe(spy);
      });

      it(
        'should notify observers with the initial value',
        function () {
          spy.should.have.been.calledOnce;
          spy.should.have.been.calledWith(value);
          operations.onNext({ value: value });
        }
      );

      it(
        'should have notified observers with the new value',
        function () {
          operations.onNext({
            value: newValue,
            confirm: defer.promise
          });
          spy.should.have.been.calledWith(newValue);
        }
      );

      it(
        'should have notified observers about the canceling',
        function(done) {
          defer.reject();
          defer.promise.catch(function() {
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
          'should notify observers with the transformed value ' +
          'after the first operation has been applied',
          function() {
            spy.should.have.been.calledWith(['foo']);
          }
        );

        it(
          'should notify observers with the transformed value ' +
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
          'should notify observers with result of applying the ' +
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
          'should notify observers with the initial value after ' +
          'the second operation has failed',
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

  describe('outliers', function() {
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
      'should throw if an operation id is used that does not exist ' +
      'within its history',
      function() {
        expect(
          store._confirmOperation.bind(store, 'not an id')
        ).to.throw(/an unknown operation id was used/);
        expect(
          store._cancelOperation.bind(store, 'not an id')
        ).to.throw(/an unknown operation id was used/);
      }
    );
  });
});
