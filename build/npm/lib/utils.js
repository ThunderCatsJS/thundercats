'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports['default'] = {
  areObservable: areObservable,
  isObservable: isObservable,
  isPromise: isPromise
};

function areObservable(observables) {
  return Array.isArray(observables) && observables.length > 0 && observables.reduce(function (bool, observable) {
    return bool && isObservable(observable);
  }, true);
}

function isObservable(observable) {
  return observable && typeof observable.subscribe === 'function';
}

function isPromise(promise) {
  return promise && typeof promise.then === 'function';
}
module.exports = exports['default'];