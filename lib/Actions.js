// # ThunderCats Action
import Rx from 'rx';
import invariant from 'invariant';
import assign from 'object.assign';
import debugFactory from 'debug';

import waitFor from './waitFor';

const debug = debugFactory('thundercats:actions');

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

    function action(value) {
      /* istanbul ignore else */
      if (typeof map === 'function') {
        value = map(value);
      }

      actionStart.onNext(value);
      observers.forEach((observer) => {
        observer.onNext(value);
      });

      return value;
    }

    action.displayName = name;
    action.observers = observers;
    assign(action, Rx.Observable.prototype, Rx.Subject.prototype);

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
  constructor(actionNames) {
    this.displayName = this.displayName || this.constructor.displayName;
    if (actionNames) {
      invariant(
        Array.isArray(actionNames) &&
        actionNames.every(actionName => typeof actionName === 'string'),
        '%s should get an array of strings but got %s',
        actionNames
      );
    }
    let actionDefs = getActionNames(this)
      .map(name => ({ name: name, map: this[name] }));

    if (actionNames) {
      actionDefs = actionDefs.concat(actionNames.map(name => ({ name })));
    }

    invariant(
      actionDefs.length,
      'Actions Class %s instantiated without any actions defined!',
      this.displayName
    );

    ActionCreator.createManyOn(this, actionDefs);
  }
}
