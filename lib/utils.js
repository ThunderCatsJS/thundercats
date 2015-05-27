'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _invariant = require('invariant');

var _invariant2 = _interopRequireDefault(_invariant);

exports['default'] = {
  areObservable: areObservable,
  createObjectValidator: createObjectValidator,
  getName: getName,
  isObservable: isObservable,
  isPromise: isPromise
};

var __DEV__ = process.env.NODE_ENV !== 'production';

function areObservable(observables) {
  return Array.isArray(observables) && observables.length > 0 && observables.reduce(function (bool, observable) {
    return bool && isObservable(observable);
  }, true);
}

function createObjectValidator(message) {
  return function (obj) {
    /* istanbul ignore else */
    if (__DEV__) {
      (0, _invariant2['default'])(obj && typeof obj === 'object', message, obj);
    }
  };
}

function getName(comp) {
  return '' + (comp && comp.displayName || comp.constructor && comp.constructor.displayName || 'AnonymousComponent');
}

function isObservable(observable) {
  return observable && typeof observable.subscribe === 'function';
}

function isPromise(promise) {
  return promise && typeof promise.then === 'function';
}
module.exports = exports['default'];