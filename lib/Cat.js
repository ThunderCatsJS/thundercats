// # The Cat
import Rx from 'rx';
import React from 'react';
import assign from 'object.assign';
import invariant from 'invariant';
import warning from 'warning';
import debugFactory from 'debug';

import ContextWrapper from './ContextWrapper';
import Store from './Store';
import Actions from './Actions';
import waitFor from './waitFor';

const debug = debugFactory('thundercats:cat');

export function RenderToObs(Comp, DOMContainer) {
  return new Rx.AnonymousObservable(function (observer) {
    let instance = null;
    instance = React.render(Comp, DOMContainer, (err) => {
      /* istanbul ignore else */
      if (err) { return observer.onError(err); }
      /* istanbul ignore else */
      if (instance) { observer.onNext(instance); }
    });
    observer.onNext(instance);
  });
}

export function Render(cat, Component, DOMContainer) {
  return Rx.Observable.just(Component)
    .map(Comp => ContextWrapper.wrap(Comp, cat))
    .flatMap(
      Burrito => RenderToObs(Burrito, DOMContainer),
      (Burrito, inst) => {
        return inst;
      }
    );
}

export function RenderToString(cat, Component) {
  const { stores } = cat;
  const fetchMap = new Map();
  cat.fetchMap = fetchMap;
  return Rx.Observable.just(Component)
    .map(Comp => ContextWrapper.wrap(Comp, cat))
    .doOnNext(Burrito => {
      debug('initiation fetcher registration');
      React.renderToStaticMarkup(Burrito);
      debug('fetcher registration complete');
    })
    .flatMap(
      () => {
        return fetch(fetchMap, stores);
      },
      (Burrito, { data, fetchMap }) => {
        return {
          Burrito,
          data,
          fetchMap
        };
      }
    )
    .map(({ Burrito, data, fetchMap }) => {
      let markup = React.renderToString(Burrito);
      return {
        markup,
        data,
        fetchMap
      };
    })
    .firstOrDefault()
    .tapOnNext(() => cat.fetchMap = null);
}

export const Register = {
  store(stores, Store, args) {
    const name = Store.displayName;
    if (stores.has(name.toLowerCase())) {
      return warning(
        false,
        'Attempted to add a Store class, %s, that already exists in the Cat',
        name
      );
    }
    const store =
      new (Function.prototype.bind.apply(Store, args));
    debug('registering store %s', name);
    stores.set(name.toLowerCase(), store);
    return store;
  },

  actions(actionsMap, Actions, args) {
    let name = Actions.displayName;
    if (actionsMap.has(name.toLowerCase())) {
      return warning(
        false,
        'Attempted to add an Actions class, %s, that already exists in the Cat',
        name
      );
    }
    let _actions =
      new (Function.prototype.bind.apply(Actions, args));
    debug('registering actions %s', name);
    actionsMap.set(name.toLowerCase(), _actions);
    return _actions;
  }
};

export const Translate = {
  serialize(stores) {
    return Rx.Observable.from(stores.values())
      .filter(store => !!store.displayName)
      .filter(store => !!store.value)
      .map(store => ({ [store.displayName]: store.value }))
      .reduce((allDats, storeDats) => {
        return assign(allDats, storeDats);
      }, Object.create(null))
      .map(allDats => {
        if (Object.keys(allDats).length === 0) { return; }
        return allDats;
      })
      .map(allDats => JSON.stringify(allDats))
      .map(allDats => typeof allDats === 'string' ? allDats : '')
      .tapOnError((err) => {
        debug('an error occurred while stringifing stores', err);
      });
  },

  deserialize(stores, stringyCatState) {
    const stateMapObservable = Rx.Observable.of(stringyCatState)
      .tap(stringyCatState => {
        invariant(
          typeof stringyCatState === 'string',
          'deserialize expects a string but got %s',
          stringyCatState
        );
      })
      .map(stringyCatState => JSON.parse(stringyCatState))
      .tap(catState => {
        invariant(
          typeof catState === 'object',
          'parsed value of deserialize argument should be an object or ' +
          'null but got %s',
          catState
        );
      });

    return Rx.Observable.combineLatest([
        Rx.Observable.from(stores.values()),
        stateMapObservable
      ],
      (store, stateMap) => {
        return {
          store,
          data: stateMap[store.displayName]
        };
      })
      .tapOnNext(({ store, data }) => {
        if (typeof data === 'object') { return; }
        debug(
          'deserialize for %s state was not an object but %s',
          store.displayName,
          data
        );
      })
      .map(({ store, data }) => store.__value = data)
      .lastOrDefault()
      .map(() => true)
      .do(
        null,
        (err) => debug('deserialize encountered a err', err),
        () => debug('deserialize completed')
      );
  }
};

export function fetch(fetchMap, stores) {
  if (!fetchMap || fetchMap.size === 0) {
    debug('cat found empty fetch map');
    return Rx.Observable.return({
      data: null,
      fetchMap
    });
  }

  const fetchCtx = Rx.Observable.from(fetchMap.values()).shareReplay();

  const waitForStores = fetchCtx
    .pluck('store')
    .toArray()
    .tap(arrayOfStores => debug('waiting for %s stores', arrayOfStores.length))
    .map(arrayOfStores => {
      return waitFor(...arrayOfStores)
        .firstOrDefault()
        .shareReplay();
    })
    .tap(waitForStores => waitForStores.subscribe());

  const fetchObs = fetchCtx
    .map(({ action, payload }) => ({ action, payload }))
    .tapOnNext(() => debug('init individual fetchers'))
    .tapOnNext(({ action, payload }) => {
      action(payload);
    })
    .tapOnCompleted(() => debug('fetchers activated'))
    .toArray();

  return Rx.Observable.combineLatest(
    waitForStores,
    fetchObs.delaySubscription(50),
    data => ({ data, fetchMap })
  );
}

export default class Cat {
  constructor() {
    this.stores = new Map();
    this.actions = new Map();
  }

  // ### Register Class
  //
  // This takes as the first argument an Extended ThunderCats Store or Actions
  // class. The rest of the arguments are used to instantiate the store.
  // The Cat then takes this store and instantiates it with the arguments
  // provided and adds it to its list of stores.
  register(StoreOrActions) {
    invariant(
      Store.isPrototypeOf(StoreOrActions) ||
      Actions.isPrototypeOf(StoreOrActions),
      'Attempted to add a class that is not a ThunderCats Store or Action'
    );

    let name = StoreOrActions.displayName;

    invariant(
      typeof name === 'string',
      'Attempted to add a Store/Actions that does not have a displayName'
    );

    let isStore = Store.isPrototypeOf(StoreOrActions);
    var args = [].slice.call(arguments);

    return isStore ?
      Register.store(this.stores, StoreOrActions, args) :
      Register.actions(this.actions, StoreOrActions, args);
  }

  // ### get store
  //
  // returns a store instance if found
  // otherwise returns undefined
  getStore(store) {
    return this.stores.get(('' + store).toLowerCase());
  }

  // ### Get Actions
  //
  // returns the instance of actions class if it exist
  // otherwise returns undefined;
  getActions(action) {
    return this.actions.get(('' + action).toLowerCase());
  }

  // ### serialize
  //
  // Get the state of all the stores in string.
  // returns a cold observable
  serialize() {
    return Translate.serialize(this.stores);
  }

  deserialize(stringyCatState) {
    return Translate.deserialize(this.stores, stringyCatState);
  }

  // ### render
  //
  // Wraps the component being rendered and sets this cat instance on the
  // context object.
  // calls React.render and returns an observable that responds with the
  // instance of the component.
  render(Component, DOMContainer, ctx) {
    return Render(this, Component, DOMContainer, ctx);
  }

  // ### renderToString
  //
  // Wrap component in and sets this cat instance on the context, same as above,
  // returns an observable that responds with the data and markup
  renderToString(Component) {
    return RenderToString(this, Component);
  };
}
