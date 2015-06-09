'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

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

var debug = (0, _debug2['default'])('thundercats:store');
var __DEV__ = process.env.NODE_ENV !== 'production';

function validateObservable(observable) {
  /* istanbul ignore else */
  if (__DEV__) {
    (0, _invariant2['default'])((0, _utils.isObservable)(observable), 'register should get observables but was given %s', observable);
  }
  return observable;
}

function addOperation(observable, validateItem, map) {
  return validateObservable(observable).tap(validateItem).map(map);
}

var Register = {
  observable: function observable(obs, actionsArr, storeName) {
    actionsArr = actionsArr.slice();
    (0, _invariant2['default'])((0, _utils.isObservable)(obs), '%s should register observables but was given %s', storeName, obs);

    debug('%s registering action', storeName);

    actionsArr.push(obs);
    return actionsArr;
  },

  actions: function actions(actionsInst, actionsArr, storeName) {
    var actionNames = (0, _Actions.getActionNames)(actionsInst);

    debug('%s register actions class %s', storeName, (0, _utils.getName)(actionsInst));

    return actionNames.reduce(function (actionsArr, name) {
      return Register.observable(actionsInst[name], actionsArr, storeName);
    }, actionsArr);
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
  var replace = operation.replace;
  var transform = operation.transform;
  var set = operation.set;

  if (replace) {
    return replace;
  } else if (transform) {
    return transform(oldValue);
  } else if (set) {
    return (0, _objectAssign2['default'])({}, oldValue, set);
  } else {
    return oldValue;
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
  (0, _invariant2['default'])(history.has(id), 'an unknown operation id was used that is not within its history.' + 'it may have been called outside of context');
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
  }

  _inherits(Store, _Rx$Observable);

  _createClass(Store, [{
    key: 'register',
    value: function register(observableOrActionsInstance) {
      if (observableOrActionsInstance instanceof _Actions2['default']) {
        this.actions = Register.actions(observableOrActionsInstance, this.actions, (0, _utils.getName)(this));
        return this.actions;
      }
      this.actions = Register.observable(observableOrActionsInstance, this.actions, (0, _utils.getName)(this));
      return this.actions;
    }
  }, {
    key: 'hasObservers',
    value: function hasObservers() {
      return !!this.observers.size;
    }
  }, {
    key: '_init',
    value: function _init() {
      debug('initiating %s', (0, _utils.getName)(this));
      this.history = dispose(this._operationsSubscription, this.history);

      (0, _invariant2['default'])(this.actions.length, '%s must have at least one action to listen to but has %s', (0, _utils.getName)(this), this.actions.length);

      var operations = [];
      this.actions.forEach(function (observable) {
        operations.push(observable);
      });

      (0, _invariant2['default'])((0, _utils.areObservable)(operations), '"%s" actions should be an array of observables', (0, _utils.getName)(this));

      this._operationsSubscription = _rx2['default'].Observable.merge(operations).filter(function (operation) {
        return typeof operation.replace === 'object' ? !!operation.replace : true;
      }).filter(function (operation) {
        return typeof operation.set === 'object' ? !!operation.set : true;
      }).doOnNext(function (operation) {
        (0, _invariant2['default'])(typeof operation === 'object', 'invalid operation, operations should be an object, given : %s', operation);

        (0, _invariant2['default'])(typeof operation.replace === 'object' || typeof operation.transform === 'function' || typeof operation.set === 'object', 'invalid operation, ' + 'operations should have a replace(an object), ' + 'transform(a function), or set(an object) property but got %s', Object.keys(operation));

        if ('optimistic' in operation) {
          (0, _invariant2['default'])((0, _utils.isPromise)(operation.optimistic) || (0, _utils.isObservable)(operation.optimistic), 'invalid operation, optimistic should be a promise or observable,' + 'given : %s', operation.optimistic);
        }
      }).subscribe(this._opsOnNext.bind(this), this.opsOnError.bind(this), this.opsOnCompleted.bind(this));
    }
  }, {
    key: '_opsOnNext',
    value: function _opsOnNext(operation) {
      var _this = this;

      var ops = (0, _objectAssign2['default'])({}, operation);

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
        var optimisticObs = (0, _utils.isPromise)(ops.optimistic) ? _rx2['default'].Observable.fromPromise(ops.optimistic) : ops.optimistic;

        optimisticObs.firstOrDefault().subscribe(function () {}, function (err) {
          debug('optimistic error. reverting changes', err);

          var _Optimism$revert = Optimism.revert(uid, _this.history);

          var value = _Optimism$revert.value;
          var history = _Optimism$revert.history;

          _this.history = history;
          _this.value = value;
          notifyObservers(value, _this.observers);
        }, function () {
          return _this.history = Optimism.confirm(uid, _this.history);
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
      var _this2 = this;

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
        _this2.observers['delete'](uid);
        /* istanbul ignore else */
        if (!_this2.hasObservers()) {
          debug('All observers disposed, disposing operations observer');
          _this2.history = dispose(_this2._operationsSubscription, _this2.history);
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
      (0, _invariant2['default'])(data && typeof data === 'object', '%s deserialize must return an object but got: %s', (0, _utils.getName)(this), data);
      this.value = data;
      return this.value;
    }
  }], [{
    key: 'createRegistrar',
    value: function createRegistrar(store) {
      function register(observable) {
        store.actions = Register.observable(observable, store.actions, (0, _utils.getName)(store));
        return store.actions;
      }
      return register;
    }
  }, {
    key: 'fromMany',
    value: function fromMany() {
      return _rx2['default'].Observable.from(arguments).tap(validateObservable).toArray().flatMap(function (observables) {
        return _rx2['default'].Observable.merge(observables);
      });
    }
  }, {
    key: 'replacer',
    value: function replacer(observable) {
      return addOperation(observable, (0, _utils.createObjectValidator)('setter should receive objects but was given %s'), function (replace) {
        return { replace: replace };
      });
    }
  }, {
    key: 'setter',
    value: function setter(observable) {
      return addOperation(observable, (0, _utils.createObjectValidator)('setter should receive objects but was given %s'), function (set) {
        return { set: set };
      });
    }
  }, {
    key: 'transformer',
    value: function transformer(observable) {
      return addOperation(observable, function (fun) {
        /* istanbul ignore else */
        if (__DEV__) {
          (0, _invariant2['default'])(typeof fun === 'function', 'transform should receive functions but was given %s', fun);
        }
      }, function (transform) {
        return { transform: transform };
      });
    }
  }]);

  return Store;
})(_rx2['default'].Observable);

exports['default'] = Store;