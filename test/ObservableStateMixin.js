var Rx = require('rx'),
    chai = require('chai'),
    utils = require('./utils'),
    expect = chai.expect,
    ObservableStateMixin = require('../').ObservableStateMixin;

chai.should();
chai.use(require('sinon-chai'));

// var sinon = require('sinon');

describe('Observable State Mixin', function() {

  describe('getObservable', function() {

    it('should throw an error if `getObservable` is not defined', function() {
      expect(utils.createRenderSpecFunc({
        displayName: 'monkey',
        mixins: [ObservableStateMixin],
        getNOTObservable: function() {
          return Rx.Observable.empty();
        },
        render: function() {
          return null;
        }
      })).to.throw(/should provide "getObservable" function/);
    });

    it(
      'should throw an error if `getObservable` is not a function',
      function() {
        expect(utils.createRenderSpecFunc({
          displayName: 'monkey',
          mixins: [ObservableStateMixin],
          getObservable: 'island',
          render: function() {
            return null;
          }
        })).to.throw(/should provide "getObservable" function/);
      }
    );
    it(
      'should throw if `getObservable` does not return an observable',
      function() {
        expect(utils.createRenderSpecFunc({
          displayName: 'monkey',
          mixins: [ObservableStateMixin],
          getObservable: function() {
            return 'island';
          },
          render: function() {
            return null;
          }
        })).to.throw(/should return an Rx.Observable/);
      }
    );
    it(
      'should throw if `getObservable` does not return an array of observables',
      function() {
        expect(utils.createRenderSpecFunc({
          displayName: 'monkey',
          mixins: [ObservableStateMixin],
          getObservable: function() {
            return [
              Rx.Observable.from({}),
              'island'
            ];
          },
          render: function() {
            return null;
          }
        }))
          .to
          .throw(
            /should return an Rx.Observable or an array of Rx.Observables/
          );
      }
    );

    it(
      'should throw if observable state does returns not object or null',
      function() {
        expect(utils.createRenderSpecFunc({
          displayName: 'monkey',
          mixins: [ObservableStateMixin],
          getObservable: function() {
            return Rx.Observable.from([5, 2]);
          },
          render: function() {
            return null;
          }
        }))
          .to
          .throw(/should publish objects or null/);
      }
    );
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
