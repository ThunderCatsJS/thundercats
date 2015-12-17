import stampit from 'stampit';
import debugFactory from 'debug';
import {
  Observable,
  Subject,
  Disposable,
  CompositeDisposable,
  helpers
} from 'rx';

import waitFor from './waitFor';

const { checkDisposed } = Disposable;
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
  const observers = [];
  const actionDisposable = new CompositeDisposable();
  const actionStart = new Subject();
  const maybeBound = shouldBind ?
    map.bind(this) :
    map;

  function action(value) {
    // throw if disposed observable is retried
    checkDisposed(action);
    if (action.isStopped) {
      debug('%s called after being stopped', name);
      return value;
    }

    // NOTE: if an error is thrown in the mapping function
    // this will cause the stream to collapse
    // and the action will no longer be observable
    // nor will the observers listen as they have been stopped by
    // the error
    const mapDisposable = Observable.just(value)
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
      .subscribe(
        () => debug('%s onNext', name),
        err => {
          // observables returned by the mapping function must use
          // a catch to prevent the action from collapsing the stream
          action.error = err;
          action.isStopped = true;
          action.hasError = true;

          // notify action observers of error
          observers.forEach(observer => observer.onError(err));
          // observers will no longer listen after pushing error
          // as the stream has collapsed
          // so we remove them
          observers.length = 0;
        }
      );

    actionDisposable.add(mapDisposable);
    return value;
  }

  action.isDisposed = false;
  action.isStopped = false;
  action.displayName = name;
  action.observers = observers;
  assign(action, Observable.prototype);

  action.hasObservers = function hasObservers() {
    // in next major version this should throw if already disposed
    // in order to better follow RxJS conventions
    //
    // checkDisposed(action);

    return !!(
      observers.length > 0 ||
      actionStart.observers &&
      actionStart.observers.length > 0
    );
  };

  action.waitFor = function() {
    return actionStart
      .flatMap(payload => waitFor(...arguments).map(() => payload));
  };

  action._subscribe = function subscribeToAction(observer) {
    // in next major version this should check if action
    // has been stopped or disposed and act accordingly
    observers.push(observer);
    return new Disposable(() => {
      observers.splice(observers.indexOf(observer), 1);
    });
  };

  const subscription = new Disposable(() => {
    observers.length = 0;
    action.isDisposed = true;
    actionStart.dispose();
    actionDisposable.dispose();
  });

  action.dispose = () => subscription.dispose();

  Observable.call(action);

  debug('%s created', action.displayName);
  return {
    action,
    subscription
  };
}

export function createMany(shouldBind, instance, compositeDisposable) {
  return this
    .map(create.bind(instance, shouldBind))
    .reduce((ctx, { action, subscription }) => {
      compositeDisposable.add(subscription);
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
      const actionsDisposable = new CompositeDisposable();
      const actionMethods = getActionDef(obj)
        ::createMany(shouldBind, instance, actionsDisposable);

      return assign(
        instance,
        actionMethods,
        { dispose() { actionsDisposable.dispose(); } }
      );
    })
    .refs(refs)
    .props(props)
    .static(statics)
    .init(init);
}
