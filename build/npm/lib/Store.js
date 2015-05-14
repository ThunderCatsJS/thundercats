'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { desc = parent = getter = undefined; _again = false; var object = _x,
    property = _x2,
    receiver = _x3; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

exports.applyOperation = applyOperation;
exports.notifyObservers = notifyObservers;
exports.dispose = dispose;
exports.checkId = checkId;

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; }

var _rx = require('rx');

var _rx2 = _interopRequireDefault(_rx);

var _nodeUuid = require('node-uuid');

var _nodeUuid2 = _interopRequireDefault(_nodeUuid);

var _invariant = require('invariant');

var _invariant2 = _interopRequireDefault(_invariant);

var _debug = require('debug');

var _debug2 = _interopRequireDefault(_debug);

var _objectAssign = require('object.assign');

var _objectAssign2 = _interopRequireDefault(_objectAssign);

var _Actions = require('./Actions');

var _Actions2 = _interopRequireDefault(_Actions);

var _utils = require('./utils');

var debug = _debug2['default']('thundercats:store');

var Register = {
  observable: function observable(obs, actionsArr, storeName) {
    _invariant2['default'](_utils.isObservable(obs), '%s should register observables but got %s for %s', storeName, obs);

    debug('%s registering action', storeName);

    actionsArr.push(obs);
    return actionsArr;
  },

  actions: function actions(actionsInst, actionsArr, storeName) {
    var actionNames = _Actions.getActionNames(actionsInst);

    debug('%s register actions class %s', storeName, actionsInst.displayName);

    actionNames.map(function (name) {
      Register.observable(actionsInst[name], actionsArr, storeName);
    });

    return actionsArr;
  }
};

exports.Register = Register;
var Optimism = {
  confirm: function confirm(uid, history) {
    checkId(uid, history);
    history.get(uid).confirmed = true;
    history.forEach(function (operation, uid) {
      /* istanbul ignore else */
      if (operation.confirmed) {
        history['delete'](uid);
      }
    });
    return history;
  },
  revert: function revert(uid, history) {
    checkId(uid, history);
    // initial value
    var value = history.get(uid).oldValue;
    var found = false;
    history.forEach(function (descriptor, _uid) {
      if (uid === _uid) {
        found = true;
        return;
      }
      if (!found) {
        return;
      }
      descriptor.oldValue = value;
      value = applyOperation(value, descriptor.operation);
    });

    history['delete'](uid);
    return {
      history: history,
      value: value
    };
  }
};

exports.Optimism = Optimism;

function applyOperation(oldValue, operation) {
  if (operation.value) {
    return operation.value;
  } else if (typeof operation.transform === 'function') {
    return operation.transform(oldValue);
  } else {
    return _objectAssign2['default']({}, oldValue, operation.set);
  }
}

function notifyObservers(value, observers) {
  debug('starting notify cycle');
  observers.forEach(function (observer, uid) {
    debug('notifying %s', uid);
    observer.onNext(value);
  });
}

function dispose(subscription, history) {
  if (subscription) {
    subscription.dispose();
  }
  return new Map();
}

function checkId(id, history) {
  _invariant2['default'](history.has(id), 'an unknown operation id was used that is not within its history.' + 'it may have been called outside of context');
}

var Store = (function (_Rx$Observable) {
  function Store() {
    _classCallCheck(this, Store);

    _get(Object.getPrototypeOf(Store.prototype), 'constructor', this).call(this, Store.prototype._subscribe);

    this.value = {};
    this._operationsSubscription = null;
    this.actions = [];
    this.observers = new Map();
    this.history = new Map();
    this.displayName = this.constructor.displayName || 'BaseStore';
  }

  _inherits(Store, _Rx$Observable);

  _createClass(Store, [{
    key: 'register',
    value: function register(observableOrActionsInstance) {
      if (observableOrActionsInstance instanceof _Actions2['default']) {
        return Register.actions(observableOrActionsInstance, this.actions, this.displayName);
      }
      return Register.observable(observableOrActionsInstance, this.actions, this.displayName);
    }
  }, {
    key: 'hasObservers',
    value: function hasObservers() {
      return !!this.observers.size;
    }
  }, {
    key: '_init',
    value: function _init() {
      debug('initiating %s', this.displayName);
      this.history = dispose(this._operationsSubscription, this.history);

      _invariant2['default'](this.actions.length, '%s must have at least one action to listen to but has %s', this.displayName, this.actions.length);

      var operations = [];
      this.actions.forEach(function (observable) {
        operations.push(observable);
      });

      _invariant2['default'](_utils.areObservable(operations), '"%s" actions should be an array of observables', this.displayName);

      this._operationsSubscription = _rx2['default'].Observable.merge(operations).filter(function (operation) {
        return typeof operation.value === 'object' ? !!operation.value : true;
      }).filter(function (operation) {
        return typeof operation.set === 'object' ? !!operation.set : true;
      }).doOnNext(function (operation) {
        _invariant2['default'](typeof operation === 'object', 'invalid operation, operations should be an object, given : %s', operation);

        _invariant2['default'](typeof operation.value === 'object' || typeof operation.transform === 'function' || typeof operation.set === 'object', 'invalid operation, ' + 'operations should have a value(an object), ' + 'transform(a function), or set(an object) property');

        if ('optimistic' in operation) {
          _invariant2['default'](_utils.isPromise(operation.optimistic) || _utils.isObservable(operation.optimistic), 'invalid operation, optimistic should be a promise or observable,' + 'given : %s', operation.optimistic);
        }
      }).subscribe(this._opsOnNext.bind(this), this.opsOnError.bind(this), this.opsOnCompleted.bind(this));
    }
  }, {
    key: '_opsOnNext',
    value: function _opsOnNext(operation) {
      var _this6 = this;

      var ops = _objectAssign2['default']({}, operation);

      debug('on next called');
      var oldValue = this.value;
      this.value = applyOperation(this.value, ops);
      notifyObservers(this.value, this.observers);

      var uid = _nodeUuid2['default'].v1();

      this.history.set(uid, {
        operation: ops,
        oldValue: oldValue
      });

      if ('optimistic' in ops) {
        var optimisticObs = _utils.isPromise(ops.optimistic) ? _rx2['default'].Observable.fromPromise(ops.optimistic) : ops.optimistic;

        optimisticObs.firstOrDefault().subscribe(function () {}, function (err) {
          debug('optimistic error. reverting changes', err);

          var _Optimism$revert = Optimism.revert(uid, _this6.history);

          var value = _Optimism$revert.value;
          var history = _Optimism$revert.history;

          _this6.history = history;
          _this6.value = value;
          notifyObservers(value, _this6.observers);
        }, function () {
          return _this6.history = Optimism.confirm(uid, _this6.history);
        });
      } else {
        Optimism.confirm(uid, this.history);
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
    key: '_subscribe',
    value: function _subscribe(observer) {
      var _this7 = this;

      var uid = _nodeUuid2['default'].v1();

      /* istanbul ignore else */
      if (!this.hasObservers()) {
        this._init();
      }

      debug('adding observer %s', uid);
      this.observers.set(uid, observer);

      observer.onNext(this.value);

      return _rx2['default'].Disposable.create(function () {
        debug('Disposing obserable %s', uid);
        _this7.observers['delete'](uid);
        /* istanbul ignore else */
        if (!_this7.hasObservers()) {
          debug('All observers disposed, disposing operations observer');
          _this7.history = dispose(_this7._operationsSubscription, _this7.history);
        }
      });
    }
  }, {
    key: 'serialize',
    value: function serialize() {
      return this.value ? JSON.stringify(this.value) : '';
    }
  }, {
    key: 'deserialize',
    value: function deserialize(stringyData) {
      var data = JSON.parse(stringyData);
      _invariant2['default'](data && typeof data === 'object', '%s deserialize must return an object but got: %s', this.displayName, data);
      this.value = data;
      return this.value;
    }
  }]);

  return Store;
})(_rx2['default'].Observable);

exports['default'] = Store;