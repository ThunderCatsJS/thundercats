import { Observable, Subject, Disposable, helpers } from 'rx';
import stampit from 'stampit';
import debugFactory from 'debug';

import waitFor from './waitFor';

const assign = Object.assign;
const debug = debugFactory('thundercats:actions');
const currentStampSpec = [
  'methods',
  'statics',
  'props',
  'refs',
  'init',
  'compose',
  'create',
  'isStamp'
];

const protectedProperties = [
  'shouldBindMethods',
  'displayName',
  'constructor'
].join(currentStampSpec);

export function getActionDef(ctx) {
  return Object.getOwnPropertyNames(ctx)
    .filter(name => {
      return protectedProperties.indexOf(name) === -1 &&
        name.indexOf('_') === -1;
    })
    .map(name => ({ name: name, map: ctx[name] }))
    .map(def => {
      if (typeof def.map !== 'function') {
        def.map = helpers.identity;
      }
      return def;
    });
}


export function create(shouldBind, { name, map }) {
  let observers = [];
  let actionStart = new Subject();
  let maybeBound = shouldBind ?
    map.bind(this) :
    map;

  function action(value) {
    Observable.just(value)
      .map(maybeBound)
      .flatMap(value => {
        if (Observable.isObservable(value)) {
          return value;
        }
        return Observable.just(value);
      })
      // notify of action start
      .do(value => actionStart.onNext(value))
      // notify action observers
      .doOnNext(
        value => observers.forEach(observer => observer.onNext(value))
      )
      // notify action observers of error
      .doOnError(
        value => observers.forEach(observer => observer.onError(value))
      )
      // prevent error from calling on error
      .catch(e => Observable.just(e))
      .subscribe(
        () => debug('action % onNext', name)
      );

    return value;
  }

  action.displayName = name;
  action.observers = observers;
  assign(action, Observable.prototype);

  action.hasObservers = function hasObservers() {
    return observers.length > 0 ||
      actionStart.hasObservers();
  };

  action.waitFor = function() {
    return actionStart
      .flatMap(payload => waitFor(...arguments).map(() => payload));
  };

  action._subscribe = function subscribeToAction(observer) {
    observers.push(observer);
    return new Disposable(() => {
      observers.splice(observers.indexOf(observer), 1);
    });
  };

  Observable.call(action);

  debug('action %s created', action.displayName);
  return action;
}

export function createMany(shouldBind, instance) {
  return this
    .map(create.bind(instance, shouldBind))
    .reduce((ctx, action) => {
      ctx[action.displayName] = action;
      return ctx;
    }, {});
}

export default function Actions(obj = {}) {
  const {
    shouldBindMethods: shouldBind,
    init = [],
    props = {},
    refs = {},
    statics = {}
  } = obj;

  return stampit()
    .init(({ instance }) => {
      const actionMethods = getActionDef(obj)::createMany(shouldBind, instance);
      return assign(instance, actionMethods);
    })
    .refs(refs)
    .props(props)
    .static(statics)
    .init(init);
}
