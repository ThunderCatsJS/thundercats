'use strict';

var _defineProperty = function (obj, key, value) { return Object.defineProperty(obj, key, { value: value, enumerable: key == null || typeof Symbol == 'undefined' || key.constructor !== Symbol, configurable: true, writable: true }); };

var _classCallCheck = function (instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } };

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

// # The Cat
//
var Rx = require('rx');
var React = require('react');
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