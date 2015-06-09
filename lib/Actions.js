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

var debug = (0, _debug2['default'])('thundercats:actions');
var protectedProperties = ['displayName', 'constructor'];

function getActionNames(ctx) {
  return Object.getOwnPropertyNames(ctx.constructor.prototype).filter(function (name) {
    return protectedProperties.indexOf(name) === -1 && name.indexOf('_') === -1 && typeof ctx[name] === 'function';
  });
}

var ActionCreator = {
  create: function create(name, map) {
    var observers = [];
    var actionStart = new _rx2['default'].Subject();

    function action(value) {
      value = map(value);

      actionStart.onNext(value);
      observers.forEach(function (observer) {
        observer.onNext(value);
      });

      return value;
    }

    action.displayName = name;
    action.observers = observers;
    (0, _objectAssign2['default'])(action, _rx2['default'].Observable.prototype, _rx2['default'].Subject.prototype);

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
    (0, _invariant2['default'])(Array.isArray(actions), 'createActions requires an array but got %s', actions);

    var actionsBag = actions.reduce(function (ctx, action) {
      (0, _invariant2['default'])(action && typeof action === 'object', 'createActions requires items in array to be objects but ' + 'was supplied with %s', action);

      (0, _invariant2['default'])(typeof action.name === 'string', 'createActions requires objects to have a name key, but got %s', action.name);

      /* istanbul ignore else */
      if (action.map) {
        (0, _invariant2['default'])(typeof action.map === 'function', 'createActions requires objects with map field to be a function ' + 'but was given %s', action.map);
      }

      ctx[action.name] = ActionCreator.create(action.name, action.map);
      return ctx;
    }, {});

    return (0, _objectAssign2['default'])(ctx, actionsBag);
  }
};

exports.ActionCreator = ActionCreator;

var Actions = function Actions(actionNames) {
  var _this = this;

  _classCallCheck(this, Actions);

  if (actionNames) {
    (0, _invariant2['default'])(Array.isArray(actionNames) && actionNames.every(function (actionName) {
      return typeof actionName === 'string';
    }), '%s should get an array of strings but got %s', actionNames);
  }

  var actionDefinitions = getActionNames(this).map(function (name) {
    return { name: name, map: _this[name] };
  });

  if (actionNames) {
    actionDefinitions = actionDefinitions.concat(actionNames.map(function (name) {
      return { name: name, map: _rx2['default'].helpers.identity };
    }));
  }

  // istanbul ignore else
  if (actionDefinitions && actionDefinitions.length) {
    ActionCreator.createManyOn(this, actionDefinitions);
  }
};

exports['default'] = Actions;