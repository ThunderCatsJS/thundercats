/* eslint-disable no-unused-expressions */
// make sure window and document is added before any test is run
import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import chaiAsPromised from 'chai-as-promised';

/* eslint-disable no-unused-vars */
import utils from './utils';
/* eslint-enable no-unused-vars */

const expect = chai.expect;
const Rx = require('rx');
const Actions = require('../').Actions;

chai.should();
chai.use(chaiAsPromised);
chai.use(sinonChai);

describe('Actions', function() {
  describe('Class', function() {
    let catActions;

    beforeEach(function() {
      class CatActions extends Actions {
        constructor() {
          super([
            'shortCut'
          ]);
        }

        getInBox(value) {
          return {
            author: value,
            result: 'disobey'
          };
        }
        passThrough(value) {
          return value;
        }
        errorMap() {
          throw new Error('test');
        }
      }
      catActions = new CatActions();
    });

    it('should be extend-able', function() {
      catActions.should.be.an.instanceOf(Actions);
      catActions.getInBox.should.exist;
    });

    it('should produce observables for defined methods', function() {
      catActions.getInBox.subscribe.should.be.a('function');
    });

    it(
      'should produce observables for array of strings passed to super',
      function() {
        catActions.shortCut.subscribe.should.be.a('function');
      }
    );

    it('should respect original map function', function() {
      catActions.getInBox.subscribe(function(value) {
        value.should.be.an('object');
        value.author.should.equal('human');
        value.result.should.equal('disobey');
      });
      catActions.getInBox('human');
    });

    it(
      'should notify passed value to subscribed observer when called',
      function(done) {
        catActions.passThrough.first().subscribe(function (val) {
          val.should.equal(3);
          done();
        });
        catActions.passThrough(3);
      }
    );

    it(
      'should throw an error when an error is thrown in the map',
      function() {
        expect(function() {
          catActions.errorMap();
        }).to.throw();
      }
    );
  });

  describe('waitFor', function() {
    let catActions, observable1, observable2;

    beforeEach(function() {
      class CatActions extends Actions {
        constructor() {
          super();
        }
        tryWaitFor(val) {
          return val;
        }
      }
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
          waitForObservable.firstOrDefault().subscribe(spy);
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
      class CatActions extends Actions {
        constructor() {
          super();
        }
        doThis(val) {
          return val;
        }
      }
      catActions = new CatActions();
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
      class CatActions extends Actions {
        constructor() {
          super();
        }
        doThis(val) {
          return val;
        }
      }
      catActions = new CatActions();
    });

    it('should return false if the action has no observers', function() {
      catActions.doThis.hasObservers().should.be.false;
    });

    it('should return true if the action as observers', function() {
      catActions.doThis.subscribe(function () {});
      catActions.doThis.hasObservers().should.be.true;
    });

    it('should return false if observers have been disposed of', function() {
      disposable = catActions.doThis.subscribe(function() { });
      disposable.dispose();
      catActions.doThis.hasObservers().should.be.false;
    });
  });
});
