// # Observable State Mixin
//
// For your components

var Rx = require('rx'),
    utils = require('../utils'),
    invariant = require('invariant'),
    isObservable = utils.isObservable,
    areObservable = utils.areObservable,
    stateSubscriptions = [];

var ObservableStateMixin = {

  statics: {
    // Allows subscriptions for all components using this mixin
    // to be disposed using MyComponent.disposeAllSubscriptions().
    disposeAllSubscriptions: disposeAllSubscriptions
  },

  getInitialState: function () {
    var displayName =
      this.constructor.displayName || this.constructor.name || '';

    invariant(
      typeof this.getObservable === 'function',
      '%s should provide "getObservable" function',
      displayName
    );

    this._observableState = this.getObservable(this.props);

    invariant(
      areObservable(this._observableState) ||
        isObservable(this._observableState),
      '"%s.getObservable" should return an Rx.Observable or an array of ' +
        'Rx.Observables, given : %s',
      displayName,
      this._observableState
    );

    // getObservable can return an array of observables
    // ThunderCats will use Rx.Observable.merge to create a single
    // stream of data
    if (areObservable(this._observableState)) {
      this._observableState = Rx.Observable.merge(this._observableState);
    }

    var initialState = null;

    // In getInitialState we only want to get the initial value without
    // subscribing, So we use the first filter here.
    // You cannot use async observable here with server-side rendering as
    // the subscription will hang around after the component has rendered with
    // initial state of null;
    this._observableState.first().subscribe(function (val) {
      invariant(
        typeof val === 'object',
        'The observable returned by \'%s.getObservable\' should publish ' +
          'objects or null given : %s',
        displayName,
        val
      );
      initialState = val;
    });

    return initialState;
  },

  componentDidMount: function() {
    // Now that the component has mounted, we will use a long lived
    // the subscription
    this._stateSubscription =
      this._observableState.subscribe(this._stateObserver);

    // we save all disposable subscriptions to an array so that they can
    // be disposed of using MyComp.disposeAllSubscriptions()
    stateSubscriptions.push(this._stateSubscription);
  },

  componentWillUnmount: function () {
    // On unmount, the subscription to the observable state is disposed
    // and removed from the global subscription array
    this._stateSubscription.dispose();
    var index = stateSubscriptions.indexOf(this._stateSubscription);
    stateSubscriptions.splice(index, 1);
  },

  // This is the observer that will watch the observable state.
  // TODO: make this into a proper Rx.Observable
  _stateObserver: function (val) {
    var displayName =
      this.constructor.displayName || this.constructor.name || '';

    invariant(
      typeof val === 'object',
      'The observable returned by \'%s.getObservable\' should publish ' +
      'Objects or null given : %s',
      displayName,
      val
    );

    this.setState(val);
  }
};

// Dispose of all the subscriptions created by this mixin.
function disposeAllSubscriptions() {
  stateSubscriptions.forEach(function(subscription) {
    subscription.dispose();
  });
  stateSubscriptions = [];
}

module.exports = ObservableStateMixin;

// Original source from https://github.com/fdecampredon/rx-react
