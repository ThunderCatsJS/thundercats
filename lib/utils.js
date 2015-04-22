export default {
  areObservable: areObservable,
  isObservable: isObservable,
  isPromise: isPromise,
  isString: isString
};

function areObservable(observables) {
  return observables.reduce(function(bool, observable) {
    return bool && isObservable(observable);
  }, true);
}

function isObservable(observable) {
  return observable && typeof observable.subscribe === 'function';
}

function isPromise(promise) {
  return promise && typeof promise.then === 'function';
}

function isString(potentialString) {
  return typeof potentialString === 'string';
}
