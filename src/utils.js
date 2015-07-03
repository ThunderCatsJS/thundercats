import { helpers } from 'rx';
import invariant from 'invariant';

export const { isFunction } = helpers;
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
    (comp.fixed &&
    comp.fixed.refs &&
    comp.fixed.refs.displayName) ||
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
    isFunction(obj.createRegistrar) &&
    isFunction(obj.fromMany) &&
    isFunction(obj.replacer) &&
    isFunction(obj.setter) &&
    isFunction(obj.transformer)
  );
}
