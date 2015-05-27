'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var _rx = require('rx');

var _rx2 = _interopRequireDefault(_rx);

var _invariant = require('invariant');

var _invariant2 = _interopRequireDefault(_invariant);

var _warning = require('warning');

var _warning2 = _interopRequireDefault(_warning);

var _debug = require('debug');

var _debug2 = _interopRequireDefault(_debug);

var _Store = require('./Store');

var _Store2 = _interopRequireDefault(_Store);

var _Actions = require('./Actions');

var _Actions2 = _interopRequireDefault(_Actions);

var _Translate = require('./Translate');

var _Translate2 = _interopRequireDefault(_Translate);

var _Render = require('./Render');

var _Render2 = _interopRequireDefault(_Render);

var debug = (0, _debug2['default'])('thundercats:cat');

var Register = {
  store: function store(stores, Store, args) {
    var name = Store.displayName;
    if (stores.has(name.toLowerCase())) {
      return (0, _warning2['default'])(false, 'Attempted to add a Store class, %s, that already exists in the Cat', name);
    }
    var store = new (Function.prototype.bind.apply(Store, args))();
    debug('registering store %s', name);
    stores.set(name.toLowerCase(), store);
    return store;
  },

  actions: function actions(actionsMap, Actions, args) {
    var name = Actions.displayName;
    if (actionsMap.has(name.toLowerCase())) {
      return (0, _warning2['default'])(false, 'Attempted to add an Actions class, %s, that already exists in the Cat', name);
    }
    var _actions = new (Function.prototype.bind.apply(Actions, args))();
    debug('registering actions %s', name);
    actionsMap.set(name.toLowerCase(), _actions);
    return _actions;
  }
};

exports.Register = Register;

var Cat = (function () {
  function Cat() {
    _classCallCheck(this, Cat);

    this.stores = new Map();
    this.actions = new Map();
  }

  _createClass(Cat, [{
    key: 'register',
    value: function register(StoreOrActions) {
      (0, _invariant2['default'])(_Store2['default'].isPrototypeOf(StoreOrActions) || _Actions2['default'].isPrototypeOf(StoreOrActions), 'Attempted to add a class that is not a ThunderCats Store or Action');

      var name = StoreOrActions.displayName;

      (0, _invariant2['default'])(typeof name === 'string', 'Attempted to add a Store/Actions that does not have a displayName');

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
    key: 'dehydrate',
    value: function dehydrate() {
      return _Translate2['default'].dehydrate(_rx2['default'].Observable.from(this.stores.values()));
    }
  }, {
    key: 'hydrate',
    value: function hydrate(catState) {
      return _Translate2['default'].hydrate(_rx2['default'].Observable.from(this.stores.values()), _rx2['default'].Observable.just(catState));
    }
  }, {
    key: 'serialize',
    value: function serialize() {
      return _Translate2['default'].serialize(_rx2['default'].Observable.from(this.stores.values()));
    }
  }, {
    key: 'deserialize',
    value: function deserialize(stringyCatState) {
      return _Translate2['default'].deserialize(_rx2['default'].Observable.from(this.stores.values()), _rx2['default'].Observable.just(stringyCatState));
    }
  }, {
    key: 'render',
    value: function render(Component, DOMContainer) {
      return _Render2['default'].render(this, Component, DOMContainer);
    }
  }, {
    key: 'renderToString',
    value: function renderToString(Component) {
      return _Render2['default'].renderToString(this, Component);
    }
  }]);

  return Cat;
})();

exports['default'] = Cat;