import Rx from 'rx';
import stampit from 'stampit';
import debugFactory from 'debug';

import waitFor from './waitFor';

const debug = debugFactory('thundercats:actions');
const protectedProperties = [
  'displayName',
  'constructor'
];

export function getActionDef(ctx) {
  return Object.getOwnPropertyNames(ctx)
    .filter(name => {
      return (
        protectedProperties.indexOf(name) === -1 &&
        name.indexOf('_') === -1
      );
    })
    .map(name => ({ name: name, map: ctx[name] }))
    .map(def => {
      if (typeof def.map !== 'function') {
        def.map = Rx.helpers.identity;
      }
      return def;
    });
}


export function create({ name, map }) {
  let observers = [];
  let actionStart = new Rx.Subject();

  function action(value) {
    let err = null;
    try {
      value = map(value);
    } catch(e) {
      err = e;
    }

    actionStart.onNext(value);
    observers.forEach((observer) => {
      if (err) {
        return observer.onError(err);
      }
      observer.onNext(value);
    });

    return value;
  }

  action.displayName = name;
  action.observers = observers;
  stampit.mixin(action, Rx.Observable.prototype);

  action.hasObservers = function hasObservers() {
    return observers.length > 0 ||
      actionStart.hasObservers();
  };

  action.waitFor = function() {
    return actionStart
      .flatMap(payload => waitFor(...arguments).map(() => payload));
  };

  Rx.Observable.call(action, observer => {
    observers.push(observer);
    return new Rx.Disposable(() => {
      observers.splice(observers.indexOf(observer), 1);
    });
  });

  debug('action %s created', action.displayName);
  return action;
}

export function createMany() {
  return this
    .map(create)
    .reduce((ctx, action) => {
      ctx[action.displayName] = action;
      return ctx;
    }, {});
}

export default function Actions(obj = {}) {
  return stampit()
    .refs({ displayName: obj.displayName })
    .init(({ instance }) => {
      const actionMethods = getActionDef(obj)::createMany();
      return stampit.mixin(instance, actionMethods);
    });
}
