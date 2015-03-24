// # Store
//
// A ThunderCats Store is an observable. It can update itself
// according to observables it listens to passed in through
// the `getOperations` method
var Rx = require('rx'),
    debug = require('debug')('cats:store'),
    uuid = require('node-uuid'),
    utils = require('../utils'),
    invariant = require('invariant'),
    isPromise = utils.isPromise,
    isObservable = utils.isObservable,
    areObservable = utils.areObservable;

// ## Create
//
// Takes a spec object and returns an Rx Observable ThunderCats store
class Store extends Rx.Observable {
  constructor(name='Betty', initialValue, operations) {
    /* eslint-disable block-scoped-var */
    super(this._subscribe);
    /* eslint-enable block-scoped-var */

    this.name = name;
    // test initial value
    this._initialValue = initialValue;
    this._value = {};
    this._valueSubscription = null;
    // test operations
    this._operations = operations;
    this._operationsSubscription = null;

    this._observers = new Map();
    this._history = new Map();
    this._isPending = false;

  }

  static create(spec) {
    if (!spec.name) {
      debug('All anon stores shall be known as Betty');
    }

    var name = typeof spec.name === 'string' ? spec.name : 'Betty';

    invariant(
      spec && typeof spec === 'object',
      'ThunderCats Store %s expects an object as argument, given : %s',
      name,
      spec
    );

    invariant(
      spec.getInitialValue && typeof spec.getInitialValue === 'function',
      'ThunderCats Store %s: getInitialValue should be a function given : %s',
      name,
      spec.getInitialValue
    );

    invariant(
      !spec.getOperations || typeof spec.getOperations === 'function',
      'ThunderCats Store %s: getOperations should be a function given : %s',
      name,
      spec.getOperations
    );

    var initialValue = spec.getInitialValue();
    var operations = spec.getOperations();

    return new Store(name, initialValue, operations);
  }

  // ### Has Observers
  //
  // returns the number of observers watching this store
  hasObservers() {
    return !!this._observers.size();
  }

  // ### init
  //
  // On first subscription, this function is called to set the initial value
  // of the store. The `getInitialValue` method can return a promise,
  // observable or a plain JavaScript object.
  _init() {
    var initialValue = this._initialValue;
    if (isPromise(initialValue)) {
      initialValue.then(this._setValue, this._notifyObservers);
    } else if (isObservable(initialValue)) {
      this._valueSubscription =
        initialValue.subscribe(this._setValue, this._notifyObservers);
    } else {
      this._setValue(initialValue);
    }
  }

  // ### Set Value
  //
  // overrides the current value held by the store
  _setValue(val) {
    this._value = val;
    this._isPending = false;
    this._initOperations();
    this._notifyObservers();
  }

  // ### NotifyObservers
  //
  // sends the current value held by the store to its observers
  _notifyObservers(error) {
    this._observers.forEach(function(uid, observer) {
      if (error) {
        return observer.onError(error);
      }
      observer.onNext(this._value);
    });
  }

  // ### initOperations
  //
  // gets the observable passed in through getOperations and subscribes the
  // store to it's changes
  _initOperations() {
    this._disposeOperations();

    if (this._operations) {
      var operations = this._operations;

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
        operations.subscribe(this._operationObserver);
    }
  }

  // ### applyOperation
  //
  // If an operation returns a proper object, this method is called.
  // It checks to see if a property `value` exists and returns that, else
  // it applies the `transform` method of the operation on the current value
  // held by the store.
  //
  // NOTE: If `value` property is supplied, then the `transform` method is
  // simply ignored
  _applyOperation(value, operation) {
    return 'value' in operation ?
      operation.value :
      operation.transform(value);
  }

  // ### Operation Observer
  //
  // This is the observer that observes the stores operation observable
  // operations must return an object with at least the property `value`
  // or a method `transform`. It may also have the additional property `confirm`
  // which must be a promise. This is used to undo the value held by the store
  _operationObserver(operation) {
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

      operation.confirm.then(function () {
        this._confirmOperation(uid);
      }, function () {
        this._cancelOperation(uid);
      });

    } else {
      this._confirmOperation(uid);
    }
  }

  // ### Confirm Operation
  //
  // This method activates when the promise tied to an operation is resolved.
  _confirmOperation(uid) {
    if (!this._history.has(uid)) {
      return;
    }
    history.get(uid).confirmed = true;
    this._history.forEach(function(uid, operation) {
      if (operation.confirmed) {
        history.delete(uid);
      }
    });
  }

  // ### Cancel Operations
  //
  // If the promise in `confirm` is rejected, this method reverts the changes
  // made by the operation tied to this promise.
  _cancelOperation(uid) {
    var history = this._history;
    if (!history.has(uid)) {
      return;
    }

    var oldValue = history.get(uid).oldValue;
    var operationsStack = history.keys();
    var index = operationsStack.indexOf(uid);

    this._value = operationsStack.slice(index + 1).reduce(function(value, uid) {
      var descriptor = history.get(uid);
      descriptor.oldValue = value;
      return this._applyOperation(value, descriptor.operation);
    }, oldValue);

    history.delete(uid);
    this._notifyObservers();
  }

  // ### dispose
  //
  // Disposes the subscription to initial value observable if any
  // and calls `disposeOperations`
  _dispose() {
    if (this._valueSubscription) {
      this._valueSubscription.dispose();
    }
    this._disposeOperations();
    this._value = null;
    this._valueSubscription = null;
    this._isPending = true;
  }

  // ### disposeOperations
  //
  // Disposes all the stores current subscriptions
  // and clear operations history
  _disposeOperations() {
    if (this._operationsSubscription) {
      this._operationsSubscription.dispose();
    }

    this._operationsSubscription = null;
    this._history.clear();
  }

  // ### Subscribe
  //
  // This is the main entry for observers of this **ThunderCats** Store
  // This method will track all observers and initiate the store.
  _subscribe(observer) {

    var uid = uuid.v1();

    if (!this.hasObservers()) {
      this._init();
    }

    this._observers.get(uid, observer);

    if (!this._isPending) {
      observer.onNext(this._value);
    }

    return Rx.Disposable.create(function () {
      this._observers.get(uid);
      if (!this.hasObservers()) {
        this._dispose();
      }
    });
  }
}

module.exports = Store;
