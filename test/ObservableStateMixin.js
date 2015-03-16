/* eslint-disable no-unused-expressions */
// var Rx = require('rx');
var chai = require('chai');
// var expect = chai.expect;
// var ObservableStateMixin = require('../').ObservableStateMixin;
// var sinon = require('sinon');
chai.should();
chai.use(require('sinon-chai'));

describe('Observable State Mixin', function() {

  describe('getObservable', function() {
    it('should throw an error if `getObservable` is not defined');
    it('should throw an error if `getObservable` is not a function');
    it('should throw if `getObservable` does not return an observable');
    it(
      'should throw if `getObservable` does not return an array of observables'
    );
    it('should throw if observable state does returns not object or null');
  });

  describe('initial state', function() {
    it('should update initial state value of component');
    it('should not subscribe to observer');
  });
  describe('subscription', function() {
    it('should subscribe to observable state');
    it('should merge new values of observable with component');
  });

  describe('unsubscribe', function() {
    it('should dispose subscriptions on component unmount');
  });

  describe('dispose all', function() {
    it('should add static method to component');
    // this should test disposal of subscription on multiple components
    // using the observable state mixin
    it('should remove dispose all subscriptions when called');
  });
});
