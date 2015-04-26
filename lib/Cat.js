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
const renderObs = Rx.Observable.fromNodeCallback(React.render, React);
const renderToStringObs =
  Rx.Observable.fromNodeCallback(React.renderToString, React);

export function Render(cat, Component, DOMContainer, ctx) {
  const { path } = ctx;
  const Burrito = ContextWrapper.wrap(Component);
  setPath(cat, path);
  return renderObs(Burrito, DOMContainer);
}

export function RenderToString(cat, Component, ctx) {
  const { path } = ctx;
  const { paths, fetch, stores } = cat;

  // Set current path
  setPath(cat, path);

  // wrap component in contextWrapper
  const Burrito = ContextWrapper.wrap(Component);

  // set active stores and fetchers
  React.renderToStaticMarkup(Burrito);
  // initial render populated stores and fetch actions to call

  let fetchMap = paths.get(path);
  return fetch(path, fetchMap, stores)
    .flatMap(function() {
      return renderToStringObs(Burrito);
    }, function(data, markup) {
        return {
          markup,
          data
        };
    });
}

export const Register = {
  store(stores, name, Store, args) {
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

  actions(actionsMap, name, Actions, args) {
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
  },

  fetcher(fetchMap, path, ctx) {
    if (!fetchMap) {
      debug(
        'registerFetcher called with %s not in pathsMap',
        path
      );
      return;
    }
    debug(
      'registering %s for path %s',
      ctx,
      path
    );

    return fetchMap.set(ctx.name, ctx);
  }
};

export const Translate = {
  serialize(stores) {
    return Rx.Observable.from(stores.values())
      .filter(store => !!store.displayName)
      .filter(store => !!store.__value)
      .map(store => ({ [store.displayName]: store.__value }))
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
      })
      .tapOnNext((val) => {
        debug('got %s for dats', val);
      });
  },

  deserialize(stores, stringyCatState) {
    const stateMapObservable = Rx.Observable.of(stringyCatState)
      .tap((stringyCatState) => {
        invariant(
          typeof stringyCatState === 'string',
          'deserialize expects a string but got %s',
          stringyCatState
        );
      })
      .map(stringyCatState => JSON.parse(stringyCatState))
      .tap((catState) => {
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

export function setPath(cat, path) {
  cat.activePath = path;
  /* istanbul ignore else */
  if (!cat.paths.has(path)) {
    cat.paths.set(path, new Map());
  }
  return cat;
}

export function fetch(path, fetchMap, stores) {
  if (!fetchMap) {
    debug('Cat found no map for %s fetch', path);
    return Rx.Observable.return({});
  }
  let ctxValues = Rx.Observable.from(fetchMap.values());
  let fetchValues = ctxValues.map(function(ctx) {
    return {
      fetcher: ctx.action,
      payload: ctx.payload
    };
  });

  let storesObs = ctxValues
    .map(ctx => {
      return ctx.name;
    })
    .map((name) => {
      return {
        store: stores.get(name),
        name: name
      };
    })
    .tap(({ store, name }) => {
      if (!store) {
        debug('found no store for %', name);
      }
    })
    .filter(({ store }) => {
      // check for positive values
      // Map.get will return undefined for stores not found.
      return !!store;
    })
    .toArray();

  debug('init individual fetchers');
  fetchValues.subscription( ({ fetcher, payload = {}}) => {
    fetcher(payload);
  });
  debug('init complete');
  return waitFor(storesObs);
}

export default class Cat {
  constructor() {
    this.stores = new Map();
    this.actions = new Map();
    this.paths = new Map();
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

    let name = StoreOrActions.displayName ||
      StoreOrActions.prototype.displayName;

    invariant(
      typeof name === 'string',
      'Attempted to add a Store/Actions that does not have a displayName'
    );

    let isStore = Store.isPrototypeOf(StoreOrActions);
    var args = [].slice.call(arguments);

    return isStore ?
      Register.store(this.stores, name, StoreOrActions, args) :
      Register.actions(this.actions, name, StoreOrActions, args);
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

  // ### register a fetcher
  //
  // adds the fetcher and its intended payload with the current active path
  // along with the store that listens for the response from the fetch
  registerFetcher(ctx) {
    const fetchMap = this.paths.get(this.activePath);
    return Register.fetcher(fetchMap, this.activePath, ctx);
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
  // but will also initiate data fetchers for the current path.
  // returns an observable that reponds with the data for this path and the
  // markup
  renderToString(Component, ctx) {
    return RenderToString(this, Component, ctx);
  };
}
