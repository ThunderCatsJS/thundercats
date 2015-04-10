'use strict';

var _classCallCheck = function (instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } };

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

// # ThunderCats Action
//
// A ThunderCats Action is an Observable that can be called like a function!
var Rx = require('rx'),
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