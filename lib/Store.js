// # Store
//
// A Thundercats Store is an observable. It can update itself
// according to observables it listens to passed in through
// the `getOperations` method
const Rx = require('rx'),
    uuid = require('node-uuid'),
    invariant = require('invariant'),
    warning = require('warning'),
    {
      areObservable,
      isAction,
      isObservable,
      isPromise
    } = require('../utils');

// ## Create
//
// Takes a spec object and returns an Rx Observable Thundercats store
class Store extends Rx.Observable {

  constructor(initialValue) {
    Rx.Observable.call(this, this._subscribe);

    this.__value = initialValue || {};
    this._operationsSubscription = null;
    this._actions = new Map();
    this._observers = new Map();
    this._history = new Map();
  }

  registerAction(action) {
    invariant(
      typeof action === 'function' &&
      isObservable(action),
      '%s attempted to register non ThunderCats action',
      this.displayName
    );

    warning(
      !this._actions.has(action.displayName),
      '%s attempted to register an action that already exists',
      this.displayName
    );

    this._actions.set(action.displayName, action);
  }

  registerActions(Actions) {
    invariant(
      isAction(Actions),
      '%s attempted to add an Actions object that is not a ThunderCats Action',
      this.displayName
    );
    let actionNames = Actions.__getActionNames();
    actionNames.map(actionName => {
      this.registerAction(Actions[actionName]);
    });
  }

  // ### Has Observers
  //
  // returns the number of observers watching this store
  hasObservers() {
    return !!this._observers.size;
  }

  // ### Set Value
  //
  // overrides the current value held by the store
  _init() {
    this._initOperations();
    this._notifyObservers();
  }

  _initOperations() {
    this._disposeOperations();

    invariant(
      this._actions.length,
      'Store must have at least on action to listen to but has %s',
      this._actions.length
    );

    let operations = [];

    this._actions.forEach(val => {
      operations.push(val);
    });

    invariant(
      areObservable(operations),
      '"%s" actions should be an array of observables',
      this.displayName
    );

    operations = Rx.Observable.merge(operations);

    this._operationsSubscription =
      operations.subscribe(
        this._opsOnNext.bind(this),
        this.opsOnError.bind(this),
        this.opsOnCompleted.bind(this)
    );
  }

  // ### NotifyObservers
  //
  // sends the current value held by the store to its observers
  _notifyObservers(error) {
    this._observers.forEach((observer) => {
      if (error) {
        return observer.onError(error);
      }
      observer.onNext(this.__value);
    });
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
  _opsOnNext(operation) {
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

    let oldValue = this.__value;
    this.__value = this._applyOperation(this.__value, operation);
    this._notifyObservers();

    let uid = uuid.v1();

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

      operation.confirm.then(() => {
        this._confirmOperation(uid);
      }, () => {
        this._cancelOperation(uid);
      });

    } else {
      this._confirmOperation(uid);
    }
  }

  opsOnError(err) {
    throw new Error('An error has occurred in the operations observer: ' + err);
  }

  opsOnCompleted() {
    console.warn('operations observable has terminated without error');
  }

  // ### Confirm Operation
  //
  // This method activates when the promise tied to an operation is resolved.
  _confirmOperation(uid) {
    this._checkId(uid);
    this._history.get(uid).confirmed = true;
    this._history.forEach((operation, uid) => {
      /* istanbul ignore else */
      if (operation.confirmed) {
        this._history.delete(uid);
      }
    });
  }

  // ### Cancel Operations
  //
  // If the promise in `confirm` is rejected, this method reverts the changes
  // made by the operation tied to this promise.
  _cancelOperation(uid) {
    this._checkId(uid);
    let _history = this._history;
    // initial value
    let value = _history.get(uid).oldValue;
    let found = false;
    _history.forEach((descriptor, _uid) => {
      if (uid === _uid) {
        found = true;
        return;
      }
      if (!found) {
        return;
      }
      descriptor.oldValue = value;
      value = this._applyOperation(value, descriptor.operation);
    });

    this.__value = value;
    _history.delete(uid);
    this._notifyObservers();
  }

  _checkId(id) {
    invariant(
      this._history.has(id),
      'an unknown operation id was used that is not within its history.' +
      'it may have been called outside of context'
    );
  }

  // ### dispose
  //
  // Disposes the subscription to initial value observable if any
  // and calls `disposeOperations`
  _dispose() {
    this._disposeOperations();
    this.__value = null;
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

    let uid = uuid.v1();

    /* istanbul ignore else */
    if (!this.hasObservers()) {
      this._init();
    }

    this._observers.set(uid, observer);

    observer.onNext(this.__value);

    return Rx.Disposable.create(() => {
      this._observers.delete(uid);
      /* istanbul ignore else */
      if (!this.hasObservers()) {
        this._dispose();
      }
    });
  }

  serialize() {
    return JSON.stringify(this.__value);
  }

  deserialize(stringyData) {
    let data = JSON.parse(stringyData);
    invariant(
      typeof data === 'object',
      '%s deserialize must return an object or null but got: %s',
      this.displayName,
      data
    );
    this.__value = data;
  }

  __getValue() {
    return this.__value;
  }
}

// TODO: fix this when es class properties is stage 2
Store.prototype.displayName = 'BaseStore';

module.exports = Store;
