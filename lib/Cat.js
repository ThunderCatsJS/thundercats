import Rx from 'rx';
import React from 'react';
import invariant from 'invariant';
import warning from 'warning';
import debugFactory from 'debug';

import ContextWrapper from './ContextWrapper';
import Translate from './Translate';
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

export function fetch(fetchMap, stores) {
  if (!fetchMap || fetchMap.size === 0) {
    debug('cat found empty fetch map');
    return Rx.Observable.return({
      data: {},
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

  getStore(store) {
    return this.stores.get(('' + store).toLowerCase());
  }

  getActions(action) {
    return this.actions.get(('' + action).toLowerCase());
  }

  dehydrate() {
    return Translate.dehydrate(Rx.Observable.from(this.stores.values()));
  }

  hydrate(catState) {
    return Translate.hydrate(
      Rx.Observable.from(this.stores.values()),
      Rx.Observable.just(catState)
    );
  }

  serialize() {
    return Translate.serialize(Rx.Observable.from(this.stores.values()));
  }

  deserialize(stringyCatState) {
    return Translate.deserialize(
      Rx.Observable.from(this.stores.values()),
      Rx.Observable.just(stringyCatState)
    );
  }

  render(Component, DOMContainer) {
    return Render(this, Component, DOMContainer);
  }

  renderToString(Component) {
    return RenderToString(this, Component);
  };
}
