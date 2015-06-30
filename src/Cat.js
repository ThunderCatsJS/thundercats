import Rx from 'rx';
import invariant from 'invariant';
import warning from 'warning';
import debugFactory from 'debug';

import Translate from './Translate';
import { getName, getNameOrNull, isStore } from './utils';

const debug = debugFactory('thundercats:cat');

export function Register(map, Constructor, constructorArgs) {
  const name = getName(Constructor);
  if (map.has(name.toLowerCase())) {
    return warning(
      false,
      'Attempted to add a class, %s, that already exists',
      name
    );
  }
  const instance =
    new (Function.prototype.bind.apply(Constructor, constructorArgs));
  debug('registering store %s', name);
  map.set(name.toLowerCase(), instance);
  return map;
}

export default class Cat {
  constructor() {
    this.stores = new Map();
    this.actions = new Map();
  }

  register(StoreOrActions) {
    let name = getNameOrNull(StoreOrActions);

    invariant(
      typeof name === 'string',
      'Attempted to add a Store/Actions that does not have a displayName'
    );

    return Register(
      isStore(StoreOrActions) ? this.stores : this.actions,
      StoreOrActions,
      [...arguments]
    );
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
}
