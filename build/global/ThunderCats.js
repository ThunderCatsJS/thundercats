(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.ThunderCats = f()}})(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

var Actions = require('./lib/Actions'),
    Cat = require('./lib/Cat'),
    setStateUtil = require('./lib/setStateUtil'),
    Store = require('./lib/Store'),
    waitFor = require('./lib/waitFor');

module.exports = {
  Actions: Actions,
  Cat: Cat,
  setStateUtil: setStateUtil,
  Store: Store,
  waitFor: waitFor
};

},{"./lib/Actions":2,"./lib/Cat":3,"./lib/Store":5,"./lib/setStateUtil":6,"./lib/waitFor":8}],2:[function(require,module,exports){
(function (global){
'use strict';

var _classCallCheck = function (instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } };

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

// # ThunderCats Action
//
// A ThunderCats Action is an Observable that can be called like a function!
var Rx = (typeof window !== "undefined" ? window.Rx : typeof global !== "undefined" ? global.Rx : null),
    invariant = require('invariant'),

// warning = require('warning'),
assign = require('object.assign'),
    areObservable = require('../utils').areObservable,
    slice = Array.prototype.slice;

var Actions = (function () {
  function Actions() {
    var _this = this;

    _classCallCheck(this, Actions);

    var actionDefs = this.__getActionNames(this).map(function (name) {
      return {
        name: name,
        map: _this[name]
      };
    });

    Actions._createActions(actionDefs, this);
  }

  _createClass(Actions, [{
    key: '__getActionNames',
    value: function __getActionNames(ctx) {
      invariant(ctx instanceof Actions, 'internal method `getActionNames` called outside of Actions instance');

      return Object.getOwnPropertyNames(ctx.constructor.prototype).filter(function (name) {
        return name !== 'constructor' && name.indexOf('__') === -1 && typeof ctx[name] === 'function';
      });
    }
  }], [{
    key: '_create',
    value: function _create(map) {
      var observers = [];

      var actionStart = new Rx.Subject();
      var actionEnd = new Rx.Subject();

      function action(value) {
        if (typeof map === 'function') {
          value = map(value);
        }

        actionStart.onNext(value);
        var os = observers.slice(0);
        for (var i = 0, len = os.length; i < len; i++) {
          os[i].onNext(value);
        }
        actionEnd.onNext();

        return value;
      }

      assign(action, Rx.Observable.prototype, Rx.Subject.prototype);

      Rx.Observable.call(action, function (observer) {
        observers.push(observer);
        return {
          dispose: function dispose() {
            observers.splice(observers.indexOf(observer), 1);
          }
        };
      });

      // ### Has Observers
      //
      // returns the current number of observers for this action
      action.hasObservers = function hasObservers() {
        return observers.length > 0 || actionStart.hasObservers() || actionEnd.hasObservers();
      };

      // ### Wait For
      //
      // takes observables as arguments and will
      // wait for each observable to publish a new value
      // before notifying its observers.
      //
      // NOTE: if any of the observables never publishes a new value
      // this observable will not either.
      action.waitFor = function (observables) {
        observables = slice.call(arguments);

        invariant(areObservable(observables), 'action.waitFor takes only observables as arguments');

        return actionStart.flatMap(function (value) {
          return Rx.Observable.combineLatest(observables.map(function (observable) {
            observable = observable.publish();
            observable.connect();
            return observable;
          }), function () {
            return value;
          });
        });
      };

      return action;
    }
  }, {
    key: '_createActions',
    value: function _createActions(actions, ctx) {
      ctx = ctx || {};
      invariant(typeof ctx === 'object', 'thisArg supplied to createActions must be an object but got %s', ctx);

      invariant(Array.isArray(actions), 'createActions requires an array of objects but got %s', actions);

      return actions.reduce(function (ctx, action) {
        invariant(typeof action === 'object', 'createActions requires items in array to be either strings ' + 'or objects but was supplied with %s', action);

        invariant(typeof action.name === 'string', 'createActions requires objects to have a name key, but got %s', action.name);

        if (action.map) {
          invariant(typeof action.map === 'function', 'createActions requires objects with map field to be a function ' + 'but was given %s', action.map);
        }

        ctx[action.name] = Actions._create(action.map);
        ctx[action.name].displayName = action.name;
        return ctx;
      }, ctx);
    }
  }]);

  return Actions;
})();

Actions.prototype.displayName = 'BaseActions';

module.exports = Actions;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"../utils":19,"invariant":13,"object.assign":15}],3:[function(require,module,exports){
(function (global){
'use strict';

var _defineProperty = function (obj, key, value) { return Object.defineProperty(obj, key, { value: value, enumerable: key == null || typeof Symbol == 'undefined' || key.constructor !== Symbol, configurable: true, writable: true }); };

var _classCallCheck = function (instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } };

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

// # The Cat
//
var Rx = (typeof window !== "undefined" ? window.Rx : typeof global !== "undefined" ? global.Rx : null);
var React = (typeof window !== "undefined" ? window.React : typeof global !== "undefined" ? global.React : null);
var assign = require('object.assign');
var invariant = require('invariant');
var warning = require('warning');
var debug = require('debug')('thundercats:cat');
var ContextWrapper = require('./ContextWrapper');
var Store = require('./store');
var waitFor = require('./waitFor');
var _require = require('../utils');

var isActions = _require.isActions;

var Cat = (function () {
  function Cat() {
    _classCallCheck(this, Cat);

    this._stores = new Map();
    this._actions = new Map();
    this._pathsMap = new Map();
    this._render = Rx.Observable.fromNodeCallback(React.render, React);
  }

  _createClass(Cat, [{
    key: 'setStore',

    // ### add a store to Cat.
    //
    // This takes as the first argument a Store with ThunderCats
    // Store as its base.
    // The rest of the arguments are used to instantiate the store.
    // The Cat then takes this store and instantiates it with the arguments
    // provided and adds it to its list of stores.
    //
    value: function setStore(_Store) {
      invariant(Store.prototype.isPrototypeOf(_Store), 'Attempted to add a store that does not have A ThunderCats ' + 'store as its base');

      var name = _Store.name || _Store.prototype.name;

      invariant(name, 'Attempted to add a store that does not have name, stores must have names\n      Either add a static property to your Store class\n      MyStore.name = \'MyStore\', or as a prototype property\n      MyStore.prototype.name = \'MyStore\'');

      if (this._stores.has(name)) {
        return warning(false, 'Attempted to add a store, %s, that already exists in the Cat', name);
      }
      // Some wizardry. Create a new instance of 'MyStore' with a variable number
      // of arguments provided by the user
      var storeIns = new (Function.prototype.bind.apply(_Store, arguments))();
      this._stores.add(name, storeIns);
    }
  }, {
    key: 'getStore',

    // ### get store
    //
    // returns a store instance if found
    // otherwise returns undefined
    value: function getStore(store) {
      return this._stores.get(store);
    }
  }, {
    key: 'setAction',

    // ### set action
    //
    // Takes an actions class as a first argument
    // and the rest of the arguments are passed to the constructor of the action
    // class.
    value: function setAction(Actions) {
      invariant(isActions(Actions), 'attempted to add an action object that is does not have a ' + 'ThunderCats Action class as its base.');

      var name = Actions.name || Actions.constructor.name;

      invariant(name, 'attempted to add an Action class with no name, Actions must have ' + 'names to use them with the Cat');

      if (this._actions.has(name)) {
        return warning(false, 'attempted to add an Action, %s, to the Cat that it already exists');
      }

      var actions = new (Function.prototype.bind.apply(Actions, arguments))();
      this._actions.add(name, actions);
    }
  }, {
    key: 'getAction',

    // ### Get Actions
    //
    // returns the instance of actions class if it exist
    // otherwise returns undefined;
    value: function getAction(action) {
      return this._actions.get(action);
    }
  }, {
    key: 'serialize',

    // ### serialize
    //
    // Get the state of all the stores in string.
    // returns a string
    value: function serialize() {
      return Rx.Observable.from(this._stores.values()).filter(function (store) {
        return !!store.displayName;
      }).map(function (store) {
        return _defineProperty({}, store.displayName, store.__value);
      }).reduce(function (allDats, storeDats) {
        return assign(allDats, storeDats);
      }, Object.create(null)).map(function (allDats) {
        return JSON.stringify(allDats);
      }).doOnError(function (err) {
        debug('an error occured while stringifing stores', err);
      }).toArray().pop();
    }
  }, {
    key: 'deserialize',
    value: function deserialize(stringyCatState) {
      invariant(typeof stringyCatState === 'string', 'deserialize expects a string but got %s', stringyCatState);

      var catState = JSON.parse(stringyCatState);
      invariant(typeof catState === 'object', 'parsed value of deserialize argument should be an object or ' + 'null but got %s', catState);

      Rx.Observable.from(this._stores.values()).map(function (store) {
        var newStoreState = catState[store.displayName];
        if (typeof newStoreState === 'object') {
          store.__value = newStoreState;
        } else {
          debug('deserialize found a store state that is not an object', newStoreState);
        }
        return true;
      }).doOnError(function (err) {
        debug('deserialize encountered a err', err);
      }).subscribe(function () {}, null, function () {
        debug('deserialize completed');
      });
    }
  }, {
    key: '_setCurrentPath',

    // ### set current path
    //
    // register current path
    // This can be any string but should be a string that uniquely identifies the
    // current component being rendered
    value: function _setCurrentPath(path) {
      this._activePath = path;
      this._setPath(path);
    }
  }, {
    key: '_setPath',

    // ### set path
    //
    // Adds path to the map!
    value: function _setPath(path) {
      if (!this._pathsMap.has(path)) {
        this._pathsMap.set(path, new Map());
      }
    }
  }, {
    key: '_registerFetcher',

    // ### register a fetcher
    //
    // adds the fetcher and its intended payload with the current active path
    // along with the store that listens for the response from the fetch
    value: function _registerFetcher(fetchAction, ctx) {
      var fetchMap = this._pathsMap.get(this._activePath);
      fetchMap.add(ctx.fetchName, {
        fetchName: ctx.fetchName,
        fetcher: fetchAction,
        fetchPayload: ctx.fetchPayload,
        store: ctx.storeName
      });
    }
  }, {
    key: '_doFetch',

    // ### do fetch
    //
    // activates each fetcher and then waits for the response from the stores
    // returns an observable that responds with the value of the stores in
    // question once they have responded. If stores haven't responded within 3
    // seconds the observable throws.
    value: function _doFetch(ctx) {
      var fetchMap = this._pathsMap.get(ctx.path);
      var ctxValues = Rx.Observable.from(fetchMap.values());
      var fetchValues = ctxValues.map(function (ctx) {
        return {
          fetcher: ctx.fetcher,
          payload: ctx.fetchPayload
        };
      });

      var stores = ctxValues.map(function (ctx) {
        return ctx.storeName;
      }).map(this._getStore.bind(this)).filter(function (store) {
        // check for positive values
        return !!store;
      }).toArray();

      debug('init individual fetchers');
      fetchValues.subscription(function (_ref2) {
        var fetcher = _ref2.fetcher;
        var _ref2$payload = _ref2.payload;
        var payload = _ref2$payload === undefined ? {} : _ref2$payload;

        fetcher(payload);
      });
      debug('init complete');
      return waitFor(stores);
    }
  }, {
    key: 'render',

    // ### render
    //
    // Wraps the component being rendered and sets this cat instance on the
    // context object.
    // calls React.render and returns an observable that responds with the
    // instance of the component.
    value: function render(Component, DOMContainer, ctx) {
      var Burrito = this._wrap(Component);
      this._setCurrentPath(ctx.path);
      return this._render(Burrito, DOMContainer);
    }
  }, {
    key: 'renderToString',

    // ### renderToString
    //
    // Wrap component in and sets this cat instance on the context, same as above,
    // but will also initiate data fetchers for the current path.
    // returns an observable that reponds with the data for this path and the
    // markup
    value: function renderToString(Component, ctx) {
      var render = Rx.Observable.fromNodeCallback(React.render, React);

      // Set current path
      this._setCurrentPath(ctx.path);

      // wrap component in contextWrapper
      var Burrito = this._wrap(Component);

      // set active stores and fetchers
      React.renderToStaticMarkup(Burrito);
      // initial render populated stores and fetch actions to call
      return this._doFetch(ctx).flatMap(function () {
        return render(Burrito);
      }, function (data, markup) {
        return {
          markup: markup,
          data: data
        };
      });
    }
  }, {
    key: '_wrap',

    // ### wrap
    //
    // Adds this instance of the Cat on the context object
    value: function _wrap(Component) {
      invariant(React.isValidElement(Component), 'cat.renderToString and render expects a valid React element');
      return React.createElement(ContextWrapper, { cat: this }, Component);
    }
  }]);

  return Cat;
})();

module.exports = Cat;

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"../utils":19,"./ContextWrapper":4,"./store":7,"./waitFor":8,"debug":10,"invariant":13,"object.assign":15,"warning":18}],4:[function(require,module,exports){
'use strict';

var React = require('react/addons');

var ContextWrapper = React.createClass({
  displayName: 'ThunderCatsContextWrapper',

  propTypes: {
    cat: React.PropTypes.object,
    children: React.PropTypes.element
  },

  childContextTypes: {
    cat: React.PropTypes.object
  },

  getChildContext: function getChildContext() {
    return {
      cat: this.props.cat
    };
  },

  render: function render() {
    return this.props.children;
  }
});

module.exports = ContextWrapper;

},{"react/addons":9}],5:[function(require,module,exports){
(function (global){
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
var Rx = (typeof window !== "undefined" ? window.Rx : typeof global !== "undefined" ? global.Rx : null);
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

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"../utils":19,"invariant":13,"node-uuid":14,"warning":18}],6:[function(require,module,exports){
// # Set State utility
//
// A helper function to pass as an argument to Rx.Observable.map;
// If your Observable passes an object, this will assign the properties of
// that object to the current value held in the store.
//
// ```js
// var newMappedObservable = someAction
//   .map(function(newData) {
//     return { 'someCoolKey': newData };
//   })
//   .map(setStateUtil);
// ```
//
// now this `newMappedObservable` can be passed into your Thundercats
// `Stores.getOperations` spec definition
'use strict';

var invariant = require('invariant'),
    assign = Object.assign || require('object.assign');

module.exports = setStateUtil;

function setStateUtil(newStateToSet) {
  invariant(newStateToSet || typeof newStateToSet === 'object', 'setStateUtil expects an object, but got %s', newStateToSet);
  return {
    transform: function transform(oldState) {
      var newState = {};
      assign(newState, oldState, newStateToSet);
      return newState;
    }
  };
}

},{"invariant":13,"object.assign":15}],7:[function(require,module,exports){
(function (global){
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
var Rx = (typeof window !== "undefined" ? window.Rx : typeof global !== "undefined" ? global.Rx : null);
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

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"../utils":19,"invariant":13,"node-uuid":14,"warning":18}],8:[function(require,module,exports){
(function (global){
// # Wait For Utility
//
// Takes observables for arguments,
// converts them to hot observables
// then waits for each one to publish a value
//
// It can also take an optional timeout (milliseconds)
// as the first argument. By default this timeout is 3 seconds.
//
// If the timeout is exceeded, the observers will be notified
// on the onError observer. If no onError observer is supplied
// the timeout throws the Error
//
// returns an observable.
//
// *Note:* it's good practice to use a firstOrDefault
// observable if you just want a short lived subscription
'use strict';

var Rx = (typeof window !== "undefined" ? window.Rx : typeof global !== "undefined" ? global.Rx : null),
    utils = require('../utils'),
    invariant = require('invariant'),
    areObservable = utils.areObservable,
    debug = require('debug')('thundercats:waitFor');

module.exports = waitFor;

function waitFor(timeout, observables) {
  observables = [].slice.call(arguments);
  if (typeof timeout === 'number') {
    observables = observables.slice(1);
  } else {
    timeout = 3000;
  }
  invariant(areObservable(observables), 'waitFor takes only observables with optional number as the ' + 'first agruments');
  debug('setting waitFor with timeout %s', timeout);
  return Rx.Observable.combineLatest(observables.map(function (obs) {
    var published = obs.publish();
    published.connect();
    return published;
  }), function (values) {
    values = [].slice.call(arguments);
    debug('waitFor complete');
    return values;
  }).timeout(timeout);
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"../utils":19,"debug":10,"invariant":13}],9:[function(require,module,exports){

},{}],10:[function(require,module,exports){

/**
 * This is the web browser implementation of `debug()`.
 *
 * Expose `debug()` as the module.
 */

exports = module.exports = require('./debug');
exports.log = log;
exports.formatArgs = formatArgs;
exports.save = save;
exports.load = load;
exports.useColors = useColors;

/**
 * Use chrome.storage.local if we are in an app
 */

var storage;

if (typeof chrome !== 'undefined' && typeof chrome.storage !== 'undefined')
  storage = chrome.storage.local;
else
  storage = localstorage();

/**
 * Colors.
 */

exports.colors = [
  'lightseagreen',
  'forestgreen',
  'goldenrod',
  'dodgerblue',
  'darkorchid',
  'crimson'
];

/**
 * Currently only WebKit-based Web Inspectors, Firefox >= v31,
 * and the Firebug extension (any Firefox version) are known
 * to support "%c" CSS customizations.
 *
 * TODO: add a `localStorage` variable to explicitly enable/disable colors
 */

function useColors() {
  // is webkit? http://stackoverflow.com/a/16459606/376773
  return ('WebkitAppearance' in document.documentElement.style) ||
    // is firebug? http://stackoverflow.com/a/398120/376773
    (window.console && (console.firebug || (console.exception && console.table))) ||
    // is firefox >= v31?
    // https://developer.mozilla.org/en-US/docs/Tools/Web_Console#Styling_messages
    (navigator.userAgent.toLowerCase().match(/firefox\/(\d+)/) && parseInt(RegExp.$1, 10) >= 31);
}

/**
 * Map %j to `JSON.stringify()`, since no Web Inspectors do that by default.
 */

exports.formatters.j = function(v) {
  return JSON.stringify(v);
};


/**
 * Colorize log arguments if enabled.
 *
 * @api public
 */

function formatArgs() {
  var args = arguments;
  var useColors = this.useColors;

  args[0] = (useColors ? '%c' : '')
    + this.namespace
    + (useColors ? ' %c' : ' ')
    + args[0]
    + (useColors ? '%c ' : ' ')
    + '+' + exports.humanize(this.diff);

  if (!useColors) return args;

  var c = 'color: ' + this.color;
  args = [args[0], c, 'color: inherit'].concat(Array.prototype.slice.call(args, 1));

  // the final "%c" is somewhat tricky, because there could be other
  // arguments passed either before or after the %c, so we need to
  // figure out the correct index to insert the CSS into
  var index = 0;
  var lastC = 0;
  args[0].replace(/%[a-z%]/g, function(match) {
    if ('%%' === match) return;
    index++;
    if ('%c' === match) {
      // we only are interested in the *last* %c
      // (the user may have provided their own)
      lastC = index;
    }
  });

  args.splice(lastC, 0, c);
  return args;
}

/**
 * Invokes `console.log()` when available.
 * No-op when `console.log` is not a "function".
 *
 * @api public
 */

function log() {
  // this hackery is required for IE8/9, where
  // the `console.log` function doesn't have 'apply'
  return 'object' === typeof console
    && console.log
    && Function.prototype.apply.call(console.log, console, arguments);
}

/**
 * Save `namespaces`.
 *
 * @param {String} namespaces
 * @api private
 */

function save(namespaces) {
  try {
    if (null == namespaces) {
      storage.removeItem('debug');
    } else {
      storage.debug = namespaces;
    }
  } catch(e) {}
}

/**
 * Load `namespaces`.
 *
 * @return {String} returns the previously persisted debug modes
 * @api private
 */

function load() {
  var r;
  try {
    r = storage.debug;
  } catch(e) {}
  return r;
}

/**
 * Enable namespaces listed in `localStorage.debug` initially.
 */

exports.enable(load());

/**
 * Localstorage attempts to return the localstorage.
 *
 * This is necessary because safari throws
 * when a user disables cookies/localstorage
 * and you attempt to access it.
 *
 * @return {LocalStorage}
 * @api private
 */

function localstorage(){
  try {
    return window.localStorage;
  } catch (e) {}
}

},{"./debug":11}],11:[function(require,module,exports){

/**
 * This is the common logic for both the Node.js and web browser
 * implementations of `debug()`.
 *
 * Expose `debug()` as the module.
 */

exports = module.exports = debug;
exports.coerce = coerce;
exports.disable = disable;
exports.enable = enable;
exports.enabled = enabled;
exports.humanize = require('ms');

/**
 * The currently active debug mode names, and names to skip.
 */

exports.names = [];
exports.skips = [];

/**
 * Map of special "%n" handling functions, for the debug "format" argument.
 *
 * Valid key names are a single, lowercased letter, i.e. "n".
 */

exports.formatters = {};

/**
 * Previously assigned color.
 */

var prevColor = 0;

/**
 * Previous log timestamp.
 */

var prevTime;

/**
 * Select a color.
 *
 * @return {Number}
 * @api private
 */

function selectColor() {
  return exports.colors[prevColor++ % exports.colors.length];
}

/**
 * Create a debugger with the given `namespace`.
 *
 * @param {String} namespace
 * @return {Function}
 * @api public
 */

function debug(namespace) {

  // define the `disabled` version
  function disabled() {
  }
  disabled.enabled = false;

  // define the `enabled` version
  function enabled() {

    var self = enabled;

    // set `diff` timestamp
    var curr = +new Date();
    var ms = curr - (prevTime || curr);
    self.diff = ms;
    self.prev = prevTime;
    self.curr = curr;
    prevTime = curr;

    // add the `color` if not set
    if (null == self.useColors) self.useColors = exports.useColors();
    if (null == self.color && self.useColors) self.color = selectColor();

    var args = Array.prototype.slice.call(arguments);

    args[0] = exports.coerce(args[0]);

    if ('string' !== typeof args[0]) {
      // anything else let's inspect with %o
      args = ['%o'].concat(args);
    }

    // apply any `formatters` transformations
    var index = 0;
    args[0] = args[0].replace(/%([a-z%])/g, function(match, format) {
      // if we encounter an escaped % then don't increase the array index
      if (match === '%%') return match;
      index++;
      var formatter = exports.formatters[format];
      if ('function' === typeof formatter) {
        var val = args[index];
        match = formatter.call(self, val);

        // now we need to remove `args[index]` since it's inlined in the `format`
        args.splice(index, 1);
        index--;
      }
      return match;
    });

    if ('function' === typeof exports.formatArgs) {
      args = exports.formatArgs.apply(self, args);
    }
    var logFn = enabled.log || exports.log || console.log.bind(console);
    logFn.apply(self, args);
  }
  enabled.enabled = true;

  var fn = exports.enabled(namespace) ? enabled : disabled;

  fn.namespace = namespace;

  return fn;
}

/**
 * Enables a debug mode by namespaces. This can include modes
 * separated by a colon and wildcards.
 *
 * @param {String} namespaces
 * @api public
 */

function enable(namespaces) {
  exports.save(namespaces);

  var split = (namespaces || '').split(/[\s,]+/);
  var len = split.length;

  for (var i = 0; i < len; i++) {
    if (!split[i]) continue; // ignore empty strings
    namespaces = split[i].replace(/\*/g, '.*?');
    if (namespaces[0] === '-') {
      exports.skips.push(new RegExp('^' + namespaces.substr(1) + '$'));
    } else {
      exports.names.push(new RegExp('^' + namespaces + '$'));
    }
  }
}

/**
 * Disable debug output.
 *
 * @api public
 */

function disable() {
  exports.enable('');
}

/**
 * Returns true if the given mode name is enabled, false otherwise.
 *
 * @param {String} name
 * @return {Boolean}
 * @api public
 */

function enabled(name) {
  var i, len;
  for (i = 0, len = exports.skips.length; i < len; i++) {
    if (exports.skips[i].test(name)) {
      return false;
    }
  }
  for (i = 0, len = exports.names.length; i < len; i++) {
    if (exports.names[i].test(name)) {
      return true;
    }
  }
  return false;
}

/**
 * Coerce `val`.
 *
 * @param {Mixed} val
 * @return {Mixed}
 * @api private
 */

function coerce(val) {
  if (val instanceof Error) return val.stack || val.message;
  return val;
}

},{"ms":12}],12:[function(require,module,exports){
/**
 * Helpers.
 */

var s = 1000;
var m = s * 60;
var h = m * 60;
var d = h * 24;
var y = d * 365.25;

/**
 * Parse or format the given `val`.
 *
 * Options:
 *
 *  - `long` verbose formatting [false]
 *
 * @param {String|Number} val
 * @param {Object} options
 * @return {String|Number}
 * @api public
 */

module.exports = function(val, options){
  options = options || {};
  if ('string' == typeof val) return parse(val);
  return options.long
    ? long(val)
    : short(val);
};

/**
 * Parse the given `str` and return milliseconds.
 *
 * @param {String} str
 * @return {Number}
 * @api private
 */

function parse(str) {
  var match = /^((?:\d+)?\.?\d+) *(milliseconds?|msecs?|ms|seconds?|secs?|s|minutes?|mins?|m|hours?|hrs?|h|days?|d|years?|yrs?|y)?$/i.exec(str);
  if (!match) return;
  var n = parseFloat(match[1]);
  var type = (match[2] || 'ms').toLowerCase();
  switch (type) {
    case 'years':
    case 'year':
    case 'yrs':
    case 'yr':
    case 'y':
      return n * y;
    case 'days':
    case 'day':
    case 'd':
      return n * d;
    case 'hours':
    case 'hour':
    case 'hrs':
    case 'hr':
    case 'h':
      return n * h;
    case 'minutes':
    case 'minute':
    case 'mins':
    case 'min':
    case 'm':
      return n * m;
    case 'seconds':
    case 'second':
    case 'secs':
    case 'sec':
    case 's':
      return n * s;
    case 'milliseconds':
    case 'millisecond':
    case 'msecs':
    case 'msec':
    case 'ms':
      return n;
  }
}

/**
 * Short format for `ms`.
 *
 * @param {Number} ms
 * @return {String}
 * @api private
 */

function short(ms) {
  if (ms >= d) return Math.round(ms / d) + 'd';
  if (ms >= h) return Math.round(ms / h) + 'h';
  if (ms >= m) return Math.round(ms / m) + 'm';
  if (ms >= s) return Math.round(ms / s) + 's';
  return ms + 'ms';
}

/**
 * Long format for `ms`.
 *
 * @param {Number} ms
 * @return {String}
 * @api private
 */

function long(ms) {
  return plural(ms, d, 'day')
    || plural(ms, h, 'hour')
    || plural(ms, m, 'minute')
    || plural(ms, s, 'second')
    || ms + ' ms';
}

/**
 * Pluralization helper.
 */

function plural(ms, n, name) {
  if (ms < n) return;
  if (ms < n * 1.5) return Math.floor(ms / n) + ' ' + name;
  return Math.ceil(ms / n) + ' ' + name + 's';
}

},{}],13:[function(require,module,exports){
/**
 * Copyright 2013-2015, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @providesModule invariant
 */

'use strict';

/**
 * Use invariant() to assert state which your program assumes to be true.
 *
 * Provide sprintf-style format (only %s is supported) and arguments
 * to provide information about what broke and what you were
 * expecting.
 *
 * The invariant message will be stripped in production, but the invariant
 * will remain to ensure logic does not differ in production.
 */

var invariant = function(condition, format, a, b, c, d, e, f) {
  if ("production" !== 'production') {
    if (format === undefined) {
      throw new Error('invariant requires an error message argument');
    }
  }

  if (!condition) {
    var error;
    if (format === undefined) {
      error = new Error(
        'Minified exception occurred; use the non-minified dev environment ' +
        'for the full error message and additional helpful warnings.'
      );
    } else {
      var args = [a, b, c, d, e, f];
      var argIndex = 0;
      error = new Error(
        'Invariant Violation: ' +
        format.replace(/%s/g, function() { return args[argIndex++]; })
      );
    }

    error.framesToPop = 1; // we don't care about invariant's own frame
    throw error;
  }
};

module.exports = invariant;

},{}],14:[function(require,module,exports){
//     uuid.js
//
//     Copyright (c) 2010-2012 Robert Kieffer
//     MIT License - http://opensource.org/licenses/mit-license.php

(function() {
  var _global = this;

  // Unique ID creation requires a high quality random # generator.  We feature
  // detect to determine the best RNG source, normalizing to a function that
  // returns 128-bits of randomness, since that's what's usually required
  var _rng;

  // Node.js crypto-based RNG - http://nodejs.org/docs/v0.6.2/api/crypto.html
  //
  // Moderately fast, high quality
  if (typeof(_global.require) == 'function') {
    try {
      var _rb = _global.require('crypto').randomBytes;
      _rng = _rb && function() {return _rb(16);};
    } catch(e) {}
  }

  if (!_rng && _global.crypto && crypto.getRandomValues) {
    // WHATWG crypto-based RNG - http://wiki.whatwg.org/wiki/Crypto
    //
    // Moderately fast, high quality
    var _rnds8 = new Uint8Array(16);
    _rng = function whatwgRNG() {
      crypto.getRandomValues(_rnds8);
      return _rnds8;
    };
  }

  if (!_rng) {
    // Math.random()-based (RNG)
    //
    // If all else fails, use Math.random().  It's fast, but is of unspecified
    // quality.
    var  _rnds = new Array(16);
    _rng = function() {
      for (var i = 0, r; i < 16; i++) {
        if ((i & 0x03) === 0) r = Math.random() * 0x100000000;
        _rnds[i] = r >>> ((i & 0x03) << 3) & 0xff;
      }

      return _rnds;
    };
  }

  // Buffer class to use
  var BufferClass = typeof(_global.Buffer) == 'function' ? _global.Buffer : Array;

  // Maps for number <-> hex string conversion
  var _byteToHex = [];
  var _hexToByte = {};
  for (var i = 0; i < 256; i++) {
    _byteToHex[i] = (i + 0x100).toString(16).substr(1);
    _hexToByte[_byteToHex[i]] = i;
  }

  // **`parse()` - Parse a UUID into it's component bytes**
  function parse(s, buf, offset) {
    var i = (buf && offset) || 0, ii = 0;

    buf = buf || [];
    s.toLowerCase().replace(/[0-9a-f]{2}/g, function(oct) {
      if (ii < 16) { // Don't overflow!
        buf[i + ii++] = _hexToByte[oct];
      }
    });

    // Zero out remaining bytes if string was short
    while (ii < 16) {
      buf[i + ii++] = 0;
    }

    return buf;
  }

  // **`unparse()` - Convert UUID byte array (ala parse()) into a string**
  function unparse(buf, offset) {
    var i = offset || 0, bth = _byteToHex;
    return  bth[buf[i++]] + bth[buf[i++]] +
            bth[buf[i++]] + bth[buf[i++]] + '-' +
            bth[buf[i++]] + bth[buf[i++]] + '-' +
            bth[buf[i++]] + bth[buf[i++]] + '-' +
            bth[buf[i++]] + bth[buf[i++]] + '-' +
            bth[buf[i++]] + bth[buf[i++]] +
            bth[buf[i++]] + bth[buf[i++]] +
            bth[buf[i++]] + bth[buf[i++]];
  }

  // **`v1()` - Generate time-based UUID**
  //
  // Inspired by https://github.com/LiosK/UUID.js
  // and http://docs.python.org/library/uuid.html

  // random #'s we need to init node and clockseq
  var _seedBytes = _rng();

  // Per 4.5, create and 48-bit node id, (47 random bits + multicast bit = 1)
  var _nodeId = [
    _seedBytes[0] | 0x01,
    _seedBytes[1], _seedBytes[2], _seedBytes[3], _seedBytes[4], _seedBytes[5]
  ];

  // Per 4.2.2, randomize (14 bit) clockseq
  var _clockseq = (_seedBytes[6] << 8 | _seedBytes[7]) & 0x3fff;

  // Previous uuid creation time
  var _lastMSecs = 0, _lastNSecs = 0;

  // See https://github.com/broofa/node-uuid for API details
  function v1(options, buf, offset) {
    var i = buf && offset || 0;
    var b = buf || [];

    options = options || {};

    var clockseq = options.clockseq != null ? options.clockseq : _clockseq;

    // UUID timestamps are 100 nano-second units since the Gregorian epoch,
    // (1582-10-15 00:00).  JSNumbers aren't precise enough for this, so
    // time is handled internally as 'msecs' (integer milliseconds) and 'nsecs'
    // (100-nanoseconds offset from msecs) since unix epoch, 1970-01-01 00:00.
    var msecs = options.msecs != null ? options.msecs : new Date().getTime();

    // Per 4.2.1.2, use count of uuid's generated during the current clock
    // cycle to simulate higher resolution clock
    var nsecs = options.nsecs != null ? options.nsecs : _lastNSecs + 1;

    // Time since last uuid creation (in msecs)
    var dt = (msecs - _lastMSecs) + (nsecs - _lastNSecs)/10000;

    // Per 4.2.1.2, Bump clockseq on clock regression
    if (dt < 0 && options.clockseq == null) {
      clockseq = clockseq + 1 & 0x3fff;
    }

    // Reset nsecs if clock regresses (new clockseq) or we've moved onto a new
    // time interval
    if ((dt < 0 || msecs > _lastMSecs) && options.nsecs == null) {
      nsecs = 0;
    }

    // Per 4.2.1.2 Throw error if too many uuids are requested
    if (nsecs >= 10000) {
      throw new Error('uuid.v1(): Can\'t create more than 10M uuids/sec');
    }

    _lastMSecs = msecs;
    _lastNSecs = nsecs;
    _clockseq = clockseq;

    // Per 4.1.4 - Convert from unix epoch to Gregorian epoch
    msecs += 12219292800000;

    // `time_low`
    var tl = ((msecs & 0xfffffff) * 10000 + nsecs) % 0x100000000;
    b[i++] = tl >>> 24 & 0xff;
    b[i++] = tl >>> 16 & 0xff;
    b[i++] = tl >>> 8 & 0xff;
    b[i++] = tl & 0xff;

    // `time_mid`
    var tmh = (msecs / 0x100000000 * 10000) & 0xfffffff;
    b[i++] = tmh >>> 8 & 0xff;
    b[i++] = tmh & 0xff;

    // `time_high_and_version`
    b[i++] = tmh >>> 24 & 0xf | 0x10; // include version
    b[i++] = tmh >>> 16 & 0xff;

    // `clock_seq_hi_and_reserved` (Per 4.2.2 - include variant)
    b[i++] = clockseq >>> 8 | 0x80;

    // `clock_seq_low`
    b[i++] = clockseq & 0xff;

    // `node`
    var node = options.node || _nodeId;
    for (var n = 0; n < 6; n++) {
      b[i + n] = node[n];
    }

    return buf ? buf : unparse(b);
  }

  // **`v4()` - Generate random UUID**

  // See https://github.com/broofa/node-uuid for API details
  function v4(options, buf, offset) {
    // Deprecated - 'format' argument, as supported in v1.2
    var i = buf && offset || 0;

    if (typeof(options) == 'string') {
      buf = options == 'binary' ? new BufferClass(16) : null;
      options = null;
    }
    options = options || {};

    var rnds = options.random || (options.rng || _rng)();

    // Per 4.4, set bits for version and `clock_seq_hi_and_reserved`
    rnds[6] = (rnds[6] & 0x0f) | 0x40;
    rnds[8] = (rnds[8] & 0x3f) | 0x80;

    // Copy bytes to buffer, if provided
    if (buf) {
      for (var ii = 0; ii < 16; ii++) {
        buf[i + ii] = rnds[ii];
      }
    }

    return buf || unparse(rnds);
  }

  // Export public API
  var uuid = v4;
  uuid.v1 = v1;
  uuid.v4 = v4;
  uuid.parse = parse;
  uuid.unparse = unparse;
  uuid.BufferClass = BufferClass;

  if (typeof(module) != 'undefined' && module.exports) {
    // Publish as node.js module
    module.exports = uuid;
  } else  if (typeof define === 'function' && define.amd) {
    // Publish as AMD module
    define(function() {return uuid;});
 

  } else {
    // Publish as global (in browsers)
    var _previousRoot = _global.uuid;

    // **`noConflict()` - (browser only) to reset global 'uuid' var**
    uuid.noConflict = function() {
      _global.uuid = _previousRoot;
      return uuid;
    };

    _global.uuid = uuid;
  }
}).call(this);

},{}],15:[function(require,module,exports){
'use strict';

// modified from https://github.com/es-shims/es6-shim
var keys = require('object-keys');
var canBeObject = function (obj) {
	return typeof obj !== 'undefined' && obj !== null;
};

var assignShim = function assign(target, source1) {
	if (!canBeObject(target)) { throw new TypeError('target must be an object'); }
	var objTarget = Object(target);
	var s, source, i, props;
	for (s = 1; s < arguments.length; ++s) {
		source = Object(arguments[s]);
		props = keys(source);
		for (i = 0; i < props.length; ++i) {
			objTarget[props[i]] = source[props[i]];
		}
	}
	return objTarget;
};

assignShim.shim = function shimObjectAssign() {
	if (!Object.assign) {
		Object.assign = assignShim;
	}
	return Object.assign || assignShim;
};

module.exports = assignShim;


},{"object-keys":16}],16:[function(require,module,exports){
'use strict';

// modified from https://github.com/es-shims/es5-shim
var has = Object.prototype.hasOwnProperty;
var toStr = Object.prototype.toString;
var isArgs = require('./isArguments');
var hasDontEnumBug = !({ 'toString': null }).propertyIsEnumerable('toString');
var hasProtoEnumBug = function () {}.propertyIsEnumerable('prototype');
var dontEnums = [
	'toString',
	'toLocaleString',
	'valueOf',
	'hasOwnProperty',
	'isPrototypeOf',
	'propertyIsEnumerable',
	'constructor'
];

var keysShim = function keys(object) {
	var isObject = object !== null && typeof object === 'object';
	var isFunction = toStr.call(object) === '[object Function]';
	var isArguments = isArgs(object);
	var isString = isObject && toStr.call(object) === '[object String]';
	var theKeys = [];

	if (!isObject && !isFunction && !isArguments) {
		throw new TypeError('Object.keys called on a non-object');
	}

	var skipProto = hasProtoEnumBug && isFunction;
	if (isString && object.length > 0 && !has.call(object, 0)) {
		for (var i = 0; i < object.length; ++i) {
			theKeys.push(String(i));
		}
	}

	if (isArguments && object.length > 0) {
		for (var j = 0; j < object.length; ++j) {
			theKeys.push(String(j));
		}
	} else {
		for (var name in object) {
			if (!(skipProto && name === 'prototype') && has.call(object, name)) {
				theKeys.push(String(name));
			}
		}
	}

	if (hasDontEnumBug) {
		var ctor = object.constructor;
		var skipConstructor = ctor && ctor.prototype === object;

		for (var k = 0; k < dontEnums.length; ++k) {
			if (!(skipConstructor && dontEnums[k] === 'constructor') && has.call(object, dontEnums[k])) {
				theKeys.push(dontEnums[k]);
			}
		}
	}
	return theKeys;
};

keysShim.shim = function shimObjectKeys() {
	if (!Object.keys) {
		Object.keys = keysShim;
	}
	return Object.keys || keysShim;
};

module.exports = keysShim;

},{"./isArguments":17}],17:[function(require,module,exports){
'use strict';

var toStr = Object.prototype.toString;

module.exports = function isArguments(value) {
	var str = toStr.call(value);
	var isArgs = str === '[object Arguments]';
	if (!isArgs) {
		isArgs = str !== '[object Array]'
			&& value !== null
			&& typeof value === 'object'
			&& typeof value.length === 'number'
			&& value.length >= 0
			&& toStr.call(value.callee) === '[object Function]';
	}
	return isArgs;
};

},{}],18:[function(require,module,exports){
/**
 * Copyright 2014-2015, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @providesModule warning
 */

'use strict';

/**
 * Similar to invariant but only logs a warning if the condition is not met.
 * This can be used to log issues in development environments in critical
 * paths. Removing the logging code for production environments will keep the
 * same logic and follow the same code paths.
 */

var __DEV__ = "production" !== 'production';

var warning = function() {};

if (__DEV__) {
  warning = function(condition, format, args) {
    var len = arguments.length;
    args = new Array(len > 2 ? len - 2 : 0);
    for (var key = 2; key < len; key++) {
      args[key - 2] = arguments[key];
    }
    if (format === undefined) {
      throw new Error(
        '`warning(condition, format, ...args)` requires a warning ' +
        'message argument'
      );
    }

    if (format.length < 10 || (/^[s\W]*$/).test(format)) {
      throw new Error(
        'The warning format should be able to uniquely identify this ' +
        'warning. Please, use a more descriptive format than: ' + format
      );
    }

    if (!condition) {
      var argIndex = 0;
      var message = 'Warning: ' +
        format.replace(/%s/g, function() {
          args[argIndex++];
        });
      if (typeof console !== 'undefined') {
        console.error(message);
      }
      try {
        // --- Welcome to debugging React ---
        // This error was thrown as a convenience so that you can use this stack
        // to find the callsite that caused this warning to fire.
        throw new Error(message);
      } catch(x) {}
    }
  };
}

module.exports = warning;

},{}],19:[function(require,module,exports){
'use strict';

var Action = require('../').Action;

module.exports = {
  areObservable: areObservable,
  isActions: isActions,
  isObservable: isObservable,
  isPromise: isPromise
};

function areObservable(observables) {
  if (!Array.isArray(observables)) {
    return false;
  }
  return observables.reduce(function (bool, observable) {
    return bool && isObservable(observable);
  }, true);
}

function isActions(_Action) {
  Action.isPrototypeOf(_Action);
}

function isObservable(observable) {
  return observable && typeof observable.subscribe === 'function';
}

function isPromise(promise) {
  return promise && typeof promise.then === 'function';
}

},{"../":1}]},{},[1])(1)
});