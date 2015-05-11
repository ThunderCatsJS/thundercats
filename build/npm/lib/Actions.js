'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.getActionNames = getActionNames;

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var _rx = require('rx');

var _rx2 = _interopRequireDefault(_rx);

var _invariant = require('invariant');

var _invariant2 = _interopRequireDefault(_invariant);

var _objectAssign = require('object.assign');

var _objectAssign2 = _interopRequireDefault(_objectAssign);

var _debug = require('debug');

var _debug2 = _interopRequireDefault(_debug);

var _waitFor = require('./waitFor');

var _waitFor2 = _interopRequireDefault(_waitFor);

var debug = _debug2['default']('thundercats:actions');

function getActionNames(ctx) {
  return Object.getOwnPropertyNames(ctx.constructor.prototype).filter(function (name) {
    return name !== 'constructor' && name.indexOf('_') === -1 && typeof ctx[name] === 'function';
  });
}

var ActionCreator = {
  create: function create(name, map) {
    var observers = [];
    var actionStart = new _rx2['default'].Subject();

    function action(value) {
      /* istanbul ignore else */
      if (typeof map === 'function') {
        value = map(value);
      }

      actionStart.onNext(value);
      observers.forEach(function (observer) {
        observer.onNext(value);
      });

      return value;
    }

    action.displayName = name;
    action.observers = observers;
    _objectAssign2['default'](action, _rx2['default'].Observable.prototype, _rx2['default'].Subject.prototype);

    action.hasObservers = function hasObservers() {
      return observers.length > 0 || actionStart.hasObservers();
    };

    action.waitFor = function () {
      var _arguments = arguments;

      return actionStart.flatMap(function (payload) {
        return _waitFor2['default'].apply(undefined, _arguments).map(function () {
          return payload;
        });
      });
    };

    _rx2['default'].Observable.call(action, function (observer) {
      observers.push(observer);
      return new _rx2['default'].Disposable(function () {
        observers.splice(observers.indexOf(observer), 1);
      });
    });

    debug('action %s created', action.displayName);
    return action;
  },

  createManyOn: function createManyOn(ctx, actions) {
    _invariant2['default'](typeof ctx === 'object', 'thisArg supplied to createActions must be an object but got %s', ctx);

    _invariant2['default'](Array.isArray(actions), 'createActions requires an array of objects but got %s', actions);

    var actionsBag = actions.reduce(function (ctx, action) {
      _invariant2['default'](typeof action === 'object', 'createActions requires items in array to be either strings ' + 'or objects but was supplied with %s', action);

      _invariant2['default'](typeof action.name === 'string', 'createActions requires objects to have a name key, but got %s', action.name);

      /* istanbul ignore else */
      if (action.map) {
        _invariant2['default'](typeof action.map === 'function', 'createActions requires objects with map field to be a function ' + 'but was given %s', action.map);
      }

      ctx[action.name] = ActionCreator.create(action.name, action.map);
      return ctx;
    }, {});

    return _objectAssign2['default'](ctx, actionsBag);
  }
};

exports.ActionCreator = ActionCreator;

var Actions = function Actions(actionNames) {
  var _this = this;

  _classCallCheck(this, Actions);

  this.displayName = this.displayName || this.constructor.displayName;
  if (actionNames) {
    _invariant2['default'](Array.isArray(actionNames) && actionNames.every(function (actionName) {
      return typeof actionName === 'string';
    }), '%s should get an array of strings but got %s', actionNames);
  }
  var actionDefs = getActionNames(this).map(function (name) {
    return { name: name, map: _this[name] };
  });

  if (actionNames) {
    actionDefs = actionDefs.concat(actionNames.map(function (name) {
      return { name: name };
    }));
  }

  _invariant2['default'](actionDefs.length, 'Actions Class %s instantiated without any actions defined!', this.displayName);

  ActionCreator.createManyOn(this, actionDefs);
};

exports['default'] = Actions;