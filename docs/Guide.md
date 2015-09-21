# Guide


## Actions

Actions function creates a factory that produces an object with methods that are observable. The methods, which are ThunderCats actions, themselves emit its its payload when called to its observers. You can use Actions class like so...

note: using es6.

```js

import { Actions } from 'thundercats';
import uuid from 'node-uuid';
import { TodoService } from '../services/todo-service';

export default Actions({
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
})
  // displayName is needed to use with cats and for debugging but not required otherwise
  .refs({ displayName: 'TodoActions' });

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
  clickThread: null,
  receiveRawMessages: null
})
  .refs({ displayName: 'ChatActions' });

// someScript.js

const chatActions = ChatActions();

console.log(typeof chatActions.clickThreads.subscribe); //=> 'function'
console.log(typeof chatActions.recieveRawMessages.subscribe); //=> 'function'

```

----

## Stores

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

## The Cat
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

