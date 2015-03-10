module.exports = {
  isPromise: isPromise,
  isObservable: isObservable
};

function isPromise(promise) {
  return promise && typeof promise.then === 'function';
}

function isObservable(observable) {
  return observable && typeof observable.subscribe === 'function';
}
