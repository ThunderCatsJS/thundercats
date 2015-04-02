var Rx = require('rx'),
    React = require('react'),
    invariant = require('invariant'),
    warning = require('warning'),
    ContextWrapper = require('./ContextWrapper'),
    Action = require('./action'),
    Store = require('./store');
    // waitFor = require('./waitFor');

class Cat {
  constructor() {
    this._stores = new Map();
    this._actions = new Map();
    this._waitForFetch = new WeakSet();
    this._render = Rx.Observable.fromNodeCallback(React.render, React);
  }

  render(Component, DOMContainer, ctx) {
    var Burrito = this._wrap(Component);
    // check cash for context
    return this._render(Burrito, DOMContainer);
  }

  renderToString(Component, ctx) {
    // wrap component in contextWrapper
    var Burrito = this._wrap(Component);
    // register route
    // start fetching process
    React.renderToStaticMarkup(Burrito);
    // end registration process being waitFor and return observable
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

  getStore() {
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

    var name = _Store.name || _Store.prototype.name;

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
    var storeIns = new (Function.prototype.bind.apply(_Store, arguments));
    this._stores.add(name, storeIns);
  };

  getAction() {
  };

  setAction(_Action) {
    invariant(
      Action.prototype.isPrototypeOf(_Action),
      'attempted to add an action object that is does not have a ' +
      'ThunderCats Action class as its base.'
    );

    var name = _Action.name || _Action.prototype.name;

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

    var _actions = new (Function.prototype.bind.apply(_Action, arguments));
    this._actions.add(name, _actions);
  }

  // register current route
  // This can be any string but should be a string that uniquely identifies the
  // current component being rendered
  _registerCurrentRoute() {
  }

  // tracks all routes of the app
  // this is used to check if a route has data already in cache
  _registerRoute() {
  }
  // registers store for current route
  _registerActiveStore() {
  }

  // A store that updates according to recipient
  _registerFetchStore() {
  }
}
module.exports = Cat;
