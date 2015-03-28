// # ThunderCats Action
//
// A ThunderCats Action is an Observable that can be called like a function!
var Rx = require('rx'),
    invariant = require('invariant'),
    assign = require('object.assign'),
    slice = Array.prototype.slice;

function Action() {
  var actionDefs = this.__getActionNames()
    .map(function(name) {
      return {
        name: name,
        map: this[name]
      };
    }.bind(this));

  Action.createActions(actionDefs, this);
}

Action.prototype.__getActionNames = function() {
  var ctx = this;
  invariant(
    ctx instanceof Action,
    'internal method `getActionNames` called outside of Actions instance'
  );

  return Object.getOwnPropertyNames(ctx.constructor.prototype)
    .filter(function(name) {
      return name !== 'constructor' &&
        name.indexOf('__') === -1 &&
        typeof ctx[name] === 'function';
    });
};

// ## create
//
// Create a single action object
// Takes a single function `map` as an argument which will be applied
// to each payload fed to this action. You can this of this as an action
// creator in a traditional flux implementation
Action.create = function(map) {
  var observers = [];

  var actionStart = new Rx.Subject();
  var actionEnd = new Rx.Subject();

  var action = function (value) {
    if (typeof map === 'function') {
      value = map(value);
    }

    actionStart.onNext(value);
    var os = observers.slice(0);
    for (var i = 0, len = os.length; i < len; i++) {
      os[i].onNext(value);
    }
    actionEnd.onNext();

    return value;
  };

  assign(action, Rx.Observable.prototype, Rx.Subject.prototype);

  Rx.Observable.call(action, function (observer) {
    observers.push(observer);
    return {
      dispose: function () {
        var index = observers.indexOf(observer);
        if (index !== -1) {
          observers.splice(index, 1);
        }
      }
    };
  });

  // ### Has Observers
  //
  // returns the current number of observers for this action
  action.hasObservers = function () {
    return observers.length > 0 ||
      actionStart.hasObservers() ||
      actionEnd.hasObservers();
  };

  // ### Wait For
  //
  // takes observables as arguments and will
  // wait for each observable to publish a new value until
  // All the observers of this action are notified of the new value
  action.waitFor = function (observables) {
    observables = slice.call(arguments);
    return actionStart
      .flatMap(function (value) {
        return Rx.Observable.combineLatest(
          observables.map(function (observable) {
            observable = observable.takeUntil(actionEnd).publish();
            observable.connect();
            return observable;
          }),
          function () {
            return value;
          }
        );
      });
  };

  return action;
};

// ## Create Actions
//
// Create Actions is a helper function to create multiple actions at once.
// It can take a string which will create one action,
// an Array of strings,
// or an Array of objects with the keys `name` and `map`.
// This will return an object with a action functions as methods
Action.createActions = function(actions, ctx) {
  ctx = ctx || {};
  invariant(
    typeof ctx === 'object',
    'thisArg supplied to createActions must be an object but got %s',
    ctx
  );

  if (typeof actions === 'string') {
    actions = [actions];
  }

  if (Array.isArray(actions)) {
    actions.reduce(function(ctx, action) {
      if (typeof action === 'string') {
        ctx[action] = Action.create();
      } else {
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

        if (action.map) {
          invariant(
            typeof action.map === 'function',
            'createActions requires objects with map field to be a function ' +
            'but was given %s',
            action.map
          );
        }

        ctx[action.name] = Action.create(action.map);
      }
      return ctx;
    }, ctx);
  } else {
    throw new TypeError(
      'Action.createActions expects a string or an array but got %s',
      actions
    );
  }

  return ctx;
};

module.exports = Action;
