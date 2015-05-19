import Rx from 'rx';
import assign from 'object.assign';
import invariant from 'invariant';
import debugFactory from 'debug';
import { createObjectValidator } from './utils';

const debug = debugFactory('thundercats:translate');

export default {
  dehydrate(storesObservable) {
    return storesObservable
      .filter(store => !!store.displayName)
      .filter(store => !!store.value)
      .map(store => ({ [store.displayName]: store.value }))
      .reduce((allDats, storeDats) => {
        return assign(allDats, storeDats);
      }, {})
      .map(allDats => {
        return allDats;
      })
      .tapOnError((err) => {
        debug('an error occurred while dehydrating stores', err);
      });
  },

  hydrate(storesObservable, catStateObservable) {
    return Rx.Observable.combineLatest([
        storesObservable,
        catStateObservable.tap(
          createObjectValidator('hydrate should get objects but got %s')
        )
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
          'hydrate for %s state was not an object but %s',
          store.displayName,
          data
        );
      })
      .map(({ store, data }) => store.value = data)
      .lastOrDefault()
      .map(() => true)
      .do(
        null,
        (err) => debug('deserialize encountered a err', err),
        () => debug('deserialize completed')
      );
  },

  deserialize(storesObservable, stringyCatStateObservable) {
    const catStateObservable = stringyCatStateObservable
      .tap(stringyCatState => {
        invariant(
          typeof stringyCatState === 'string',
          'deserialize expects a string but got %s',
          stringyCatState
        );
      })
      .map(stringyCatState => JSON.parse(stringyCatState))
      .tap(catState => {
        invariant(
          typeof catState === 'object',
          'parsed value of deserialize argument should be an object or ' +
          'null but got %s',
          catState
        );
      });

    return this.hydrate(storesObservable, catStateObservable);
  },

  serialize(storesObservable) {
    return this.dehydrate(storesObservable)
      .map(allDats => JSON.stringify(allDats))
      .map(allDats => typeof allDats === 'string' ? allDats : '{}')
      .tapOnError((err) => {
        debug('an error occurred while stringifing stores', err);
      });
  }
};
