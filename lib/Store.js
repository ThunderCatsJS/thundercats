// # Store
//
// A Thundercats Store is an observable. It can update itself
// according to observables it listens to passed in through
// the `getOperations` method
import Rx from 'rx';
import uuid from 'node-uuid';
import invariant from 'invariant';
import debugFactory from 'debug';
import assign from 'object.assign';
import Actions, { getActionNames } from './Actions';
import { areObservable, isObservable, isPromise } from './utils';

const debug = debugFactory('thundercats:store');

export const Register = {
  observable(obs, actionsArr, storeName) {
    invariant(
      isObservable(obs),
      '%s should register observables but got %s for %s',
      storeName,
      obs
    );

    debug(
      '%s registering action',
      storeName
    );

    actionsArr.push(obs);
    return actionsArr;
  },

  actions(actionsInst, actionsArr, storeName) {
    let actionNames = getActionNames(actionsInst);

    debug(
      '%s register actions class %s',
      storeName,
      actionsInst.displayName
    );

    actionNames.map(name => {
      Register.observable(actionsInst[name], actionsArr, storeName);
    });

    return actionsArr;
  }
};

export const Optimism = {
  confirm(uid, history) {
    checkId(uid, history);
    history.get(uid).confirmed = true;
    history.forEach((operation, uid) => {
      /* istanbul ignore else */
      if (operation.confirmed) {
        history.delete(uid);
      }
    });
    return history;
  },
  revert(uid, history) {
    checkId(uid, history);
    // initial value
    let value = history.get(uid).oldValue;
    let found = false;
    history.forEach((descriptor, _uid) => {
      if (uid === _uid) {
        found = true;
        return;
      }
      if (!found) {
        return;
      }
      descriptor.oldValue = value;
      value = applyOperation(value, descriptor.operation);
    });

    history.delete(uid);
    return {
      history,
      value
    };
  }
};

export function applyOperation(oldValue, operation) {
  if (operation.value) {
    return operation.value;
  } else if (typeof operation.transform === 'function') {
    return operation.transform(oldValue);
  } else {
    return assign({}, oldValue, operation.set);
  }
}

export function notifyObservers(value, observers) {
  debug('starting notify cycle');
  observers.forEach((observer, uid) => {
    debug('notifying %s', uid);
    observer.onNext(value);
  });
}

export function dispose(subscription, history) {
  if (subscription) {
    subscription.dispose();
  }
  return new Map();
}
export function checkId(id, history) {
  invariant(
    history.has(id),
    'an unknown operation id was used that is not within its history.' +
    'it may have been called outside of context'
  );
}


// ## Create
//
// Takes a spec object and returns an Rx Observable Thundercats store
class Store extends Rx.Observable {

  constructor() {
    super(Store.prototype._subscribe);

    this.value = {};
    this._operationsSubscription = null;
    this.actions = [];
    this.observers = new Map();
    this.history = new Map();
    this.displayName = this.constructor.displayName || 'BaseStore';
  }

  register(observableOrActionsInstance) {
    if (observableOrActionsInstance instanceof Actions) {
      return Register.actions(
        observableOrActionsInstance,
        this.actions,
        this.displayName
      );
    }
    return Register.observable(
      observableOrActionsInstance,
      this.actions,
      this.displayName
    );
  }

  // ### Has Observers
  //
  // returns the number of observers watching this store
  hasObservers() {
    return !!this.observers.size;
  }

  _init() {
    debug('initiating %s', this.displayName);
    this.history = dispose(this._operationsSubscription, this.history);

    invariant(
      this.actions.length,
      '%s must have at least one action to listen to but has %s',
      this.displayName,
      this.actions.length
    );

    let operations = [];
    this.actions.forEach(observable => {
      operations.push(observable);
    });

    invariant(
      areObservable(operations),
      '"%s" actions should be an array of observables',
      this.displayName
    );

    this._operationsSubscription = Rx.Observable.merge(operations)
      .filter(operation => typeof operation.value === 'object' ?
        !!operation.value :
        true
      )
      .filter(operation => typeof operation.set === 'object' ?
        !!operation.set :
        true
      )
      .doOnNext(operation => {
        invariant(
          typeof operation === 'object',
          'invalid operation, operations should be an object, given : %s',
          operation
        );

        invariant(
          typeof operation.value === 'object' ||
          typeof operation.transform === 'function' ||
          typeof operation.set === 'object',
          'invalid operation, ' +
          'operations should have a value(an object), ' +
          'transform(a function), or set(an object) property'
        );

        if ('confirm' in operation) {
          invariant(
            isPromise(operation.confirm) ||
            isObservable(operation.confirm),
            'invalid operation, confirm should be a promise or observable,' +
            'given : %s',
            operation.confirm
          );
        }
      })
      .subscribe(
        this._opsOnNext.bind(this),
        this.opsOnError.bind(this),
        this.opsOnCompleted.bind(this)
      );
  }

  _opsOnNext(operation) {
    const ops = assign({}, operation);

    debug('on next called');
    let oldValue = this.value;
    this.value = applyOperation(this.value, ops);
    notifyObservers(this.value, this.observers);

    let uid = uuid.v1();

    this.history.set(uid, {
      operation: ops,
      oldValue: oldValue
    });

    if ('confirm' in ops) {
      const confirmObs = isPromise(ops.confirm) ?
        Rx.Observable.fromPromise(ops.confirm) :
        ops.confirm;

      confirmObs.firstOrDefault().subscribe(
        () => {},
        () => {
          const {
            value,
            history
          } = Optimism.revert(uid, this.history);
          this.history = history;
          this.value = value;
          notifyObservers(value, this.observers);
        },
        () => this.history = Optimism.confirm(uid, this.history)
      );

    } else {
      Optimism.confirm(uid, this.history);
    }
  }

  opsOnError(err) {
    throw new Error('An error has occurred in the operations observer: ' + err);
  }

  opsOnCompleted() {
    console.warn('operations observable has terminated without error');
  }

  // ### Subscribe
  //
  // This is the main entry for observers of this **ThunderCats** Store
  // This method will track all observers and initiate the store.
  _subscribe(observer) {

    const uid = uuid.v1();

    /* istanbul ignore else */
    if (!this.hasObservers()) {
      this._init();
    }

    debug('adding observer %s', uid);
    this.observers.set(uid, observer);

    observer.onNext(this.value);

    return Rx.Disposable.create(() => {
      debug('Disposing obserable %s', uid);
      this.observers.delete(uid);
      /* istanbul ignore else */
      if (!this.hasObservers()) {
        debug('All observers disposed, disposing operations observer');
        this.history = dispose(this._operationsSubscription, this.history);
      }
    });
  }

  serialize() {
    return JSON.stringify(this.value);
  }

  deserialize(stringyData) {
    let data = JSON.parse(stringyData);
    invariant(
      typeof data === 'object',
      '%s deserialize must return an object or null but got: %s',
      this.displayName,
      data
    );
    this.value = data;
  }
}

export default Store;
