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
import { isString } from './utils';

const debug = debugFactory('thundercats:cat');

class Cat {
  constructor() {
    this._stores = new Map();
    this._actions = new Map();
    this._pathsMap = new Map();
    this._render = Rx.Observable.fromNodeCallback(React.render, React);
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

    debug('is a store: %s', isStore);
    var args = [].slice.call(arguments);

    return isStore ?
      this._registerStore(name, StoreOrActions, args) :
      this._registerActions(name, StoreOrActions, args);
  }

  _registerStore(name, ExtendStore, args) {
    if (this._stores.has(name.toLowerCase())) {
      return warning(
        false,
        'Attempted to add a Store class, %s, that already exists in the Cat',
        name
      );
    }
    let store =
      new (Function.prototype.bind.apply(ExtendStore, args));
    debug('registering store %s', name);
    this._stores.set(name.toLowerCase(), store);
    return store;
  }

  _registerActions(name, ExtendedActions, args) {
    if (this._actions.has(name.toLowerCase())) {
      return warning(
        false,
        'Attempted to add an Actions class, %s, that already exists in the Cat',
        name
      );
    }
    let actions =
      new (Function.prototype.bind.apply(ExtendedActions, args));
    debug('registering actions %s', name);
    this._actions.set(name.toLowerCase(), actions);
    return actions;
  }

  // ### get store
  //
  // returns a store instance if found
  // otherwise returns undefined
  getStore(store) {
    let _store = isString(store) ?
      store.toLowerCase() :
      store;
    return this._stores.get(_store);
  }

  // ### Get Actions
  //
  // returns the instance of actions class if it exist
  // otherwise returns undefined;
  getActions(action) {
    let _action = isString(action) ?
      action.toLowerCase() :
      action;
    return this._actions.get(_action);
  }

  // ### serialize
  //
  // Get the state of all the stores in string.
  // returns a cold observable
  serialize() {
    return Rx.Observable.from(this._stores.values())
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
  }

  deserialize(stringyCatState) {
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
        Rx.Observable.from(this._stores.values()),
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

  // ### set current path
  //
  // register current path
  // This can be any string but should be a string that uniquely identifies the
  // current component being rendered
  _setCurrentPath(path) {
    this._activePath = path;
    this._setPath(path);
  }

  // ### set path
  //
  // Adds path to the map!
  _setPath(path) {
    if (!this._pathsMap.has(path)) {
      this._pathsMap.set(path, new Map());
    }
  }

  // ### register a fetcher
  //
  // adds the fetcher and its intended payload with the current active path
  // along with the store that listens for the response from the fetch
  _registerFetcher(ctx) {
    let fetchMap = this._pathsMap.get(this._activePath);
    if (!fetchMap) {
      debug(
        'registerFetcher called with %s not in pathsMap',
        this._activePath
      );
      return;
    }
    debug(
      'registering %s for path %s',
      ctx,
      this._activePath
    );
    fetchMap.set(ctx.name, ctx);
  }

  // ### do fetch
  //
  // activates each fetcher and then waits for the response from the stores
  // returns an observable that responds with the value of the stores in
  // question once they have responded. If stores haven't responded within 3
  // seconds the observable throws.
  _doFetch(ctx) {
    let fetchMap = this._pathsMap.get(ctx.path);
    if (!fetchMap) {
      debug('Cat found no map for %s fetch', ctx.path);
      return;
    }
    let ctxValues = Rx.Observable.from(fetchMap.values());
    let fetchValues = ctxValues.map(function(ctx) {
      return {
        fetcher: ctx.action,
        payload: ctx.payload
      };
    });

    let stores = ctxValues
      .map(ctx => {
        return ctx.name;
      })
      .map((name) => {
        return {
          store: this._getStore(name),
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
    return waitFor(stores);
  }

  // ### render
  //
  // Wraps the component being rendered and sets this cat instance on the
  // context object.
  // calls React.render and returns an observable that responds with the
  // instance of the component.
  render(Component, DOMContainer, ctx) {
    let Burrito = ContextWrapper.wrap(Component);
    this._setCurrentPath(ctx.path);
    return this._render(Burrito, DOMContainer);
  }

  // ### renderToString
  //
  // Wrap component in and sets this cat instance on the context, same as above,
  // but will also initiate data fetchers for the current path.
  // returns an observable that reponds with the data for this path and the
  // markup
  renderToString(Component, ctx) {
    const render = Rx.Observable.fromNodeCallback(React.render, React);

    // Set current path
    this._setCurrentPath(ctx.path);

    // wrap component in contextWrapper
    const Burrito = ContextWrapper.wrap(Component);

    // set active stores and fetchers
    React.renderToStaticMarkup(Burrito);
    // initial render populated stores and fetch actions to call
    return this._doFetch(ctx).flatMap(function() {
      return render(Burrito);
    }, function(data, markup) {
        return {
          markup,
          data
        };
    });
  }
}

export default Cat;
