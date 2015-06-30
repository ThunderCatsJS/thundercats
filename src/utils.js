import invariant from 'invariant';

export const __DEV__ = process.env.NODE_ENV !== 'production';

export function areObservable(observables) {
  return Array.isArray(observables) &&
    observables.length > 0 &&
    observables.reduce(function(bool, observable) {
      return bool && isObservable(observable);
    }, true);
}

export function createObjectValidator(message) {
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

export function getName(comp) {
  return '' + (getNameOrNull(comp) || 'Anonymous');
}

export function getNameOrNull(comp) {
  return (
    (comp && comp.displayName) ||
    (comp.constructor &&
    comp.constructor.displayName) ||
    null
  );
}

export function isObservable(observable) {
  return observable && typeof observable.subscribe === 'function';
}

export function isPromise(promise) {
  return promise && typeof promise.then === 'function';
}

export function isStore(obj) {
  return !!(
    obj.createRegistrar &&
    obj.fromMany &&
    obj.replacer &&
    obj.setter &&
    obj.transformer &&
    obj.prototype &&
    obj.prototype.register
  );
}
