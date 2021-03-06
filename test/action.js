/* eslint-disable no-unused-expressions */
import Rx, { Observable } from 'rx';
import stampit from 'stampit';
import chai, { assert, expect } from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import chaiAsPromised from 'chai-as-promised';

import { Actions } from '../src';

Rx.config.longStackSupport = true;

chai.should();
chai.use(chaiAsPromised);
chai.use(sinonChai);

describe('Actions', function() {
  describe('Factory', function() {
    let catActions;

    beforeEach(function() {
      const CatActions = Actions({
        shortcut: null,
        getInBox(value) {
          return {
            author: value,
            result: 'disobey'
          };
        },
        passThrough(value) {
          return value;
        },
        errorMap() {
          throw new Error('test');
        },
        returnObservable(obs) {
          return obs;
        },

        refs: { displayName: 'catActions' }
      });

      catActions = CatActions();
    });

    it('should be extend-able', function() {
      catActions.getInBox.should.exist;
      catActions.getInBox.subscribe.should.exist;
    });

    it('should produce observables for defined methods', function() {
      catActions.getInBox.subscribe.should.be.a('function');
    });

    it('should produce observables for null props passed to factory',
      function() {
        catActions.shortcut.subscribe.should.be.a('function');
      }
    );

    it('should respect original map function', function(done) {
      catActions.getInBox.subscribe(function(value) {
        value.should.be.an('object');
        value.author.should.equal('human');
        value.result.should.equal('disobey');
        done();
      });
      catActions.getInBox('human');
    });

    it('should not bind original map by default', function(done) {
      const mixin = stampit().methods({
        getResult() {
          return true;
        }
      });

      const ComposedActions = Actions({

        perform() {
          return this && typeof this.getResult === 'function' ?
            this.getResult() :
            false;
        }
      })
        .refs({ displayName: 'composedActions' })
        .compose(mixin);

      let composedActions = ComposedActions();

      composedActions.perform.subscribe(function(value) {
        value.should.be.false;
        done();
      });
      composedActions.perform();
    });

    it('should bind map if shouldBindMethods is true', function(done) {
      const mixin = stampit().methods({
        getResult() {
          return true;
        }
      });

      const ComposedActions = Actions({
        shouldBindMethods: true,
        perform() {
          this.should.be.defined;
          this.getResult.should.be.a('function');

          return typeof this.getResult === 'function' ?
            this.getResult() :
            false;
        }
      })
        .refs({ displayName: 'composedActions' })
        .compose(mixin);

      let composedActions = ComposedActions();

      composedActions.perform.subscribe(function(value) {
        value.should.be.true;
        done();
      });
      composedActions.perform();
    });

    it(
      'should notify passed value to subscribed observer when called',
      function(done) {
        catActions.passThrough.first().subscribe(function(val) {
          val.should.equal(3);
          done();
        });
        catActions.passThrough(3);
      }
    );

    it('should accept observables from map function', done => {
      catActions.returnObservable.subscribe(val => {
        val.should.equal(3);
        done();
      });
      catActions.returnObservable(Rx.Observable.just(3));
    });

    it('should call onError when map throws', function(done) {
      catActions.errorMap.subscribe(
        () => {
          throw new Error('should not call on next');
        },
        err => {
          expect(err).to.be.an.instanceOf(Error);
          done();
        },
        done
      );
      catActions.errorMap();
    });

    it(
      'should accept observables from map function and call onError',
      done => {
        const err = new Error('Happy Cat Day!');
        catActions.returnObservable.subscribe(
          () => {
            throw new Error('should not call onNext!');
          },
          _err => {
            _err.should.equal(err);
            done();
          },
          done
        );

        catActions.returnObservable(Rx.Observable.throw(err));
      }
    );
  });

  describe('spec', function() {
    it('should take stamp descriptors', () => {
      const initSpy = sinon.spy();
      const CatActions = Actions({
        init: initSpy,
        props: { foo: { bar: 'baz' } },
        refs: { meow: 'goesthecat' },
        statics: { boo: { bar: () => {} } }
      });
      CatActions.boo.bar.should.be.a.function;
      const catActions = CatActions();
      catActions.foo.bar.should.equal('baz');
      catActions.meow.should.equal('goesthecat');
      initSpy.should.have.been.calledOnce;
    });

    it('should work without it', () => {
      const catActions = Actions()();

      assert(
        typeof catActions === 'object',
        'using undefined spec does not work'
      );
    });
  });

  describe('waitFor', function() {
    let catActions, observable1, observable2;

    beforeEach(function() {
      const CatActions = Actions({
        tryWaitFor(val) {
          return val;
        }
      });
      observable1 = new Rx.BehaviorSubject('jaga');
      observable2 = new Rx.BehaviorSubject('lion-o');
      catActions = new CatActions();
    });


    it('should return on observable', () => {
      let waitForObservable = catActions.tryWaitFor.waitFor(observable1);
      waitForObservable.subscribe.should.to.be.a('function');
    });

    describe('observable', () => {
      it('should accept a single observable', function(done) {
        let waitForObservable = catActions.tryWaitFor.waitFor(observable1);
        waitForObservable.subscribe.should.to.be.a('function');
        waitForObservable.subscribeOnNext(() => {
          done();
        });
        catActions.tryWaitFor();
        observable1.onNext();
      });

      it('should accept multiple observables', function(done) {
        let waitForObservable =
          catActions.tryWaitFor.waitFor(observable1, observable2);
        waitForObservable.subscribe.should.to.be.a('function');
        waitForObservable.subscribeOnNext(() => {
          done();
        });
        catActions.tryWaitFor();
        observable1.onNext();
        observable2.onNext();
      });

      it(
        'should not publish for observables that have an initial value',
        function(done) {
          let spy = sinon.spy(function(value) {
            value.should.equal('meow');
            done();
          });
          let waitForObservable = catActions.tryWaitFor.waitFor(observable1);
          waitForObservable.first().subscribe(spy);
          spy.should.have.not.been.called;
          catActions.tryWaitFor('meow');
          spy.should.have.not.been.called;
          observable1.onNext();
          spy.should.have.been.calledOnce;
        }
      );

      it('should throw if given non observable argument', function(done) {
        let waitForObservable = catActions.tryWaitFor.waitFor('not the momma');
        waitForObservable.subscribeOnError((err) => {
          err.should.be.an.instanceOf(Error);
          done();
        });
        catActions.tryWaitFor();
      });
    });
  });

  describe('internal lifecycle hooks', function() {
    it('should have a duration observable', () => {
      const catActions = Actions({ purr: null })();
      assert(
        !!catActions.purr.__duration,
        'actions should have a __durations property'
      );
    });

    it('should on call __duration once per action', () => {
      const spy = sinon.spy();
      const spy2 = sinon.spy();
      const catActions = Actions({ purr: null })();
      catActions.purr.__duration().subscribe(spy);
      catActions.purr(Observable.of(1, 2, 3));
      assert(
        spy.calledOnce,
        'duration Observer was called more than once'
      );

      catActions.purr.__duration().subscribe(spy2);
      catActions.purr(Observable.of(1, 2, 3));

      assert(
        spy.calledOnce,
        'duration Observable spy was called more than once'
      );

      assert(
        spy2.calledOnce,
        'duration Observable spy was called more than once'
      );
    });
  });

  describe('disposal', function() {
    let catActions;

    beforeEach(function() {
      const CatActions = Actions({
        doThis(val) {
          return val;
        },
        mapObs(obs) {
          return obs;
        }
      });
      catActions = CatActions();
    });

    it('should have a dispose method', () => {
      expect(catActions.dispose).to.be.a('function');
    });

    it('should dispose action observables', () => {
      catActions.mapObs.isDisposed.should.be.false;
      catActions.doThis.isDisposed.should.be.false;

      catActions.mapObs.subscribe(() => {});
      catActions.doThis.subscribe(() => {});

      catActions.mapObs.hasObservers().should.be.equal(true);
      catActions.doThis.hasObservers().should.be.equal(true);

      // should dispose all observers
      catActions.dispose();

      catActions.doThis.isDisposed.should.be.true;
      catActions.mapObs.isDisposed.should.be.true;

      // these should be removed in next major version
      // as hasObservers should throw when action is disposed
      catActions.doThis.hasObservers().should.be.equal(false);
      catActions.mapObs.hasObservers().should.be.equal(false);

      expect(() => {
        catActions.doThis({});
      }).to.throw(/object has been disposed/i);

      expect(() => {
        catActions.mapObs(Observable.from([1, 2, 3]));
      }).to.throw(/object has been disposed/i);
    });

    it('individual action should dispose', () => {
      assert(
        typeof catActions.doThis.dispose === 'function',
        'individual action does not have a dispose method'
      );

      catActions.doThis.subscribe(() => {});
      assert(
        catActions.doThis.hasObservers(),
        'action does not any have observers after a subscribe'
      );

      catActions.doThis.dispose();
      assert(
        catActions.doThis.isDisposed,
        'action is not disposed'
      );

      assert(
        !catActions.mapObs.isDisposed,
        'unrelated action is disposed!'
      );

      catActions.dispose();
      assert(
        catActions.mapObs.isDisposed,
        'actions is not disposed'
      );
    });
  });

  describe('error', function() {
    it('should stop action', () => {
      const err = new Error('Catastrophy');
      const CatActions = Actions({
        doThis(val) {
          return val;
        }
      });
      const catActions = CatActions();
      catActions.doThis.subscribe(
        () => { throw new Error('should never be called'); },
        (_err) => expect(_err).to.equal(err)
      );
      catActions.doThis.hasObservers().should.be.true;
      catActions.doThis(Observable.throw(err));

      catActions.doThis(Observable.just('foo'));
      catActions.doThis.hasObservers().should.be.false;
    });
  });

  describe('subscription', function() {

    let spy;
    let catActions;

    beforeEach(function() {
      const CatActions = Actions({
        doThis(val) {
          return val;
        }
      });
      catActions = CatActions();
      spy = sinon.spy();
    });

    it('should return a disposable of subscription', () => {
      let subscription = catActions.doThis.subscribe(spy);
      subscription.should.be.an.instanceOf(Rx.Disposable);
    });

    it('should call observer that isn\'t disposed', function() {
      catActions.doThis.subscribe(spy);
      catActions.doThis(3);
      spy.should.have.been.called;
    });

    it('should not call observer that has been disposed', function() {
      catActions.doThis.subscribe(spy).dispose();
      catActions.doThis(3);
      spy.should.not.have.been.called;
    });
  });

  describe('observers', function() {

    let catActions, disposable;
    beforeEach(function() {
      const CatActions = Actions({
        doThis(val) {
          return val;
        }
      });
      catActions = CatActions();
    });

    it('should return false if the action has no observers', function() {
      catActions.doThis.hasObservers().should.be.false;
    });

    it('should return true if the action as observers', function() {
      catActions.doThis.subscribe(function() {});
      catActions.doThis.hasObservers().should.be.true;
    });

    it('should return false if observers have been disposed of', function() {
      disposable = catActions.doThis.subscribe(function() { });
      disposable.dispose();
      catActions.doThis.hasObservers().should.be.false;
    });
  });
});
