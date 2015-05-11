'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

exports.RenderToObs = RenderToObs;
exports.Render = Render;
exports.RenderToString = RenderToString;
exports.fetch = fetch;

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) arr2[i] = arr[i]; return arr2; } else { return Array.from(arr); } }

function _defineProperty(obj, key, value) { return Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var _rx = require('rx');

var _rx2 = _interopRequireDefault(_rx);

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _objectAssign = require('object.assign');

var _objectAssign2 = _interopRequireDefault(_objectAssign);

var _invariant = require('invariant');

var _invariant2 = _interopRequireDefault(_invariant);

var _warning = require('warning');

var _warning2 = _interopRequireDefault(_warning);

var _debug = require('debug');

var _debug2 = _interopRequireDefault(_debug);

var _ContextWrapper = require('./ContextWrapper');

var _ContextWrapper2 = _interopRequireDefault(_ContextWrapper);

var _Store = require('./Store');

var _Store2 = _interopRequireDefault(_Store);

var _Actions = require('./Actions');

var _Actions2 = _interopRequireDefault(_Actions);

var _waitFor = require('./waitFor');

var _waitFor2 = _interopRequireDefault(_waitFor);

var debug = _debug2['default']('thundercats:cat');

function RenderToObs(Comp, DOMContainer) {
  return new _rx2['default'].AnonymousObservable(function (observer) {
    var instance = null;
    instance = _react2['default'].render(Comp, DOMContainer, function (err) {
      /* istanbul ignore else */
      if (err) {
        return observer.onError(err);
      }
      /* istanbul ignore else */
      if (instance) {
        observer.onNext(instance);
      }
    });
    observer.onNext(instance);
  });
}

function Render(cat, Component, DOMContainer) {
  return _rx2['default'].Observable.just(Component).map(function (Comp) {
    return _ContextWrapper2['default'].wrap(Comp, cat);
  }).flatMap(function (Burrito) {
    return RenderToObs(Burrito, DOMContainer);
  }, function (Burrito, inst) {
    return inst;
  });
}

function RenderToString(cat, Component) {
  var stores = cat.stores;

  var fetchMap = new Map();
  cat.fetchMap = fetchMap;
  return _rx2['default'].Observable.just(Component).map(function (Comp) {
    return _ContextWrapper2['default'].wrap(Comp, cat);
  }).doOnNext(function (Burrito) {
    debug('initiation fetcher registration');
    _react2['default'].renderToStaticMarkup(Burrito);
    debug('fetcher registration complete');
  }).flatMap(function () {
    return fetch(fetchMap, stores);
  }, function (Burrito, _ref2) {
    var data = _ref2.data;
    var fetchMap = _ref2.fetchMap;

    return {
      Burrito: Burrito,
      data: data,
      fetchMap: fetchMap
    };
  }).map(function (_ref3) {
    var Burrito = _ref3.Burrito;
    var data = _ref3.data;
    var fetchMap = _ref3.fetchMap;

    var markup = _react2['default'].renderToString(Burrito);
    return {
      markup: markup,
      data: data,
      fetchMap: fetchMap
    };
  }).firstOrDefault().tapOnNext(function () {
    return cat.fetchMap = null;
  });
}

var Register = {
  store: function store(stores, Store, args) {
    var name = Store.displayName;
    if (stores.has(name.toLowerCase())) {
      return _warning2['default'](false, 'Attempted to add a Store class, %s, that already exists in the Cat', name);
    }
    var store = new (Function.prototype.bind.apply(Store, args))();
    debug('registering store %s', name);
    stores.set(name.toLowerCase(), store);
    return store;
  },

  actions: function actions(actionsMap, Actions, args) {
    var name = Actions.displayName;
    if (actionsMap.has(name.toLowerCase())) {
      return _warning2['default'](false, 'Attempted to add an Actions class, %s, that already exists in the Cat', name);
    }
    var _actions = new (Function.prototype.bind.apply(Actions, args))();
    debug('registering actions %s', name);
    actionsMap.set(name.toLowerCase(), _actions);
    return _actions;
  }
};

exports.Register = Register;
var Translate = {
  serialize: function serialize(stores) {
    return _rx2['default'].Observable.from(stores.values()).filter(function (store) {
      return !!store.displayName;
    }).filter(function (store) {
      return !!store.value;
    }).map(function (store) {
      return _defineProperty({}, store.displayName, store.value);
    }).reduce(function (allDats, storeDats) {
      return _objectAssign2['default'](allDats, storeDats);
    }, Object.create(null)).map(function (allDats) {
      if (Object.keys(allDats).length === 0) {
        return;
      }
      return allDats;
    }).map(function (allDats) {
      return JSON.stringify(allDats);
    }).map(function (allDats) {
      return typeof allDats === 'string' ? allDats : '';
    }).tapOnError(function (err) {
      debug('an error occurred while stringifing stores', err);
    });
  },

  deserialize: function deserialize(stores, stringyCatState) {
    var stateMapObservable = _rx2['default'].Observable.of(stringyCatState).tap(function (stringyCatState) {
      _invariant2['default'](typeof stringyCatState === 'string', 'deserialize expects a string but got %s', stringyCatState);
    }).map(function (stringyCatState) {
      return JSON.parse(stringyCatState);
    }).tap(function (catState) {
      _invariant2['default'](typeof catState === 'object', 'parsed value of deserialize argument should be an object or ' + 'null but got %s', catState);
    });

    return _rx2['default'].Observable.combineLatest([_rx2['default'].Observable.from(stores.values()), stateMapObservable], function (store, stateMap) {
      return {
        store: store,
        data: stateMap[store.displayName]
      };
    }).tapOnNext(function (_ref4) {
      var store = _ref4.store;
      var data = _ref4.data;

      if (typeof data === 'object') {
        return;
      }
      debug('deserialize for %s state was not an object but %s', store.displayName, data);
    }).map(function (_ref5) {
      var store = _ref5.store;
      var data = _ref5.data;
      return store.__value = data;
    }).lastOrDefault().map(function () {
      return true;
    })['do'](null, function (err) {
      return debug('deserialize encountered a err', err);
    }, function () {
      return debug('deserialize completed');
    });
  }
};

exports.Translate = Translate;

function fetch(fetchMap, stores) {
  if (!fetchMap || fetchMap.size === 0) {
    debug('cat found empty fetch map');
    return _rx2['default'].Observable['return']({
      data: null,
      fetchMap: fetchMap
    });
  }

  var fetchCtx = _rx2['default'].Observable.from(fetchMap.values()).shareReplay();

  var waitForStores = fetchCtx.pluck('store').toArray().tap(function (arrayOfStores) {
    return debug('waiting for %s stores', arrayOfStores.length);
  }).map(function (arrayOfStores) {
    return _waitFor2['default'].apply(undefined, _toConsumableArray(arrayOfStores)).firstOrDefault().shareReplay();
  }).tap(function (waitForStores) {
    return waitForStores.subscribe();
  });

  var fetchObs = fetchCtx.map(function (_ref6) {
    var action = _ref6.action;
    var payload = _ref6.payload;
    return { action: action, payload: payload };
  }).tapOnNext(function () {
    return debug('init individual fetchers');
  }).tapOnNext(function (_ref7) {
    var action = _ref7.action;
    var payload = _ref7.payload;

    action(payload);
  }).tapOnCompleted(function () {
    return debug('fetchers activated');
  }).toArray();

  return _rx2['default'].Observable.combineLatest(waitForStores, fetchObs.delaySubscription(50), function (data) {
    return { data: data, fetchMap: fetchMap };
  });
}

var Cat = (function () {
  function Cat() {
    _classCallCheck(this, Cat);

    this.stores = new Map();
    this.actions = new Map();
  }

  _createClass(Cat, [{
    key: 'register',
    value: function register(StoreOrActions) {
      _invariant2['default'](_Store2['default'].isPrototypeOf(StoreOrActions) || _Actions2['default'].isPrototypeOf(StoreOrActions), 'Attempted to add a class that is not a ThunderCats Store or Action');

      var name = StoreOrActions.displayName;

      _invariant2['default'](typeof name === 'string', 'Attempted to add a Store/Actions that does not have a displayName');

      var isStore = _Store2['default'].isPrototypeOf(StoreOrActions);
      var args = [].slice.call(arguments);

      return isStore ? Register.store(this.stores, StoreOrActions, args) : Register.actions(this.actions, StoreOrActions, args);
    }
  }, {
    key: 'getStore',
    value: function getStore(store) {
      return this.stores.get(('' + store).toLowerCase());
    }
  }, {
    key: 'getActions',
    value: function getActions(action) {
      return this.actions.get(('' + action).toLowerCase());
    }
  }, {
    key: 'serialize',
    value: function serialize() {
      return Translate.serialize(this.stores);
    }
  }, {
    key: 'deserialize',
    value: function deserialize(stringyCatState) {
      return Translate.deserialize(this.stores, stringyCatState);
    }
  }, {
    key: 'render',
    value: function render(Component, DOMContainer) {
      return Render(this, Component, DOMContainer);
    }
  }, {
    key: 'renderToString',
    value: function renderToString(Component) {
      return RenderToString(this, Component);
    }
  }]);

  return Cat;
})();

exports['default'] = Cat;