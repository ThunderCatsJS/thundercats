'use strict';

var _classCallCheck = function (instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } };

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(object, property, receiver) { var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

var _inherits = function (subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; };

// # Store
//
// A Thundercats Store is an observable. It can update itself
// according to observables it listens to passed in through
// the `getOperations` method
var Rx = require('rx');
var uuid = require('node-uuid');
var invariant = require('invariant');
var warning = require('warning');
var _require = require('../utils');

var areObservable = _require.areObservable;
var isAction = _require.isAction;
var isObservable = _require.isObservable;
var isPromise = _require.isPromise;

// ## Create
//
// Takes a spec object and returns an Rx Observable Thundercats store

var Store = (function (_Rx$Observable) {
  function Store(initialValue) {
    _classCallCheck(this, Store);

    // bug in eslint not recognizing super
    /*eslint-disable block-scoped-var */
    _get(Object.getPrototypeOf(Store.prototype), 'constructor', this).call(this, this._subscribe);
    /*eslint-enable block-scoped-var */

    this.__value = initialValue || {};
    this._operationsSubscription = null;
    this._actions = new Map();
    this._observers = new Map();
    this._history = new Map();
  }

  _inherits(Store, _Rx$Observable);

  _createClass(Store, [{
    key: 'registerAction',
    value: function registerAction(action) {
      invariant(typeof action === 'function' && isObservable(action), '%s attempted to register non ThunderCats action', this.displayName);

      warning(!this._actions.has(action.displayName), '%s attempted to register an action that already exists', this.displayName);

      this._actions.set(action.displayName, action);
    }
  }, {
    key: 'registerActions',
    value: function registerActions(Actions) {
      var _this = this;

      invariant(isAction(Actions), '%s attempted to add an Actions object that is not a ThunderCats Action', this.displayName);
      var actionNames = Actions.__getActionNames();
      actionNames.map(function (actionName) {
        _this.registerAction(Actions[actionName]);
      });
    }
  }, {
    key: 'hasObservers',

    // ### Has Observers
    //
    // returns the number of observers watching this store
    value: function hasObservers() {
      return !!this._observers.size;
    }
  }, {
    key: '_init',

    // ### Set Value
    //
    // overrides the current value held by the store
    value: function _init() {
      this._initOperations();
      this._notifyObservers();
    }
  }, {
    key: '_initOperations',
    value: function _initOperations() {
      this._disposeOperations();

      invariant(this._actions.length, 'Store must have at least on action to listen to but has %s', this._actions.length);

      var operations = [];

      this._actions.forEach(function (val) {
        operations.push(val);
      });

      invariant(areObservable(operations), '"%s" actions should be an array of observables', this.displayName);

      operations = Rx.Observable.merge(operations);

      this._operationsSubscription = operations.subscribe(this._opsOnNext.bind(this), this.opsOnError.bind(this), this.opsOnCompleted.bind(this));
    }
  }, {
    key: '_notifyObservers',

    // ### NotifyObservers
    //
    // sends the current value held by the store to its observers
    value: function _notifyObservers(error) {
      var _this2 = this;

      this._observers.forEach(function (observer) {
        if (error) {
          return observer.onError(error);
        }
        observer.onNext(_this2.__value);
      });
    }
  }, {
    key: '_applyOperation',

    // ### applyOperation
    //
    // If an operation returns a proper object, this method is called.
    // It checks to see if a property `value` exists and returns that, else
    // it applies the `transform` method of the operation on the current value
    // held by the store.
    //
    // NOTE: If `value` property is supplied, then the `transform` method is
    // simply ignored
    value: function _applyOperation(value, operation) {
      return 'value' in operation ? operation.value : operation.transform(value);
    }
  }, {
    key: '_opsOnNext',

    // ### Operation Observer
    //
    // This is the observer that observes the stores operation observable
    // operations must return an object with at least the property `value`
    // or a method `transform`. It may also have the additional property `confirm`
    // which must be a promise. This is used to undo the value held by the store
    value: function _opsOnNext(operation) {
      var _this3 = this;

      invariant(operation && typeof operation === 'object', 'invalid operation, operations should be an object, given : %s', operation);

      invariant(operation.value || operation.transform && typeof operation.transform === 'function', 'invalid operation, ' + 'operations should have a value or a transform property');

      var oldValue = this.__value;
      this.__value = this._applyOperation(this.__value, operation);
      this._notifyObservers();

      var uid = uuid.v1();

      this._history.set(uid, {
        operation: operation,
        oldValue: oldValue
      });

      if ('confirm' in operation) {
        invariant(isPromise(operation.confirm), 'invalid operation, confirm should be a promise, given : %s', operation.confirm);

        operation.confirm.then(function () {
          _this3._confirmOperation(uid);
        }, function () {
          _this3._cancelOperation(uid);
        });
      } else {
        this._confirmOperation(uid);
      }
    }
  }, {
    key: 'opsOnError',
    value: function opsOnError(err) {
      throw new Error('An error has occurred in the operations observer: ' + err);
    }
  }, {
    key: 'opsOnCompleted',
    value: function opsOnCompleted() {
      console.warn('operations observable has terminated without error');
    }
  }, {
    key: '_confirmOperation',

    // ### Confirm Operation
    //
    // This method activates when the promise tied to an operation is resolved.
    value: function _confirmOperation(uid) {
      var _this4 = this;

      this._checkId(uid);
      this._history.get(uid).confirmed = true;
      this._history.forEach(function (operation, uid) {
        /* istanbul ignore else */
        if (operation.confirmed) {
          _this4._history['delete'](uid);
        }
      });
    }
  }, {
    key: '_cancelOperation',

    // ### Cancel Operations
    //
    // If the promise in `confirm` is rejected, this method reverts the changes
    // made by the operation tied to this promise.
    value: function _cancelOperation(uid) {
      var _this5 = this;

      this._checkId(uid);
      var _history = this._history;
      // initial value
      var value = _history.get(uid).oldValue;
      var found = false;
      _history.forEach(function (descriptor, _uid) {
        if (uid === _uid) {
          found = true;
          return;
        }
        if (!found) {
          return;
        }
        descriptor.oldValue = value;
        value = _this5._applyOperation(value, descriptor.operation);
      });

      this.__value = value;
      _history['delete'](uid);
      this._notifyObservers();
    }
  }, {
    key: '_checkId',
    value: function _checkId(id) {
      invariant(this._history.has(id), 'an unknown operation id was used that is not within its history.' + 'it may have been called outside of context');
    }
  }, {
    key: '_dispose',

    // ### dispose
    //
    // Disposes the subscription to initial value observable if any
    // and calls `disposeOperations`
    value: function _dispose() {
      this._disposeOperations();
      this.__value = null;
    }
  }, {
    key: '_disposeOperations',

    // ### disposeOperations
    //
    // Disposes all the stores current subscriptions
    // and clear operations history
    value: function _disposeOperations() {
      if (this._operationsSubscription) {
        this._operationsSubscription.dispose();
      }
      this._operationsSubscription = null;
      this._history.clear();
    }
  }, {
    key: '_subscribe',

    // ### Subscribe
    //
    // This is the main entry for observers of this **ThunderCats** Store
    // This method will track all observers and initiate the store.
    value: function _subscribe(observer) {
      var _this6 = this;

      var uid = uuid.v1();

      /* istanbul ignore else */
      if (!this.hasObservers()) {
        this._init();
      }

      this._observers.set(uid, observer);

      observer.onNext(this.__value);

      return Rx.Disposable.create(function () {
        _this6._observers['delete'](uid);
        /* istanbul ignore else */
        if (!_this6.hasObservers()) {
          _this6._dispose();
        }
      });
    }
  }, {
    key: 'serialize',
    value: function serialize() {
      return JSON.stringify(this.__value);
    }
  }, {
    key: 'deserialize',
    value: function deserialize(stringyData) {
      var data = JSON.parse(stringyData);
      invariant(typeof data === 'object', '%s deserialize must return an object or null but got: %s', this.displayName, data);
      this.__value = data;
    }
  }, {
    key: '__getValue',
    value: function __getValue() {
      return this.__value;
    }
  }]);

  return Store;
})(Rx.Observable);

// TODO: fix this when es class properties is stage 2
Store.prototype.displayName = 'BaseStore';

module.exports = Store;