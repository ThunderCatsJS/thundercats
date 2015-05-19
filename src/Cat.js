import Rx from 'rx';
import invariant from 'invariant';
import warning from 'warning';
import debugFactory from 'debug';

import Store from './Store';
import Actions from './Actions';
import Translate from './Translate';
import Render from './Render';

const debug = debugFactory('thundercats:cat');

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
    return Render.render(this, Component, DOMContainer);
  }

  renderToString(Component) {
    return Render.renderToString(this, Component);
  };
}
