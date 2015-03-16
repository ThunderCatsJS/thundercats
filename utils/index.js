module.exports = {
  isPromise: isPromise,
  isObservable: isObservable,
  areObservable: areObservable
};

function isPromise(promise) {
  return promise && typeof promise.then === 'function';
}

function isObservable(observable) {
  return observable && typeof observable.subscribe === 'function';
}

function areObservable(observables) {
  if (!Array.isArray(observables)) {
    return false;
  }
  return observables.reduce(function(bool, observable) {
    return bool && isObservable(observable);
  }, true);
}
