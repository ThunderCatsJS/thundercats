import { Observable } from 'rx';
import invariant from 'invariant';
import debugFactory from 'debug';
import {
  createObjectValidator,
  getName,
  getNameOrNull,
  isKitten
} from './utils';

const assign = Object.assign;
const __DEV__ = process.env.NODE_ENV === 'development';
const debug = debugFactory('thundercats:translate');

export function dehydrate(cat) {
  if (__DEV__) {
    invariant(
      isKitten(cat),
      'dehydrate should get an instance of the cat, but got %s',
      cat
    );
  }

  return Observable.from(cat.stores.values())
    // store must have displayName and value
    .filter(store => !!getNameOrNull(store) && !!store.value)
    .map(store => ({ [getName(store)]: store.value }))
    .reduce((allDats, storeDats) => {
      return assign(allDats, storeDats);
    }, {})
    .map(allDats => {
      return allDats;
    })
    .tapOnError((err) => {
      debug('an error occurred while dehydrating stores', err);
    });
}

export function hydrate(cat, storesState) {
  if (__DEV__) {
    invariant(
      isKitten(cat),
      'dehydrate should get an instance of the cat, but got %s',
      cat
    );
  }

  return Observable.combineLatest([
    Observable.from(cat.stores.values()),
    Observable.just(storesState).tap(
      createObjectValidator('hydrate should get objects but got %s')
    )
  ],
  (store, stateMap) => {
    return {
      store,
      data: stateMap[getNameOrNull(store)]
    };
  })
    // filter out falsey data and non objects
    .filter(({ data }) => data && typeof data === 'object')
    // assign value to store
    .tap(({ store, data }) => {
      debug(
        'updating %s with value: ',
        getName(store),
        data
      );
      store.value = data;
    })
    // wait to run through all the stores
    .do(
      null,
      (err) => debug('deserialize encountered a err', err),
      () => debug('deserialize completed')
    )
    .last()
    .map(() => cat);
}
