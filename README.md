[![Circle CI](https://circleci.com/gh/ThunderCatsJS/thundercats.svg?style=svg)](https://circleci.com/gh/ThunderCatsJS/thundercats)
[![Coverage Status](https://coveralls.io/repos/thundercatsjs/thundercats/badge.svg)](https://coveralls.io/r/thundercatsjs/thundercats)
[![NPM version](http://img.shields.io/npm/v/thundercats.svg)](https://npmjs.org/package/thundercats)
[![Join the chat at https://gitter.im/thundercatsjs/thundercats](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/thundercatsjs/thundercats?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)
[![Downloads](http://img.shields.io/npm/dm/thundercats.svg)](https://npmjs.org/package/thundercats)
[![JS.ORG](https://img.shields.io/badge/js.org-thundercats-ffb400.svg?style=flat-square)](http://js.org)
# ThunderCats.js

> ThunderCats, Ho!

[Flux](https://github.com/facebook/flux/) meets [RxJS](https://github.com/Reactive-Extensions/RxJS)

## Why

The [Flux](https://github.com/facebook/flux/) architecture allows you to think
of your application as an unidirectional flow of data, this module aims to
facilitate the use of [RxJS Observable](https://github.com/Reactive-Extensions/RxJS/blob/master/doc/api/core/observable.md)
as basis for defining the relations between the different entities composing
your application.

## How

The main components of Flux are Actions, Stores, and the dispatcher. ThunderCats
replaces the dispatcher with RxJS observables and does away with singletons.

Why get rid of the dispatcher? Actions in ThunderCats are observables and observables dispatch themselves to their observers (or listeners) much better then a singleton dispatcher could. And as a bonus, no actions are composable because observables are composable!

What about stores? Store in ThunderCats are also observables that can be
composed. They observe, or listen, to actions they are interested directly. No
need for it to noop every action.

*What about singletons?*

ThunderCats uses [stampit](https://github.com/stampit-org/stampit)! Stores, Actions, and
Cats (more on this later) are stamp factories that return factories(called stamps).

*But why not es6(2015) classes? Everybody's doing it!*

If everyone jumped off a bridge would you do it, too? Here are some great
articles on why not to use es6 classes or constructors in general.

* [How to Fix the ES6 `class` keyword](https://medium.com/javascript-scene/how-to-fix-the-es6-class-keyword-2d42bb3f4caf)
* [Stop Using Constructor Functions in JavaScript](http://ericleads.com/2012/09/stop-using-constructor-functions-in-javascript/)

Tl;DR `new` and `class` are broken, and borked.

*Wait a second, what are Cats?*

A Cat is just a bag where you can register your store and actions factories. It
is also a stamp factories that create factories that create instances of a cat. By
themselves they are only slightly useful and optional, but combine them with
[ThunderCats-React](https://github.com/berkeleytrue/thundercats-react) and you
can do cool things like server-side render with data pre-fetching and call render
methods using the observable pattern.

## Install

This is a pre-release 2.0.0 version and is currently unstable.

```
npm install thundercats@2.0.0-rc7
```
ThunderCats makes heavy use of es6 Map object. While available in the latest versions of Node.js, io.js and all modern browsers, a great many older browsers will need a polyfill in order to work with ThunderCats.

I recommend using [es6-map](https://www.npmjs.com/package/es6-map) as a polyfill for just the Map object or [babel polyfill](https://babeljs.io/docs/usage/polyfill/) to give you all the es6 goodies!

## Examples!

Check out:

* [TodoMVC](https://github.com/r3dm/thundercats-todomvc) app.
* [Chat App](https://github.com/r3dm/thundercats-chat)
* The source for [The R3DM Consulting](https://github.com/r3dm/r3dm.com) isomorphic app.

## Guide


### Actions

Actions function creates a factory that produces an object with methods that are observable. The methods, which are ThunderCats actions, themselves emit its its payload when called to its observers. You can use Actions class like so...

note: using es6.

```js

import { Actions } from 'thundercats';
import uuid from 'node-uuid';
import { TodoService } from '../services/todo-service';

export default Actions({
  // displayName is needed to use with cats and for debugging but not required otherwise
  displayName: 'TodoActions',
  // this method will be an observable on new instances
  create(text) {
    const todo = {
      id: uuid.v4(),
      text,
      complete: false
    };
    return {
      todo,
      // optimistic update
      promise: TodoService.create(todo)
    };
  }
});

```

The body of the method provides mapping function for every call to the observable method.

i.e.

```js
const todoActions = TodoActions();

todoActions.create.subscribe((data) => {
  console.log(data.todo);
});

todoActions.create('Get Milk');
// => Object {id: "73bdb5ca-3932-437c-9029-6744a9fb612b", text: "Get milk", complete: false}

```

Lets say you wanted to create a bunch of methods, but don't want or care for a mapping function? Well, ThunderCats has you covered. Provide keys with null values (or anything other then a function) and internally ThunderCats will use the identity function as the map

```js
import { Actions } from 'thundercats';

export default Actions({
  displayName: 'ChatActions',
  clickThread: null,
  receiveRawMessages: null
});

// someScript.js

const chatActions = ChatActions();

console.log(typeof chatActions.clickThreads.subscribe); //=> 'function'
console.log(typeof chatActions.recieveRawMessages.subscribe); //=> 'function'

```

----

### Stores

The Store is a stampit factory and returns a stamp that has all the stampit methods. Stores instances are observable objects. They themselves can observe actions and update their value accordingly. Store instanes can also be thought of as a reduce function. They take the input from 0 - n observables and reduces them down to one value object. This can be passed to your component (or whatever you want)!

```js

// todosStore
import { Store } from 'thundercats';

// the initial argument to the Store stamp will be the initial value held by the
// store
export default Store({ todosMap: {} })
    // we are now in stampit land
    .static({ displayName: 'TodoStore' })
    // init method takes a function. That function is called during instantiation and
    // is called with arguments: args, instance, stamp.
    // `instance` is the instance created by the factory.
    //
    // `args` are the arguments that the factory is called with minus the first
    // which is used for instance properties.
    //
    // `stamp` is the factory used to create the instance. Available if you need to
    // use static methods of the store(more on this later)
    .init(({ instance, args }) => {
      // we pass in the cat during instantiation
      const [ cat ] = args;

      // returns the instance of todoActions for this app
      const todoActions = cat.getActions('todoActions');
      // create is an RxJS observable, so you can use any observable operation
      // available to you in RxJS.
      const createTodoObs = todoActions.create.map(({ todo, promise }) => {
        // The store expects observables to return objects with specific keys.
        // `replace`, `set`, `transform`, `optimistic`
        // Here is an example using `transform` and `optimistic`
        return {
          transform: function (state) {
            const todos = assign({}, state.todosMap);
            todos[todo.id] = todo;
            state.todosMap = todos;
            return state;
          },
          optimistic: promise
        };
      });

      // You can register observables for the store to observe, too. Any observable can be registered not just thundercats actions!
      instance.register(createTodoObs);
    });
}

```
---

### The Cat
[&#x24C8;]()

The Cat is the bag. It's the main place to put all your fluxy stuff. Use it when
you want to create an instance of your flux app per request on the server or
once on the client.


```js
// todoCat.js
import { TodoActions } from '../actions/todo-actions';
import { TodoStore } from '../stores/todo-store';

export default Cat()
 .init(({ instance }) => {
   // instance is an instance of the cat and can be used to get actions and
   // store instance registered using the method below.
   instance.register(TodoAcions);
   instance.register(TodoStore, null, instance);
 });

```

If your store depends on an actions class make sure you register it beforehand.
And if the store needs the cat to get that actions instance, pass it in to
the register method as additional arguments to pass to the factory.

### Contributing

Commits messages should start with

* adds
* changes
* fixes
* removes

Use eslint to lint according to the provided .eslintrc file.
Add unit tests for new features.


## API

### Actions

#### Actions({ displayName : string, ...spec }) : ActionsFactory

Takes an object argument. That object can have a displayName property that
identifies this factory.

Any other properties are used to create observables
methods of this factories instances. These are taken as the specifications of the actions instance.

> spec signature : { methodName: mappingFunction|null }

For every key on spec,
there will be a corresponding method with that name. If the keys value on spec
is a function, it is used as an initial mapping function. If value is null, the
indentity function, `((x) => x)` is used.

#### ActionsFactory(instanceProperties) : actions

A factory function ([a stampit stamp](https://github.com/stampit-org/stampit#stampit-api)) that returns an actions instance with methods defined during factory creation above.

### actions.someObservableMethod : observable

Any method defined during factory creation will be an observable method availble
on the instance object. This method has all the methods available to an [RxJS Observable](https://github.com/Reactive-Extensions/RxJS/blob/master/doc/api/core/observable.md#observable-instance-methods) instance as well as...

### actions.someObservableMethod.displayName : string

A displayName taken from the key in `spec`

### Store

#### Store(initialValue : object) : StoreFactory

Returns a factory function (a stampit stamp).

#### Store.createRegistrar(store : StoreInstance) : function
[&#x24C8;]()

Takes a store instance and creates a register function. For those who love to be
always functional.

#### Store.fromMany(observable[, obsevable[, observable...]]) : observable
[&#x24C8;]()

Register many observables at once. Uses [RxJS merge ](https://github.com/Reactive-Extensions/RxJS/blob/master/doc/api/core/operators/merge.md) under the [hood](https://github.com/thundercatsjs/thundercats/blob/master/src/Store.js#L168).

#### Store.setter(observable : Observable\<object\>) : observable
[&#x24C8;]()

Converts objects emitted by an observable into new objects with key `setter` set to
the that object.

note: cannot be used in conjunction with optimistic updates

#### Store.transformer(observable : Observable\<function\>) : observable
[&#x24C8;]()

Converts functions emitted by an observable into objects with the key
`transform` set to that function.

note: cannot be used in conjunction with optimistic updates

#### Store.replacer(observable : Observable\<object\>) : observable
[&#x24C8;]()

Converts objects emitted by an observable into new objects with key `replace` set to
the that object.

note: cannot be used in conjunction with optimistic updates

### StoreFactory(instanceProps : object) : store instance

StoreFactories are stampit stamps. You can use the Static methods above as well as the
static methods of a [stampit](https://github.com/stampit-org/stampit#stampit-api) stamp.

#### store.register(observable : Observable) : Array\<observable\>
[&#x24C8;]()

Returns an array of all the currently registered observables

Registered observables must return objects. The object top level key determines the type of operation the store will perform (remember stores are reducers). The following are keys and corresponding operations.


##### _replace: object_
[&#x24C8;]()

Observables that return `{ replace: newStoreValue }` will replace the current value of the store with the property supplied, deleting properties not specified in the new value.

##### _transform: function_
[&#x24C8;]()

Observables can also return `{ transform: transfromFunctin }`. The transform function will then be called internally and be supplied the with the current value held by the store. This transform function should then return the new value of the store.

##### _set: object_
[&#x24C8;]()

Observables that return `{ set: newValues }` will use Object.assign to update the value held by the store.

note: observables must return an object with at least one of the above keys.

##### (optional) _optimistic: promise|observable_
[&#x24C8;]()

Optimistic updates can be done using the optimistic key. The store will update its value and register the operation for later undoing. If the promise `rejects` or if the observable calls `onError` the store will undo the operation and replay the operations after it with this value the old value. Bam! Optimistic updates!

### Cat

#### Cat(staticProperties : object) : CatFactory

A stampit factory that produces factory functions. Takes in object that will set
static properties of the factory function.

#### CatFactory(instanceProperties) : cat

A factory function [a stampit stamp](https://github.com/stampit-org/stampit#stampit-api) that creates instances of itself.

#### cat.register(StoreOrActions : function[, ...optional args to pass to Factory]) : Map\<displayName : string, store : storeInstance\>
[&#x24C8;]()

Register your Store and Actions factory using the `register` instance method. Any extra arguments to the register method are passed to the factory on instantiation. Stores instances are available through the `cat.getStore` method. Actions on `getActions` method.

#### cat.getStore(storeDisplayName : string) : storeInstance|undefined
[&#x24C8;]()

Get the instance of the store from the cat with displayName equal to `storeDisplayName` (case insensitive);
returns `undefined` if not found

#### cat.getActions(actionsDisplayName : string) : actionsInstance|undefined
[&#x24C8;]()

Get the instance of the actions from the cat with displayName equal to `actionsDisplayName` (case insensitive);
returns `undefined` if not found.

#### cat.hydrate(storesState: object) : observable

Will take an object that is used to hydrate the stores. The `storesState` object
should have the signature `{ displayNameOfStore: storeSate }`. Each key that
matches a store displayName will be used to hydrate that particular store. The
value used to hydrate the store must be an object. When the hydrate completes,
the onNext and onCompleted callbacks are called.

#### cat.deserialize(stringyStoresState : string) : observable

Same as above but excepts a serialized storesState

#### cat.dehydrate() : observable\<storesState : object\>

Returns an observable. This observables onNext is called with an object with the
signature `{ storeDisplayName: storeState }`.

#### cat.serialize() : observable\<stringyStoresState : string\>

Same as above but returns a serialized storesSate.

<br>
<br>
<br>
<br>
<br>
<br>
<br>
<br>
<br>
<br>
<br>
<br>
<small>Don't Forget To Be Awesome</small>
