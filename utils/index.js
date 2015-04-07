var Action = require('../').Action;

module.exports = {
  areObservable: areObservable,
  isActions: isActions,
  isObservable: isObservable,
  isPromise: isPromise
};

function areObservable(observables) {
  if (!Array.isArray(observables)) {
    return false;
  }
  return observables.reduce(function(bool, observable) {
    return bool && isObservable(observable);
  }, true);
}

function isActions(_Action) {
  Action.isPrototypeOf(_Action);
}

function isObservable(observable) {
  return observable && typeof observable.subscribe === 'function';
}

function isPromise(promise) {
  return promise && typeof promise.then === 'function';
}
