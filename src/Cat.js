import stampit from 'stampit';
import invariant from 'invariant';
import warning from 'warning';
import debugFactory from 'debug';

import { getName, getNameOrNull, isStore } from './utils';

const debug = debugFactory('thundercats:cat');

export function Register(map, Factory, constructorArgs) {
  const name = getName(Factory);
  if (map.has(name.toLowerCase())) {
    return warning(
      false,
      'Attempted to add a class, %s, that already exists',
      name
    );
  }
  const instance = Factory.apply(null, constructorArgs);
  debug(
    'registering %s %s',
    isStore(Factory) ? 'store' : 'action',
    name
  );
  map.set(name.toLowerCase(), instance);
  return map;
}

const methods = {
  register(StoreOrActions, ...args) {
    let name = getNameOrNull(StoreOrActions);

    invariant(
      typeof name === 'string',
      'Attempted to add a Store/Actions that does not have a displayName'
    );

    return Register(
      isStore(StoreOrActions) ? this.stores : this.actions,
      StoreOrActions,
      args
    );
  },

  getStore(store) {
    return this.stores.get(('' + store).toLowerCase());
  },

  getActions(action) {
    return this.actions.get(('' + action).toLowerCase());
  },

  get(storeOrActions) {
    const possibleStore = this.getStore(storeOrActions);
    return possibleStore ? possibleStore : this.getActions(storeOrActions);
  }
};

export default function Cat() {
  return stampit()
    .init(({ instance }) => {
      instance.stores = new Map();
      instance.actions = new Map();
    })
    .methods(methods);
}
