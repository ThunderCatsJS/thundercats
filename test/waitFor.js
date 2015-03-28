/* eslint-disable no-unused-expressions */
var Rx = require('rx');
var chai = require('chai');
var expect = chai.expect;
var waitFor = require('../lib/waitFor');
var sinon = require('sinon');
chai.should();
chai.use(require('sinon-chai'));

describe('waitFor', function() {
  var observable1, observable2;

  beforeEach(function() {
    observable1 = new Rx.BehaviorSubject('jaga');
    observable2 = new Rx.BehaviorSubject('lion-o');
  });

  it('should accept a single observable', function() {
    var waitForObservable = waitFor(observable1);
    waitForObservable.subscribe.should.to.be.a('function');
  });

  it('should accept multiple observables', function() {
    var waitForObservable = waitFor(observable1, observable2);
    waitForObservable.subscribe.should.to.be.a('function');
  });

  it(
    'should accept timeout',
    function() {
      var waitForObservable = waitFor(5000, observable1, observable2);
      waitForObservable.subscribe.should.to.be.a('function');
    }
  );

  it(
    'should not publish until all observables have published a new value',
    function(done) {
      var spy = sinon.spy(function() { done(); });
      var waitForObservable = waitFor(5000, observable1);
      waitForObservable.firstOrDefault().subscribe(spy);
      spy.should.have.not.been.called;
      observable1.onNext();
      spy.should.have.been.calledOnce;
    }
  );

  it(
    'should timeout if not all the observables publish a new value',
    function(done) {
      var spyOnNext = sinon.spy(function() {
        throw new Error('fly you fools');
      });
      var spyOnErr = sinon.spy(function(err) {
        err.should.be.instanceOf(Error);
        spyOnNext.should.not.have.been.called;
        spyOnErr.should.have.been.calledOnce;
        done();
      });
      waitFor(500, observable1, observable2)
        .firstOrDefault()
        .subscribe(spyOnNext, spyOnErr);
        observable1.onNext('shall not pass');
    }
  );

  it(
    'should not publish for observables that have an initial value',
    function(done) {
      var spyOnNext = sinon.spy(function(values) {
        values.should.be.an('array');
        values.join(' ').should.equal('ThunderCats ho!');
        done();
      });
      waitFor(500, observable1, observable2)
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
      var fn = function() {
        waitFor(500, observable1, 'strings are not observable');
      };
      expect(fn).to.throw();
    }
  );
});
