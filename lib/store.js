// # Store
//
// A Thundercats Store is an observable. It can update itself
// according to observables it listens to passed in through
// the `getOperations` method
var Rx = require('rx'),
    uuid = require('node-uuid'),
    /* eslint-disable no-native-reassign */
    Map = require('es6-map'),
    /* eslint-enable no-native-reassign */
    invariant = require('invariant'),
    utils = require('../utils'),
    inherits = utils.inherits,
    isPromise = utils.isPromise,
    isObservable = utils.isObservable,
    areObservable = utils.areObservable;

// ## Create
//
// Takes a spec object and returns an Rx Observable Thundercats store
function Store() {
  Rx.Observable.call(this, this._subscribe);

  this._value = {};
  this._valueSubscription = null;
  this._operationsSubscription = null;
  this._observers = new Map();
  this._history = new Map();
  this._isPending = true;
}

inherits(Store, Rx.Observable);
// ### Has Observers
//
// returns the number of observers watching this store
Store.prototype.hasObservers = function() {
  return !!this._observers.size;
};

Store.prototype.getInitialValue = function() {
  throw new Error('ThunderCats store getInitialValue not implemented');
};

Store.prototype.getOperations = function() {
  throw new Error('ThunderCats Store getOperations not implemented');
};

// ### init
//
// On first subscription, this function is called to set the initial value
// of the store. The `getInitialValue` method can return a promise,
// observable or a plain JavaScript object.
Store.prototype._init = function() {
  var initialValue = this.getInitialValue();
  if (isPromise(initialValue)) {
    initialValue.then(
      this._setValue.bind(this),
      this._notifyObservers.bind(this)
    );
  } else if (isObservable(initialValue)) {
    this._valueSubscription =
      initialValue.subscribe(
        this._setValue.bind(this),
        this._notifyObservers.bind(this)
      );
  } else {
    this._setValue(initialValue);
  }
};

// ### Set Value
//
// overrides the current value held by the store
Store.prototype._setValue = function(val) {
  this._value = val;
  this._isPending = false;
  this._initOperations();
  this._notifyObservers();
};

// ### NotifyObservers
//
// sends the current value held by the store to its observers
Store.prototype._notifyObservers = function(error) {
  this._observers.forEach(function(observer) {
    if (error) {
      return observer.onError(error);
    }
    observer.onNext(this._value);
  }, this);
};

// ### initOperations
//
// gets the observable passed in through getOperations and subscribes the
// store to it's changes
Store.prototype._initOperations = function() {
  this._disposeOperations();

  if (this.getOperations) {
    var operations = this.getOperations();

    invariant(
      areObservable(operations) ||
        isObservable(operations),
      '"%s.getObservable" should return an Rx.Observable or an array of ' +
      'Rx.Observables, given : %s',
      'ThunderCats Store',
      operations
    );

    if (areObservable(operations)) {
      operations = Rx.Observable.merge(operations);
    }

    this._operationsSubscription =
      operations.subscribe(
        this._opsOnNext.bind(this),
        this.opsOnError.bind(this),
        this.opsOnCompleted.bind(this)
    );
  }
};

// ### applyOperation
//
// If an operation returns a proper object, this method is called.
// It checks to see if a property `value` exists and returns that, else
// it applies the `transform` method of the operation on the current value
// held by the store.
//
// NOTE: If `value` property is supplied, then the `transform` method is
// simply ignored
Store.prototype._applyOperation = function(value, operation) {
  return 'value' in operation ?
    operation.value :
    operation.transform(value);
};

// ### Operation Observer
//
// This is the observer that observes the stores operation observable
// operations must return an object with at least the property `value`
// or a method `transform`. It may also have the additional property `confirm`
// which must be a promise. This is used to undo the value held by the store
Store.prototype._opsOnNext = function(operation) {
  invariant(
    operation && typeof operation === 'object',
    'invalid operation, operations should be an object, given : %s', operation
  );

  invariant(
    operation.value ||
    (
      operation.transform &&
      typeof operation.transform === 'function'
    ),
    'invalid operation, ' +
    'operations should have a value or a transform property'
  );

  var oldValue = this._value;
  this._value = this._applyOperation(this._value, operation);
  this._notifyObservers();

  var uid = uuid.v1();

  this._history.set(uid, {
    operation: operation,
    oldValue: oldValue
  });

  if ('confirm' in operation) {
    invariant(
      isPromise(operation.confirm),
      'invalid operation, confirm should be a promise, given : %s',
      operation.confirm
    );

    operation.confirm.then(
      function () {
        this._confirmOperation(uid);
      }.bind(this),
      function () {
        this._cancelOperation(uid);
      }.bind(this)
    );

  } else {
    this._confirmOperation(uid);
  }
};

Store.prototype.opsOnError = function(err) {
  throw new Error('An error has occurred in the operations observer: ' + err);
};

Store.prototype.opsOnCompleted = function() {
  console.warn('operations observable has terminated without error');
};

// ### Confirm Operation
//
// This method activates when the promise tied to an operation is resolved.
Store.prototype._confirmOperation = function(uid) {
  this._checkId(uid);
  this._history.get(uid).confirmed = true;
  this._history.forEach(function(operation, uid) {
    /* istanbul ignore else */
    if (operation.confirmed) {
      this._history.delete(uid);
    }
  }, this);
};

// ### Cancel Operations
//
// If the promise in `confirm` is rejected, this method reverts the changes
// made by the operation tied to this promise.
Store.prototype._cancelOperation = function(uid) {
  this._checkId(uid);
  var _history = this._history;
  // initial value
  var value = _history.get(uid).oldValue;
  var found = false;
  _history.forEach(function(descriptor, _uid) {
    if (uid === _uid) {
      found = true;
      return;
    }
    if (!found) {
      return;
    }
    descriptor.oldValue = value;
    value = this._applyOperation(value, descriptor.operation);
  }, this);

  this._value = value;
  _history.delete(uid);
  this._notifyObservers();
};

Store.prototype._checkId = function(id) {
  invariant(
    this._history.has(id),
    'an unknown operation id was used that is not within its history.' +
    'it may have been called outside of context'
  );
};

// ### dispose
//
// Disposes the subscription to initial value observable if any
// and calls `disposeOperations`
Store.prototype._dispose = function() {
  /* istanbul ignore else */
  if (this._valueSubscription) {
    this._valueSubscription.dispose();
  }
  this._disposeOperations();
  this._value = null;
  this._valueSubscription = null;
  this._isPending = true;
};

// ### disposeOperations
//
// Disposes all the stores current subscriptions
// and clear operations history
Store.prototype._disposeOperations = function() {
  if (this._operationsSubscription) {
    this._operationsSubscription.dispose();
  }

  this._operationsSubscription = null;
  this._history.clear();
};

// ### Subscribe
//
// This is the main entry for observers of this **ThunderCats** Store
// This method will track all observers and initiate the store.
Store.prototype._subscribe = function(observer) {

  var uid = uuid.v1();

  /* istanbul ignore else */
  if (!this.hasObservers()) {
    this._init();
  }

  this._observers.set(uid, observer);

  if (!this._isPending) {
    observer.onNext(this._value);
  }

  return Rx.Disposable.create(function () {
    this._observers.delete(uid);
    /* istanbul ignore else */
    if (!this.hasObservers()) {
      this._dispose();
    }
  }.bind(this));
};

Store.create = function(spec) {
  var name = spec && typeof spec.name === 'string' ? spec.name : 'Betty';

  invariant(
    spec && typeof spec === 'object',
    'ThunderCats Store %s expects an object as argument, given %s',
    name,
    spec
  );

  invariant(
    spec.getInitialValue && typeof spec.getInitialValue === 'function',
    'ThunderCats Store %s: getInitialValue should be a function given %s',
    name,
    spec.getInitialValue
  );

  invariant(
    !spec.getOperations || typeof spec.getOperations === 'function',
    'ThunderCats Store %s: getOperations should be a function given %s',
    name,
    spec.getOperations
  );

  function ThunderCatsStore() {
    Store.call(this);
  }

  inherits(ThunderCatsStore, Store);

  var getInitialValue = spec.getInitialValue;
  var getOperations = spec.getOperations ? spec.getOperations : null;

  ThunderCatsStore.prototype.name = name;
  ThunderCatsStore.prototype.getInitialValue = getInitialValue;
  ThunderCatsStore.prototype.getOperations = getOperations;

  return new ThunderCatsStore();
};

module.exports = Store;
