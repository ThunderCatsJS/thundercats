import uuid from 'node-uuid';
import stampit, { assign } from 'stampit';
import { Observable, Disposable } from 'rx';
import invariant from 'invariant';
import debugFactory from 'debug';

import {
  mergeChainNonFunctions,
  mixinChainFunctions,
} from 'supermixer';

import {
  areObservable,
  createObjectValidator,
  getName,
  isObservable,
  isPromise
} from './utils';

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

function registerObservable(obs, actionsArr, storeName) {
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
}

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

function applyOperation(oldValue, operation) {
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

function notifyObservers(value, observers) {
  debug('starting notify cycle');
  observers.forEach((observer, uid) => {
    debug('notifying %s', uid);
    observer.onNext(value);
  });
}

function dispose(subscription) {
  if (subscription) {
    subscription.dispose();
  }
  return new Map();
}

function checkId(id, history) {
  invariant(
    history.has(id),
    'an unknown operation id was used that is not within its history.' +
    'it may have been called outside of context'
  );
}

const methods = {
  register(observable) {
    this.actions = registerObservable(
      observable,
      this.actions,
      getName(this)
    );
    return this;
  },

  hasObservers() {
    return !!this.observers.size;
  },

  _init() {
    debug('initiating %s', getName(this));
    this.history = dispose(this._operationsSubscription, this.history);

    invariant(
      this.actions.length,
      '%s must have at least one action to listen to but has %s',
      getName(this),
      this.actions.length
    );

    let operations = [];
    this.actions.forEach(observable => {
      operations.push(observable);
    });

    invariant(
      areObservable(operations),
      '"%s" actions should be an array of observables',
      getName(this)
    );

    this._operationsSubscription = Observable.merge(operations)
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
            'invalid operation, optimistic should be a ' +
            'promise or observable,' +
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
  },

  _opsOnNext(operation) {
    const ops = assign({}, operation);

    debug('on next called');
    const oldValue = this.value;
    const newValue = applyOperation(this.value, ops);

    if (!newValue) {
      debug('%s operational noop', getName(this));
      // do not change value
      // do not update history
      // do not collect 200 dollars
      return;
    }

    // if shouldStoreNotify returns false
    // do not change value or update history
    // else continue as normal
    if (
      this.shouldStoreNotify &&
      typeof this.shouldStoreNotify === 'function' &&
      !this.shouldStoreNotify(oldValue, newValue)
    ) {
      debug('%s will not notify', getName(this));
      return;
    }

    this.value = newValue;
    notifyObservers(this.value, this.observers);

    let uid = uuid.v1();

    this.history.set(uid, {
      operation: ops,
      oldValue: oldValue
    });

    if ('optimistic' in ops) {
      const optimisticObs = isPromise(ops.optimistic) ?
        Observable.fromPromise(ops.optimistic) :
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
  },

  opsOnError(err) {
    throw new Error(
      'An error has occurred in the operations observer: ' + err
    );
  },

  opsOnCompleted() {
    console.warn('operations observable has terminated without error');
  },

  _subscribe(observer) {

    const uid = uuid.v1();

    /* istanbul ignore else */
    if (!this.hasObservers()) {
      this._init();
    }

    debug('adding observer %s', uid);
    this.observers.set(uid, observer);

    observer.onNext(this.value);

    return Disposable.create(() => {
      debug('Disposing obserable %s', uid);
      this.observers.delete(uid);
      /* istanbul ignore else */
      if (!this.hasObservers()) {
        debug('all observers cleared');
        this.dispose();
      }
    });
  },

  dispose() {
    debug('disposing %s', getName(this));
    this.observers = new Map();
    this.history = dispose(this._operationsSubscription, this.history);
  },

  serialize() {
    return this.value ? JSON.stringify(this.value) : '';
  },

  deserialize(stringyData) {
    let data = JSON.parse(stringyData);
    invariant(
      data && typeof data === 'object',
      '%s deserialize must return an object but got: %s',
      getName(this),
      data
    );
    this.value = data;
    return this.value;
  }
};

const staticMethods = {
  createRegistrar(store) {
    function register(observable) {
      store.actions = registerObservable(
        observable,
        store.actions,
        getName(store)
      );
      return store;
    }
    return register;
  },

  fromMany() {
    return Observable.from(arguments)
      .tap(validateObservable)
      .toArray()
      .flatMap(observables => Observable.merge(observables));
  },

  replacer(observable) {
    return addOperation(
      observable,
      createObjectValidator(
        'setter should receive objects but was given %s'
      ),
      replace => ({ replace })
    );
  },

  setter(observable) {
    return addOperation(
      observable,
      createObjectValidator(
        'setter should receive objects but was given %s'
      ),
      set => ({ set })
    );
  },

  transformer(observable) {
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
};

// Store is a stamp factory
// It returns a factory that creates store instances
export default function Store(value = {}) {
  const stamp = stampit();
  stamp.fixed.refs = stamp.fixed.state = mergeChainNonFunctions(
    stamp.fixed.refs,
    Observable.prototype
  );
  assign(stamp, assign(stamp.fixed.static, Observable));

  mixinChainFunctions(stamp.fixed.methods, Observable.prototype);
  return stamp
    .refs({
      value,
      _operationsSubscription: null
    })
    .static(staticMethods)
    .methods(methods)
    .init(({ instance }) => {
      instance.observers = new Map();
      instance.history = new Map();
      instance.actions = [];
      Observable.call(instance, methods._subscribe);
      return instance;
    });
}

// Make static methods also available on stamp factory
assign(Store, staticMethods);
