/* eslint-disable no-unused-expressions */
import Rx from 'rx';
import stampit from 'stampit';
import chai, { expect } from 'chai';
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
        }
      })
        .refs({ displayName: 'catActions' });
      catActions = CatActions();
    });
    it('should add displayName as property, not observable', () => {
      catActions.displayName.should.equal('catActions');
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

    it('should call onError when map throws', function(done) {
      catActions.errorMap.subscribe(
        () => {},
        err => {
          expect(err).to.be.an.instanceOf(Error);
          done();
        },
        done
      );
      catActions.errorMap();
    });
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

  describe('disposal', function() {

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
