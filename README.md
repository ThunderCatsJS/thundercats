[![Circle CI](https://circleci.com/gh/r3dm/thundercats.svg?style=svg)](https://circleci.com/gh/r3dm/thundercats)
[![Coverage Status](https://coveralls.io/repos/r3dm/thundercats/badge.svg)](https://coveralls.io/r/r3dm/thundercats)
[![NPM version](http://img.shields.io/npm/v/thundercats.svg)](https://npmjs.org/package/thundercats)
[![Join the chat at https://gitter.im/r3dm/thundercats](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/r3dm/thundercats?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)
[![Downloads](http://img.shields.io/npm/dm/thundercats.svg)](https://npmjs.org/package/thundercats)
[![JS.ORG](https://img.shields.io/badge/js.org-thundercats-ffb400.svg?style=flat-square)](http://js.org)
# ThunderCats.js

> Thundercats, Ho!

[Flux](https://github.com/facebook/flux/) meets [RxJS](https://github.com/Reactive-Extensions/RxJS)

The [Flux](https://github.com/facebook/flux/) architecture allows you to think
of your application as an unidirectional flow of data, this module aims to
facilitate the use of
[RxJS Observable](https://github.com/Reactive-Extensions/RxJS/blob/master/doc/api/core/observable.md)
as basis for defining the relations between the different entities composing
your application.

## Install

This is a pre-release 2.0.0 version and is currently unstable.

```
npm install thundercats@2.0.0-rc5
```
Thundecats makes heavy use of es6 Map object. While available in the latest versions of Node.js, io.js and all modern browsers, a great many older browsers will need a polyfill inorder to work with Thundercats. 

I recommend using [es6-map](https://www.npmjs.com/package/es6-map) as a polyfill for just the Map object or [babel polyfill](https://babeljs.io/docs/usage/polyfill/) to give you all the es6 goodies!

## Examples!

Check out:

* [TodoMVC](https://github.com/r3dm/thundercats-todomvc) app.
* [Chat App](https://github.com/r3dm/thundercats-chat)
* The source for [The R3DM Consulting](https://github.com/r3dm/r3dm.com) isomorphic app.

## Guide


### Actions

Actions class creates an object with observable methods. The methods themselves emit its arguments when called to its observers. You extend the Actions class like so...

note: using es6 and [class property initializers](https://github.com/babel/babel/issues/619)

```js

import { Actions } from 'thundercats';

export default class TodoActions extends Actions {
  constructor() {
    super();
  }

  static displayName = 'TodoActions'

  create(text) {
    const todo = {
      id: uuid.v4(),
      text,
      complete: false
    };
    return {
      todo,
      promise: TodoService.create(todo)
    };
  }
  
}

```

The body of the method provides mapping function for every call to the observable method.

i.e.

```js
todoActions.create.subscribe((data) => {
  console.log(data.todo);
});

todoActions.create('Get Milk');
// => Object {id: "73bdb5ca-3932-437c-9029-6744a9fb612b", text: "Get milk", complete: false}

```

Lets say you wanted to create a bunch of methods, but don't want or care for a mapping function? Well, Thundercats gots you covered.

```js
import { Actions } from 'thundercats';

export default class ChatActions extends Actions {
  constructor() {
    super([
      'clickThread',
      'receiveRawMessages'
	 ]);
  }
}

const chatActions = new ChatActions();

console.log(typeof chatActions.clickThreads.subscribe); //=> 'function'
console.log(typeof chatActions.recieveRawMessages.subscribe); //=> 'function'

```

----

### Stores

Stores are observable objects. They observe actions and update their value accordingly. 

```js

import { Store } from 'thundercats';

export default class TodoStore extends Store {

  constructor(cat) { // We are passing an instance of the Cat into the constructor
    super();
    const todoActions = cat.getActions('todoActions');

    const { create } = todoActions;

	 // set the initial value of the store
    this.value = {
      todosMap: {}
    };

	// create is an RxJS observable, so you can use any observable operation available to you in RxJS. 
    const createTodoObs = create.map(({ todo, promise }) => {
    
      // The store expects observables to return objects with specific keys. `replace`, `set`, `transform`, `optimistic`
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
    
    // You register observables for the store to listen too. Any observable can be registered.
    this.register(createTodoObs);
  }
  
  static displayName = 'TodoStore'

}

```
#### store.register(Observable<Object>)

Registered observables must return objects. The object determines the type of operations the store will proform.

##### _replace<Object>_

Observables that return `{ replace: newStoreValue }` will replace the current value of the store with the properity supplied, deleting properties not specified in the new value. 

##### _transform<Function>_

Observables can alse return `{ transform: transfromFunctin }`. The transfrom function will then be called internall and be supplied the with the current value held by the store. This transfrom function should then return the new value of the store.

##### _set<Object>_

Observables that return '{ set: newValues }' will use Object.assign to update the value held by the store.

note: observables must return an object with atleast one of the above keys

#### _optimistic<Promise|Observable>_

Optimistic updates can be done using the optimistic key. The store will update its value and register the operation for later undoing. If the promise rejects of if the observable calls onError the store will undo the operation and replay the operations after it with this value. Bam!

---

### The Cat

The Cat is the bag. It's the main place to put all your fluxy stuff.

You can instantiate a new cat and use that to register stuff or extend it using es6 classes.


```js
class TodoCat extends Cat {
  constructor() {
    super();
    this.register(TodoAcions);
    this.register(TodoStore, this);
  };
}

// or

const todoCat = new Cat();
todoCat.register(TodoActions);

// If your store depends on an actions class make sure you register it beforehand.
todoCat.register(TodoClass, todoCat);
```

#### cat.register(StoreOrActionsClass[, ...optional args to pass to construtor])

register your Store and Actions classes using the `register` instance method. Any extra arguments to the register method are passed to the contructor for the class.


---
### waitFor Util

waitFor(observable[, ... observables]) returns an obsevable that waits for all of the observables to publish a new value. Under the hood it uses Rx.Observable.combineLatest but first converts the passed in obvervables into hot observables. This is great when you just want to wait for new values and not current values of observables.

### Contributing

Commits messages should start with 

* adds
* changes
* fixes
* removes

Use eslint to lint according to the provided .eslintrc file. 



### API

more to come...





<small>Don't Forget To Be Awesome</small>
