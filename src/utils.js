import invariant from 'invariant';

export default {
  areObservable,
  createObjectValidator,
  getName,
  getNameOrNull,
  isObservable,
  isPromise
};

const __DEV__ = process.env.NODE_ENV !== 'production';

function areObservable(observables) {
  return Array.isArray(observables) &&
    observables.length > 0 &&
    observables.reduce(function(bool, observable) {
      return bool && isObservable(observable);
    }, true);
}

function createObjectValidator(message) {
  return obj => {
    /* istanbul ignore else */
    if (__DEV__) {
      invariant(
        obj && typeof obj === 'object',
        message,
        obj
      );
    }
  };
}

function getName(comp) {
  return '' + (getNameOrNull(comp) || 'Anonymous');
}

function getNameOrNull(comp) {
  return (
    (comp && comp.displayName) ||
    (comp.constructor &&
    comp.constructor.displayName) ||
    null
  );
}

function isObservable(observable) {
  return observable && typeof observable.subscribe === 'function';
}

function isPromise(promise) {
  return promise && typeof promise.then === 'function';
}
