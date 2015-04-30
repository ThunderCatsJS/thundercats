// # ThunderCats Action
import Rx from 'rx';
import invariant from 'invariant';
import assign from 'object.assign';
import debugFactory from 'debug';

import { areObservable } from './utils';

const debug = debugFactory('thundercats:actions');
const slice = Array.prototype.slice;

export function getActionNames(ctx) {
  return Object.getOwnPropertyNames(ctx.constructor.prototype)
    .filter(name => {
      return (
        name !== 'constructor' &&
        name.indexOf('_') === -1 &&
        typeof ctx[name] === 'function'
      );
    });
}

export const ActionCreator = {
  create(name, map) {
    let observers = [];
    let actionStart = new Rx.Subject();
    let actionEnd = new Rx.Subject();

    function action(value) {
      /* istanbul ignore else */
      if (typeof map === 'function') {
        value = map(value);
      }

      actionStart.onNext(value);
      let os = observers.slice(0);
      for (let i = 0, len = os.length; i < len; i++) {
        os[i].onNext(value);
      }
      actionEnd.onNext();

      return value;
    }

    action.displayName = name;
    action.observers = observers;
    assign(action, Rx.Observable.prototype, Rx.Subject.prototype);

    Rx.Observable.call(action, observer => {
      observers.push(observer);
      return {
        dispose: () => {
          observers.splice(observers.indexOf(observer), 1);
        }
      };
    });

    action.hasObservers = function hasObservers() {
      return observers.length > 0 ||
        actionStart.hasObservers() ||
        actionEnd.hasObservers();
    };

    action.waitFor = function(observables) {
      observables = slice.call(arguments);

      invariant(
        areObservable(observables),
        'action.waitFor takes only observables as arguments'
      );

      return actionStart
        .flatMap(function (value) {
          return Rx.Observable.combineLatest(
            observables.map(function (observable) {
              observable = observable.publish();
              observable.connect();
              return observable;
            }),
            function () {
              return value;
            }
          );
        });
    };

    debug('action %s created', action.displayName);
    return action;
  },

  createManyOn(ctx, actions) {
    invariant(
      typeof ctx === 'object',
      'thisArg supplied to createActions must be an object but got %s',
      ctx
    );

    invariant(
      Array.isArray(actions),
      'createActions requires an array of objects but got %s',
      actions
    );

    let actionsBag = actions.reduce(function(ctx, action) {
      invariant(
        typeof action === 'object',
        'createActions requires items in array to be either strings ' +
        'or objects but was supplied with %s',
        action
      );

      invariant(
        typeof action.name === 'string',
        'createActions requires objects to have a name key, but got %s',
        action.name
      );

      /* istanbul ignore else */
      if (action.map) {
        invariant(
          typeof action.map === 'function',
          'createActions requires objects with map field to be a function ' +
          'but was given %s',
          action.map
        );
      }

      ctx[action.name] = ActionCreator.create(action.name, action.map);
      return ctx;
    }, {});

    return assign(ctx, actionsBag);
  }
};

export default class Actions {
  constructor() {
    this.displayName = this.constructor.displayName;
    let actionDefs = getActionNames(this)
      .map(name => ({ name: name, map: this[name] }));

    invariant(
      actionDefs.length >= 1,
      'Actions Class %s instantiated without any actions defined!',
      this.displayName
    );

    ActionCreator.createManyOn(this, actionDefs);
  }
}
