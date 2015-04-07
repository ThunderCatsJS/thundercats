// # The Cat
//
// # fetch
// Should get store for path
// Should get fetch actions for path
// Should call
const Rx = require('rx'),
    React = require('react'),
    invariant = require('invariant'),
    warning = require('warning'),
    ContextWrapper = require('./ContextWrapper'),
    Actions = require('./Actions'),
    Store = require('./store'),
    {
      isActions
    } = require('../utils');
    // waitFor = require('./waitFor');

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
  // otherwise returns false;
  getAction(action) {
    return this._actions.get(action);
  };

  // register current path
  // This can be any string but should be a string that uniquely identifies the
  // current component being rendered
  _setCurrentPath(path) {
    this._activePath = path;
    this._setPath(path);
  }

  // tracks active stores for a given path
  _setPath(path) {
    if (!this._pathsMap.has(path)) {
      this._pathsMap.set(path, new Set());
    }
  }

  // registers store for current path
  _setActiveStore(store) {
    this._pathsMap.get(this._activePath).add(store);
  }

  // A store that updates according to recipient
  _setFetch() {
  }

  _setActiveFetcher() {
  }

  render(Component, DOMContainer, ctx) {
    let Burrito = this._wrap(Component);
    this._setCurrentPath(ctx.path);
    return this._render(Burrito, DOMContainer);
  }

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

  _wrap(Component) {
    invariant(
      React.isValidElement(Component),
      'cat.renderToString expects a valid React element'
    );
    return React.createElement(
      ContextWrapper,
      { cat: this },
      Component
    );
  }
}
module.exports = Cat;
