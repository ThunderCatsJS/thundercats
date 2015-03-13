// # Store
//
// A ThunderCats Store is an observable. It can update itself
// according to observables it listens to passed in through
// the `getOperations` method

var Rx = require('rx');
var uuid = require('node-uuid');
var utils = require('../utils');
var invariant = utils.invariant;
var isPromise = utils.isPromise;
var isObservable = utils.isObservable;

// ## Create
//
// Takes a spec object and returns an Rx Observable ThunderCats store
function create(spec) {
  invariant(
    spec && typeof spec === 'object',
    'Store.create(...): expect an object as argument, given : %s', spec
  );

  invariant(
    spec.getInitialValue && typeof spec.getInitialValue === 'function',
    'Store.create(...): getInitialValue should be a function given : %s',
    spec.getInitialValue
  );

  invariant(
    !spec.getOperations || typeof spec.getOperations === 'function',
    'Store.create(...): getOperations should be a function given : %s',
    spec.getOperations
  );

  var getInitialValue = spec.getInitialValue;
  var getOperations = spec.getOperations;

  var value = null;
  var observers = Object.create(null);
  var operationsMap = Object.create(null);
  var operationsStack = [];
  var valueSubscription = null;
  var operationSubscription = null;
  var isPending = true;

  // ### Has Observers
  // *internal method*
  //
  // returns the number of observers watching this store
  function hasObservers() {
    return !!Object.keys(observers).length;
  }

  // ### NotifyObservers
  // *internal method*
  //
  // sends the current value held by the store to its observers
  function notifyObservers(error) {
    Object.keys(observers).forEach(function (uid) {
      if (error) {
        return observers[uid].onError(error);
      } else {
        observers[uid].onNext(value);
      }
    });
  }

  // ### init
  // *internal method*
  //
  // On first subscription, this function is called to set the initial value
  // of the store. The `getInitialValue` method can return a promise,
  // observable or a plain JavaScript object.
  function init() {
    var initialValue = getInitialValue();
    if (isPromise(initialValue)) {
      initialValue.then(setValue, notifyObservers);
    } else if (isObservable(initialValue)) {
      valueSubscription = initialValue.subscribe(setValue, notifyObservers);
    } else {
      setValue(initialValue);
    }
  }

  // ### setValue
  // *internal method*
  //
  // overrides the current value held by the store
  function setValue(val) {
    value = val;
    isPending = false;
    initOperations();
    notifyObservers();
  }

  // ### disposeOperations
  // *internal method*
  //
  // Disposes all the stores current subscriptions
  function disposeOperations() {
    if (operationSubscription) {
      operationSubscription.dispose();
    }

    operationSubscription = null;
    operationsMap = Object.create(null);
    operationsStack = [];
  }

  // ### initOperations
  // *internal method*
  //
  // gets the observable passed in through getOperations and subscribes the
  // store to it's changes
  function initOperations() {
    disposeOperations();

    if (getOperations) {
      var operations = getOperations();
      if (!isObservable(operations)) {
        throw new TypeError(
          'getOperations(): should return an observable, given : ' + operations
        );
      }
      operationSubscription = operations.subscribe(operationObserver);
    }
  }

  // ### dispose
  // *internal method*
  //
  // Disposes the subscription to initial value observable if any
  // and calls `disposeOperations`
  function dispose() {
    if (valueSubscription) {
      valueSubscription.dispose();
    }
    disposeOperations();
    value = null;
    valueSubscription = null;
    isPending = true;
  }

  // ### operationObserver
  // *internal method*
  //
  // This is the observer that observes the stores operation observable
  // operations must return an object with at least the property `value`
  // or a method `transform`. It may also have the additional property `confirm`
  // which must be a promise. This is used to undo the value held by the store
  function operationObserver(operation) {
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

    var oldValue = value;
    value = applyOperation(value, operation);
    notifyObservers();

    var uid = uuid.v1();
    operationsMap[uid] = {
      operation: operation,
      oldValue: oldValue
    };
    operationsStack.push(uid);

    if ('confirm' in operation) {
      invariant(
        isPromise(operation.confirm),
        'invalid operation, confirm should be a promise, given : %s',
        operation.confirm
      );

      operation.confirm.then(function () {
        confirmOperation(uid);
      }, function () {
        cancelOperation(uid);
      });
    } else {
      confirmOperation(uid);
    }
  }

  // ### Cancel Operations
  // *internal method*
  //
  // If thie promise in `confirm` is rejected, this method reverts the changes
  // made by the operation tied to this promise.
  function cancelOperation(uid) {
    if (!operationsMap[uid]) {
        return;
    }

    var oldValue = operationsMap[uid].oldValue;
    var index = operationsStack.indexOf(uid);

    value = operationsStack.slice(index + 1).reduce(function (value, uid) {
        var descriptor = operationsMap[uid];
        descriptor.oldValue = value;
        return applyOperation(value, descriptor.operation);
    }, oldValue);

    operationsStack.splice(index, 1);
    delete operationsMap[uid];
    notifyObservers();
  }

  // ### Confirm Operation
  // *internal method*
  //
  // This method activates when the promise tied to an operation is resolved.
  function confirmOperation(uid) {
    if (!operationsMap[uid]) {
        return;
    }
    operationsMap[uid].confirmed = true;
    var lastIndex = -1;
    operationsStack.every(function (uid, index) {
        if (operationsMap[uid].confirmed) {
            delete operationsMap[uid];
            lastIndex = index;
            return true;
        }
    });

    operationsStack = operationsStack.slice(lastIndex + 1);
  }

  // ### applyOperation
  // *internal method*
  //
  // If an operation returns a proper object, this method is called.
  // It checks to see if a property `value` exists and returns that, else
  // it applies the `transform` method of the operation on the current value
  // held by the store.
  //
  // NOTE: If `value` property is supplied, then the `transform` method is
  // simply ignored
  function applyOperation(value, operation) {
    return 'value' in operation ?
      operation.value :
      operation.transform(value);
  }

  // ### Subscribe
  //
  // This is the main entry for observers of this **ThunderCats** Store
  // This method will track all observers and initiate the store.
  function subscribe(observer) {

    var uid = uuid.v1();

    if (!hasObservers()) {
      init();
    }

    observers[uid] = observer;

    if (!isPending) {
      observer.onNext(value);
    }

    return Rx.Disposable.create(function () {
      delete observers[uid];
      if (!hasObservers()) {
        dispose();
      }
    });
  }

  return Rx.Observable.create(subscribe);
}

module.exports = {
  create: create
};
