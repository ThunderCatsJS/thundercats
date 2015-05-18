/* eslint-disable no-unused-expressions */
import Rx from 'rx';
import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';

import { waitFor } from '../lib';

const expect = chai.expect;

chai.should();
chai.use(sinonChai);

describe('waitFor', function() {
  let observable1, observable2;

  beforeEach(function() {
    observable1 = new Rx.BehaviorSubject('jaga');
    observable2 = new Rx.BehaviorSubject('lion-o');
  });

  it('should return an observable', () => {
    let waitForObservable = waitFor(observable1);
    expect(waitForObservable).to.exist;
    waitForObservable.subscribe.should.be.a('function');
  });

  describe('observable', () => {
    it('should accept a single observable', function(done) {
      let waitForObservable = waitFor(observable1);
      waitForObservable.subscribe.should.be.a('function');
      waitForObservable.subscribe(function() {
        done();
      });
      observable1.onNext();
    });

    it('should accept multiple observables', function(done) {
      let waitForObservable = waitFor(observable1, observable2);
      waitForObservable.subscribe.should.be.a('function');
      waitForObservable.subscribe(function() {
        done();
      });
      observable1.onNext();
      observable2.onNext();
    });

    it(
      'should not publish until all observables have published a new value',
      function(done) {
        let spy = sinon.spy(function() { done(); });
        let waitForObservable = waitFor(observable1);
        waitForObservable.firstOrDefault().subscribe(spy);
        spy.should.have.not.been.called;
        observable1.onNext();
        spy.should.have.been.calledOnce;
      }
    );

    it(
      'should not publish for observables that have an initial value',
      function(done) {
        let spyOnNext = sinon.spy(function(values) {
          values.should.be.an('array');
          values.join(' ').should.equal('ThunderCats ho!');
          done();
        });
        waitFor(observable1, observable2)
          .firstOrDefault()
          .subscribe(spyOnNext);
        spyOnNext.should.not.have.been.called;
        observable1.onNext('ThunderCats');
        spyOnNext.should.not.have.been.called;
        observable2.onNext('ho!');
      }
    );

    it(
      'should throw if given non observable argument',
      function() {
        let waitForObserable =
          waitFor(observable1, 'strings are not observable');
        waitForObserable.subscribeOnError((err) => {
          expect(err).to.exist;
          err.should.be.an.instanceOf(Error);
        });
      }
    );
  });
});
