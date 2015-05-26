import Rx from 'rx';
import uuid from 'node-uuid';
import invariant from 'invariant';
import debugFactory from 'debug';
import assign from 'object.assign';
import Actions, { getActionNames } from './Actions';
import utils from './utils';

const {
  areObservable,
  createObjectValidator,
  isObservable,
  isPromise
} = utils;

const debug = debugFactory('thundercats:store');
const __DEV__ = process.env.NODE_ENV !== 'production';

function validateObservable(observable) {
  /* istanbul ignore else */
  if (__DEV__) {
    invariant(
      isObservable(observable),
      'register should get observables but was given %s',
      observable
    );
  }
  return observable;
}

function addOperation(observable, validateItem, map) {
  return validateObservable(observable)
    .tap(validateItem)
    .map(map);
}

export const Register = {
  observable(obs, actionsArr, storeName) {
    actionsArr = actionsArr.slice();
    invariant(
      isObservable(obs),
      '%s should register observables but was given %s',
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

    return actionNames.reduce((actionsArr, name) => {
      return Register.observable(actionsInst[name], actionsArr, storeName);
    }, actionsArr);
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
  const { replace, transform, set } = operation;
  if (replace) {
    return replace;
  } else if (transform) {
    return transform(oldValue);
  } else if (set) {
    return assign({}, oldValue, set);
  } else {
    return oldValue;
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


export default class Store extends Rx.Observable {

  constructor() {
    super(Store.prototype._subscribe);

    this.value = {};
    this._operationsSubscription = null;
    this.actions = [];
    this.observers = new Map();
    this.history = new Map();
    this.displayName = this.constructor.displayName || 'BaseStore';
  }

  static createRegistrar(store) {
    function register(observable) {
      store.actions = Register.observable(
        observable,
        store.actions,
        store.displayName
      );
      return store.actions;
    }
    return register;
  }

  static transformer(observable) {
    return addOperation(
      observable,
      fun => {
        /* istanbul ignore else */
        if (__DEV__) {
          invariant(
            typeof fun === 'function',
            'transform should receive functions but was given %s',
            fun
          );
        }
      },
      transform => ({ transform })
    );
  }

  static setter(observable) {
    return addOperation(
      observable,
      createObjectValidator('setter should receive objects but was given %s'),
      set => ({ set })
    );
  }

  static replacer(observable) {
    return addOperation(
      observable,
      createObjectValidator('setter should receive objects but was given %s'),
      replace => ({ replace })
    );
  }

  register(observableOrActionsInstance) {
    if (observableOrActionsInstance instanceof Actions) {
      this.actions = Register.actions(
        observableOrActionsInstance,
        this.actions,
        this.displayName
      );
      return this.actions;
    }
    this.actions = Register.observable(
      observableOrActionsInstance,
      this.actions,
      this.displayName
    );
    return this.actions;
  }

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
      .filter(operation => typeof operation.replace === 'object' ?
        !!operation.replace :
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
          typeof operation.replace === 'object' ||
          typeof operation.transform === 'function' ||
          typeof operation.set === 'object',
          'invalid operation, ' +
          'operations should have a replace(an object), ' +
          'transform(a function), or set(an object) property but got %s',
          Object.keys(operation)
        );

        if ('optimistic' in operation) {
          invariant(
            isPromise(operation.optimistic) ||
            isObservable(operation.optimistic),
            'invalid operation, optimistic should be a promise or observable,' +
            'given : %s',
            operation.optimistic
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

    if ('optimistic' in ops) {
      const optimisticObs = isPromise(ops.optimistic) ?
        Rx.Observable.fromPromise(ops.optimistic) :
        ops.optimistic;

      optimisticObs.firstOrDefault().subscribe(
        () => {},
        err => {
          debug('optimistic error. reverting changes', err);
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
    return this.value ? JSON.stringify(this.value) : '';
  }

  deserialize(stringyData) {
    let data = JSON.parse(stringyData);
    invariant(
      data && typeof data === 'object',
      '%s deserialize must return an object but got: %s',
      this.displayName,
      data
    );
    this.value = data;
    return this.value;
  }
}
