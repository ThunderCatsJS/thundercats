/* eslint-disable no-unused-vars, no-undefined, no-unused-expressions */
import chai, { expect } from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import chaiAsPromised from 'chai-as-promised';

import Rx from 'rx';
import Q from 'q';
import { Store, Actions } from '../src';
import { isObservable, isStore } from '../src/utils';

Rx.config.longStackSupport = true;
chai.should();
chai.use(chaiAsPromised);
chai.use(sinonChai);

describe('isStore', function() {
  it('should return true when given store', () => {
    isStore(Store).should.be.true;
  });

  it('should return true when given stampe based on Store', () => {
    const FooStore = Store();
    isStore(FooStore).should.be.true;
  });

  it('should return false when given non store', () => {
    isStore('foo').should.be.false;
  });
});

describe('Store', function() {
  describe('Factory', function() {
    let store, CatStore, CatActions, catActions;

    beforeEach(function() {

      catActions = new Rx.Subject();
      const CatStore = Store({ refs: { value: { name: 'Lion-O' } } })
        .static({ displayName: 'CatStore' })
        .methods({
          opsOnError(err) {
            console.log('an error occurred in operations with ' + err);
          },
          opsOnCompleted() {
            throw new Error('ops completed unexpectedly');
          }
        })
        .init(({ instance }) => {
          instance.register(catActions);
        });
      store = CatStore();
    });

    it('should be an instance of ThunderCats Store', function() {
      store.subscribe.should.be.a('function');
    });

    it('should be an observable', function() {
      let spy = sinon.spy();
      store.subscribe.should.be.a('function');
      store.subscribe(spy);
      catActions.onNext({ replace: { name: 'purr' }});
      spy.should.have.been.calledWith({ name: 'purr' });
    });

    it('should replacer built in operations onError handler', function() {
      expect(function() {
        store.subscribe(function() { });
        catActions.onError();
      }).to.not.throw();
    });

    it('should replacer built in operations onComplete handler', function() {
      expect(function() {
        let spy = sinon.spy();
        store.subscribe(spy);
        catActions.onCompleted();
      }).to.throw(/ops completed/);
    });
  });

  describe('stamp descriptor', function() {
    it('should honor stamp descriptor in created stamp', function() {
      const initSpy = sinon.spy();
      const CatStore = Store({
        init: initSpy,
        props: { foo: { bar: 'baz' } },
        refs: {
          value: { todos: ['foo'] },
          meow: 'goesthecat'
        },
        statics: { boo: { bar: () => {} } }
      });
      CatStore.boo.bar.should.be.a.function;
      const catStore = CatStore();
      catStore.value.todos[0].should.equal('foo');
      catStore.foo.bar.should.equal('baz');
      catStore.meow.should.equal('goesthecat');
      initSpy.should.have.been.calledOnce;
    });
  });

  describe('operations', function() {

    describe('register', function() {

      it('should throw when registering non observables', function() {
        let fn = function() {
          const ExtendStore = Store({ refs: { value: {name: 'Lion-O'} } })
            .init(({ instance }) => {
              instance.register('not the momma');
            });
          let store = ExtendStore();
          store.subscribe(function() { });
        };
        expect(fn).to.throw(/should register observables/);
      });

      it('should throw if an action errors', function() {
        let fn = function() {
          let catActions = new Rx.Subject();
          const ExtendStore = Store({ refs: { value: { name: 'Lion-O' } } })
            .init(({ instance }) => {
              instance.register(catActions);
            });
          let store = ExtendStore();
          store.subscribe(function() { });
          catActions.onError('catastrophy');
        };
        expect(fn).to.throw(/catastrophy/);
      });

      it('should complain when action completes', function() {
        let catActions = new Rx.Subject();
        const ExtendStore = Store({ refs: { value: { name: 'Lion-O' } } })
          .init(({ instance }) => {
            instance.register(catActions);
          });
        let store = ExtendStore();
        let onCompletedSpy = sinon.spy(store, 'opsOnCompleted');
        store.subscribe(function() {});
        catActions.onCompleted();
        onCompletedSpy.should.have.been.calledOnce;
      });
    });
    describe('register helpers', function() {
      let catActions, store, register;
      const {
        createRegistrar,
        fromMany,
        replacer,
        setter,
        transformer
      } = Store;

      beforeEach(() => {
        catActions = createActions();
        const CatStore = Store();
        store = CatStore();
      });

      describe('createRegistrar', () => {
        it('should return a function', () => {
          let register = createRegistrar(store);
          register.should.be.a('function');
        });

        describe('register', () => {
          let register, observable;
          beforeEach(() => {
            register = createRegistrar(store);
            observable = Rx.Observable.just('not the momma');
          });

          it('should update store actions', () => {
            store.actions.length.should.equal(0);
            register(observable);
            store.actions.length.should.equal(1);
          });
        });
      });

      describe('fromMany', () => {
        it('should return an observable', () => {
          let mergedObservable = fromMany(catActions.doAction);
          isObservable(mergedObservable).should.be.true;
        });
        describe('observable', () => {
          it('should call onError if given non observable', () => {
            fromMany('bananas').subscribeOnError(err => {
              expect(err).to.exist;
              err.should.be.instanceOf(Error);
              err.should.match(/should get observables but was given bananas/);
            });
            fromMany(catActions.doAction, 'bananas').subscribeOnError(err => {
              expect(err).to.exist;
              err.should.be.instanceOf(Error);
              err.should.match(/should get observables but was given bananas/);
            });
          });

          it('should call pass through values', (done) => {
            let subject1 = new Rx.Subject();
            let subject2 = new Rx.Subject();
            fromMany(subject1, subject2).subscribe(
              value => {
                value.should.match(/bananas/);
              },
              null,
              done
            );
            subject1.onNext('go bananas');
            subject2.onNext('eat bananas');
            subject1.onCompleted();
            subject2.onCompleted();
          });
        });
      });

      describe('replacer', () => {
        it('should throw if given non observable', () => {
          expect(() => {
            replacer('bananas');
          }).to.throw(/should get observables but was given bananas/);
        });

        it('should return an observable', () => {
          let replacerOperation = replacer(catActions.doAction);
          expect(replacerOperation).to.exist;
          isObservable(replacerOperation).should.be.true;
        });

        describe('observable', () => {
          it('should call onError with non function payloads', (done) => {
            replacer(catActions.doAction)
              .subscribeOnError(err => {
                err.should.be.an.instanceOf(Error);
                err.message.should.match(
                  /should receive objects but was given bananas/
                );
                done();
              });
            catActions.doAction('bananas');
          });

          it('should call onNext with { replace }', done => {
            replacer(catActions.doAction)
              .subscribe(item => {
                item.should.be.an('object');
                item.should.have.keys('replace');
                done();
              });
            catActions.doAction({});
          });
        });
      });

      describe('setter', () => {
        it('should throw if given non observable', () => {
          expect(() => {
            setter('bananas');
          }).to.throw(/should get observables but was given bananas/);
        });

        it('should return an observable', () => {
          let setterOperation = setter(catActions.doAction);
          expect(setterOperation).to.exist;
          isObservable(setterOperation).should.be.true;
        });

        describe('observable', () => {

          it('should call onError with non function payloads', (done) => {
            setter(catActions.doAction)
              .subscribeOnError(err => {
                err.should.be.an.instanceOf(Error);
                err.message.should.match(
                  /should receive objects but was given bananas/
                );
                done();
              });
            catActions.doAction('bananas');
          });

          it('should call onNext with { set }', done => {
            setter(catActions.doAction)
              .subscribe(item => {
                item.should.be.an('object');
                item.should.have.keys('set');
                done();
              });
            catActions.doAction({});
          });
        });
      });

      describe('transformer', () => {
        it('should throw if given non observable', () => {
          expect(() => {
            transformer('bananas');
          }).to.throw(/should get observables but was given bananas/);
        });

        it('should return an observable', () => {
          let transformOperation = transformer(catActions.doAction);
          expect(transformOperation).to.exist;
          isObservable(transformOperation).should.be.true;
        });

        describe('observable', () => {
          it('should call onError with non function payloads', (done) => {
            transformer(catActions.doAction)
              .subscribeOnError(err => {
                err.should.be.an.instanceOf(Error);
                err.message.should.match(
                  /should receive functions but was given bananas/
                );
                done();
              });
            catActions.doAction('bananas');
          });
          it('should call onNext with { transformer }', done => {
            transformer(catActions.doAction)
              .subscribe(item => {
                item.should.be.an('object');
                item.should.have.keys('transform');
                done();
              });
            catActions.doAction(() => {});
          });
        });
      });
    });

    it('should throw if stream item is null or undefined', () => {
      const catActions = new Rx.Subject();
      const CatStore = Store({ })
        .init(({ instance }) => instance.register(catActions));
      expect(() => {
        const store = CatStore();
        store.subscribe(
          () => {},
          () => {},
          () => {}
        );
        catActions.onNext();
      }).to.throw(/operation should be an object/);
      expect(() => {
        const store = CatStore();
        store.subscribe(
          () => {},
          () => {},
          () => {}
        );
        catActions.onNext(null);
      }).to.throw(/operation should be an object/);
    });

    describe('replace', function() {

      let value = { hello: 'world' };
      let newValue = { foo: 'bar' };
      let spy = sinon.spy();
      let catActions;
      let store;

      before(function() {
        catActions = new Rx.Subject();
        const CatStore = Store({ refs: { value } })
          .init(({ instance }) => instance.register(catActions));
        store = CatStore();
        store.subscribe(spy);
      });

      it(
        'should pass the value held by the store to the observers',
        function() {
          spy.should.have.been.calledWith(value);
        }
      );

      it('should notify observers with the new value', function() {
        catActions.onNext({ replace: newValue });
        spy.should.have.been.calledWith(newValue);
        spy.should.have.been.calledTwice;
      });

      it('should not throw if value is null', function() {
        expect(() => {
          catActions.onNext({ replace: null });
        }).to.not.throw();
      });

      it('should throw if value is not an object', function() {
        expect(() => {
          catActions.onNext({ replace: 'not the momma' });
        }).to.throw(/invalid operation/);
      });
    });

    describe('set', function() {
      let value = { hello: 'world' };
      let newValue = { foo: 'bar' };
      let spy = sinon.spy();
      let CatStore;
      let catActions;
      let store;

      before(function() {
        catActions = new Rx.Subject();
        const CatStore = Store({ refs: { value } })
          .init(({ instance }) => instance.register(catActions));
        store = CatStore();
        store.subscribe(spy);
      });

      it('should assign new values to store value', function() {
        spy.should.have.not.been.calledWith(
          sinon.match({ hello: 'world', foo: 'bar' })
        );
        catActions.onNext({ set: newValue });
        spy.lastCall.should.have.been.calledWith(
          sinon.match({ hello: 'world', foo: 'bar' })
        );
      });

      it('should not throw if set is null', function() {
        expect(() => {
          catActions.onNext({
            set: null
          });
        }).to.not.throw();
      });

      it('should throw if set is not an object or null', function() {
        expect(() => {
          catActions.onNext({
            set: 'yo yo yo'
          });
        }).to.throw(/invalid operation/);
      });
    });

    describe('transform', function() {

      let value = { hello: 'world' };
      let newValue = { foo: 'bar' };
      let spy = sinon.spy();
      let CatStore;
      let catActions;
      let store;

      before(function() {
        catActions = new Rx.Subject();
        const CatStore = Store({ refs: { value } })
          .static({ displayName: 'CatStore' })
          .init(({ instance }) => instance.register(catActions));
        store = CatStore();
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
          catActions.onNext({
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

      it('should cause store noop if return is null', () => {
        spy.should.have.been.calledTwice;
        catActions.onNext({
          transform(val) {
            return null;
          }
        });
        spy.should.have.been.calledTwice;
      });

      it('should throw if not a function', function() {
        expect(() => {
          catActions.onNext({ transform: 'not the momma' });
        }).to.throw(/invalid operation/);
      });
    });

    describe('optimistic updates', function() {

      let value = {};
      let newValue = {};
      let spy;
      let defer;
      let store;
      let catActions;

      before(function() {
        spy = sinon.spy();
        defer = Q.defer();
        catActions = new Rx.Subject();
        const CatStore = Store({ refs: { value } })
          .static({ displayName: 'CatStore' })
          .init(({ instance }) => instance.register(catActions));
        CatStore.displayName = 'CatStore';
        store = new CatStore();
        store.subscribe(spy);
      });

      it(
        'should register a new entry in store history with optimistic promise',
        function() {
          store.history.size.should.equal(0);
          catActions.onNext({
            replace: newValue,
            optimistic: defer.promise
          });
          store.history.size.should.equal(1);
        }
      );

      it('should respect previous operations', function() {
        let defer2 = new Rx.Subject();
        catActions.onNext({
          replace: {},
          optimistic: defer2
        });
        defer2.onError('boo');
      });

      it('should remove that entry on promise resolve', function(done) {
        defer.promise.then(function() {
          store.history.size.should.equal(0);
          done();
        });
        defer.resolve();
      });
    });

    describe('reject', function() {

      let value = {};
      let newValue = {};
      let spy;
      let defer;
      let defer2;
      let store;
      let catActions;

      before(function() {
        spy = sinon.spy();
        defer = Q.defer();
        catActions = new Rx.Subject();
        const CatStore = Store({ refs: { value } })
          .static({ displayName: 'CatStore' })
          .init(({ instance }) => instance.register(catActions));
        store = CatStore();
        store.subscribe(spy);
      });

      it(
        'should notify observers with the initial value',
        function() {
          spy.should.have.been.calledOnce;
          spy.should.have.been.calledWith(value);
          catActions.doAction({ replace: value });
        }
      );

      it(
        'should have notified observers with the new value',
        function() {
          catActions.doAction({
            replace: newValue,
            optimistic: defer.promise
          });
          spy.should.have.been.calledWith(newValue);
        }
      );

      it(
        'should have notified observers about the rejection',
        function(done) {
          defer.reject();
          defer.promise.catch(function() {
            spy.should.have.been.calledWith(value);
            done();
          });
        }
      );

      describe('with nesting', function() {

        let spy = sinon.spy();
        let deferred1 = Q.defer();
        let deferred2 = Q.defer();
        let catActions;
        let store;

        before(function() {
          catActions = new Rx.Subject();
          const CatStore = Store({ refs: { value: [] } })
            .static({ displayName: 'CatStore' })
            .init(({ instance }) => instance.register(catActions));
          store = CatStore();
          store.subscribe(spy);

          catActions.onNext({
            transform: function(arr) {
              return arr.concat('foo');
            },
            optimistic: deferred1.promise
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
            catActions.onNext({
              transform: function(arr) {
                return arr.concat('bar');
              },
              optimistic: deferred2.promise
            });
            spy.should.have.been.calledWith(['foo', 'bar']);
          }
        );

        it(
          'should notify observers with result of applying the ' +
          'second operation on the old value after the first ' +
          'operation has failed',
          function(done) {
            deferred1.promise.catch(function() {
              spy.should.have.been.calledWith(['bar']);
              done();
            });
            deferred1.reject();
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

    let operationsSpy;
    let catActions;
    let store, disposable;

    beforeEach(function() {

      operationsSpy = sinon.spy();
      catActions = createActions(operationsSpy);
      const CatStore = Store()
        .static({ displayName: 'CatStore' })
        .init(({ instance }) => instance.register(catActions.doAction));
      store = CatStore();
    });

    it(
      'should subscribe to actions on initial subscription',
      function() {
        store.subscribe(function() { });
        catActions.doAction.hasObservers().should.be.true;
      }
    );

    it(
      'should dispose subscriptions to actions when store disposes ' +
      'last observer',
      function() {
        let disposable = store.subscribe(function() { });
        catActions.doAction.hasObservers().should.be.true;
        disposable.dispose();
        catActions.doAction.hasObservers().should.be.false;
      }
    );

    it(
      'should resubscribe to observables when store is resubscribed',
      function() {
        let disposable = store.subscribe(function() { });
        catActions.doAction.hasObservers().should.be.true;
        disposable.dispose();
        catActions.doAction.hasObservers().should.be.false;
        store.subscribe(function() {});
        catActions.doAction.hasObservers().should.be.true;
      }
    );
  });

  describe('shouldStoreNotify', function() {
    let operationsSpy;
    let catActions;
    let CatStore, disposable;

    beforeEach(() => {
      operationsSpy = sinon.spy();
      catActions = createActions(operationsSpy);
    });

    it('should notify observer if true', () => {
      CatStore = Store({ refs: { value: { foo: 'bar' } } })
        .refs({ displayName: 'CatStore' })
        .init(({ instance }) => instance.register(catActions.doAction))
        .methods({
          shouldStoreNotify() {
            return true;
          }
        });
      const store = CatStore();
      const observerSpy = sinon.spy();
      store.subscribe(observerSpy);
      observerSpy.should.have.been.calledWith(sinon.match({ foo: 'bar'}));
      catActions.doAction({ set: { foo: 'baz' }});
      observerSpy.should.have.been.calledWith(sinon.match({ foo: 'baz' }));
    });

    it('should notify observer of initValue and none after if false', () => {
      CatStore = Store({ refs: { value: { foo: 'bar' } } })
        .refs({ displayName: 'CatStore' })
        .init(({ instance }) => instance.register(catActions.doAction))
        .methods({
          shouldStoreNotify() {
            return false;
          }
        });
      const store = CatStore();
      const observerSpy = sinon.spy();
      store.subscribe(observerSpy);
      observerSpy.should.have.been.calledWith(sinon.match({ foo: 'bar'}));
      observerSpy.should.have.been.calledOnce;
      catActions.doAction({ set: { foo: 'baz' }});
      observerSpy.should.have.been.calledOnce;
    });

    it('should not affect if not a function', () => {
      CatStore = Store({ refs: { value: { foo: 'bar' } } })
        .refs({ displayName: 'CatStore' })
        .init(({ instance }) => instance.register(catActions.doAction))
        .methods({
          shouldStoreNotify: 'not the momma'
        });
      const store = CatStore();
      const observerSpy = sinon.spy();
      store.subscribe(observerSpy);
      observerSpy.should.have.been.calledWith(sinon.match({ foo: 'bar'}));
      catActions.doAction({ set: { foo: 'baz' }});
      observerSpy.should.have.been.calledWith(sinon.match({ foo: 'baz' }));
    });
  });

  describe('serialize', function() {
    it('should produce a string with the correct data', function() {
      let catActions = createActions();
      const CatStore = Store({ refs: { value: { cats: 'meow' } } })
        .static({ displayName: 'displayName' })
        .init(({ instance }) => instance.register(catActions.doAction));
      let store = CatStore();
      let dats = store.serialize();
      dats.should.be.a.string;
      dats.should.equal(JSON.stringify({ cats: 'meow' }));
    });
  });

  describe('deserialize', function() {
    let value, stringyValue, store, catActions;
    beforeEach(function() {
      value = { cats: 'meow' };
      stringyValue = JSON.stringify(value);
      catActions = createActions();
      const CatStore = Store()
        .static({ displayName: 'CatStore' })
        .init(({ instance }) => instance.register(catActions.doAction));
      store = CatStore();
    });

    it('should update store data', function() {
      expect(store.value).to.deep.equal({});
      store.deserialize(stringyValue);
      store.value.should.deep.equal(value);
    });

    it(
      'should throw if data deserializes to non object',
      function() {
        expect(store.value).to.deep.equal({});
        expect(() => {
          store.deserialize('true');
        }).to.throw(/deserialize must return an object/);
        expect(() => {
          store.deserialize(JSON.stringify(null));
        }).to.throw(/deserialize must return an object/);
      }
    );
  });

  describe('outliers', function() {
    let store, catActions;

    beforeEach(function() {
      catActions = createActions();
      const CatStore = Store()
        .refs({ displayName: 'CatStore' })
        .init(({ instance }) => instance.register(catActions));
      store = CatStore();
    });

    it(
      'should throw if an operation id is used that does not exist ' +
      'within its history'
    );
  });
});

function createActions(spy) {
  spy = spy || function(val) { return val; };
  return Actions({
    doAction(val) {
      spy(val);
      return val;
    }
  })
    .refs({ displayName: 'catActions' })();
}
