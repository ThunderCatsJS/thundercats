// # The Cat
//
const Rx = require('rx'),
    React = require('react'),
    invariant = require('invariant'),
    warning = require('warning'),
    debug = require('debug')('thundercats:cat'),
    ContextWrapper = require('./ContextWrapper'),
    Store = require('./store'),
    waitFor = require('./waitFor'),
    {
      isActions
    } = require('../utils');

class Cat {
  constructor() {
    this._stores = new Map();
    this._actions = new Map();
    this._pathsMap = new Map();
    this._render = Rx.Observable.fromNodeCallback(React.render, React);
  }

  // ### add a store to Cat.
  //
  // This takes as the first argument a Store with ThunderCats
  // Store as its base.
  // The rest of the arguments are used to instantiate the store.
  // The Cat then takes this store and instantiates it with the arguments
  // provided and adds it to its list of stores.
  //
  setStore(_Store) {
    invariant(
      Store.prototype.isPrototypeOf(_Store),
      'Attempted to add a store that does not have A ThunderCats ' +
      'store as its base'
    );

    let name = _Store.name || _Store.prototype.name;

    invariant(
      name,
      `Attempted to add a store that does not have name, stores must have names
      Either add a static property to your Store class
      MyStore.name = 'MyStore', or as a prototype property
      MyStore.prototype.name = 'MyStore'`
    );

    if (this._stores.has(name)) {
      return warning(
        false,
        'Attempted to add a store, %s, that already exists in the Cat',
        name
      );
    }
    // Some wizardry. Create a new instance of 'MyStore' with a variable number
    // of arguments provided by the user
    let storeIns = new (Function.prototype.bind.apply(_Store, arguments));
    this._stores.add(name, storeIns);
  };

  // ### get store
  //
  // returns a store instance if found
  // otherwise returns undefined
  getStore(store) {
    return this._stores.get(store);
  }

  // ### set action
  //
  // Takes an actions class as a first argument
  // and the rest of the arguments are passed to the constructor of the action
  // class.
  setAction(Actions) {
    invariant(
      isActions(Actions),
      'attempted to add an action object that is does not have a ' +
      'ThunderCats Action class as its base.'
    );

    let name = Actions.name || Actions.constructor.name;

    invariant(
      name,
      'attempted to add an Action class with no name, Actions must have ' +
      'names to use them with the Cat'
    );

    if (this._actions.has(name)) {
      return warning(
        false,
        'attempted to add an Action, %s, to the Cat that it already exists'
      );
    }

    let actions = new (Function.prototype.bind.apply(Actions, arguments));
    this._actions.add(name, actions);
  }

  // ### Get Actions
  //
  // returns the instance of actions class if it exist
  // otherwise returns undefined;
  getAction(action) {
    return this._actions.get(action);
  };

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
  _registerFetcher(fetchAction, ctx) {
    let fetchMap = this._pathsMap.get(this._activePath);
    fetchMap.add(ctx.fetchName, {
      fetchName: ctx.fetchName,
      fetcher: fetchAction,
      fetchPayload: ctx.fetchPayload,
      store: ctx.storeName
    });
  }

  // ### do fetch
  //
  // activates each fetcher and then waits for the response from the stores
  // returns an observable that responds with the value of the stores in
  // question once they have responded. If stores haven't responded within 3
  // seconds the observable throws.
  _doFetch(ctx) {
    let fetchMap = this._pathsMap.get(ctx.path);
    let ctxValues = Rx.Observable.from(fetchMap.values());
    let fetchValues = ctxValues.map(function(ctx) {
      return {
        fetcher: ctx.fetcher,
        payload: ctx.fetchPayload
      };
    });

    let stores = ctxValues
      .map(ctx => {
        return ctx.storeName;
      })
      .map(this._getStore.bind(this))
      .filter(store => {
        // check for positive values
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
    let Burrito = this._wrap(Component);
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
    const Burrito = this._wrap(Component);

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

  // ### wrap
  //
  // Adds this instance of the Cat on the context object
  _wrap(Component) {
    invariant(
      React.isValidElement(Component),
      'cat.renderToString and render expects a valid React element'
    );
    return React.createElement(
      ContextWrapper,
      { cat: this },
      Component
    );
  }
}
module.exports = Cat;
