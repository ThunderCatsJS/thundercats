[![Circle CI](https://circleci.com/gh/r3dm/thundercats.svg?style=svg)](https://circleci.com/gh/r3dm/thundercats)
[![Coverage Status](https://coveralls.io/repos/r3dm/thundercats/badge.svg)](https://coveralls.io/r/r3dm/thundercats)
[![Dependency Status](https://gemnasium.com/r3dm/thundercats.svg)](https://gemnasium.com/r3dm/thundercats)
[![NPM version](http://img.shields.io/npm/v/thundercats.svg)](https://npmjs.org/package/thundercats)
[![Code Climate](https://codeclimate.com/github/r3dm/thundercats/badges/gpa.svg)](https://codeclimate.com/github/r3dm/thundercats)

[![Stories in Ready](https://badge.waffle.io/r3dm/thundercats.png?label=ready&title=Ready)](https://waffle.io/r3dm/thundercats)
[![Join the chat at https://gitter.im/r3dm/thundercats](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/r3dm/thundercats?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)
[![Inline docs](http://inch-ci.org/github/r3dm/thundercats.svg?branch=master)](http://inch-ci.org/github/r3dm/thundercats)
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

```
npm install thundercats
```

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
todoActions.create.subscribe((data) {
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
    
      // The store expects observables to return objects with specific keys. `value`, `set`, `transform`, `optimistic`
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

##### _value<Object>_
Observables that return `{ value: newStoreValue }` will override the current value of the store with the properity supplied. 

##### _transform<Function>_
Observables can alse return `{ transform: transfromFunctin }`. The transfrom function will then be called internall and be supplied the with the current value held by the store. This transfrom function should then return the new value of the store.

##### _set<Object>_
Observables that return '{ set: newValues }' will use Object.assign to update the value held by the store.

note: observables must return an object with atleast one of the above keys

#### _optimistic<Promise|Observable>_

Optimistic updates can be done using the optimistic key. The store will update its value and register the operation for later undoing. If the promise rejects of if the observable calls onError the store will undo the operation and replay the operations after it with this value. Bam!

---

### The Container

The Container is a React Component use to wrap your components. The Container is responible for many things. For instance, 

* Setting requested actions on your Components props.
* Listening to a registered store(s).
* Setting fetch action to pre-fetch data when using renderToString method.

This is how you use it.

```js
<Container>
  <MessageSection>
</Container>

```
By itself it doesn't do much. But in your component you can define the method `getThundercats`. Check out the example below. 

```js

export default class MessageSection extends React.Component {
  constructor(props) {
    super(props);
  }

  static displayName = 'MessageSection'
  static propTypes = {
    chatActions: PropTypes.object.isRequired,
    messages: PropTypes.array,
    thread: PropTypes.string
  }
  
  // using React-Router
  static contextTypes = {
    router: PropTypes.func.isRequired,
  }

  componentDidMount() {
    this.scrollToBottom();
  }

  componentDidUpdate() {
    this.scrollToBottom();
  }

  scrollToBottom() {
    const ul = this.refs.messageList.getDOMNode();
    ul.scrollTop = ul.scrollHeight;
  }
  
  // This is where the magic happens. getThundercats returns an
  // object with all the information that the Container needs! 
  getThundercats(props, context) {
    return {
      // actions to be made avaible on this components props
      actions: ['chatActions'],
      
      // stores this component should subscribe too.
      stores: [
        'messageStore',
        'threadStore',
        
        // a function that takes the values of the stores
        // and returns an Object{ messages, thread }
        combineLatest 
      ],
      
      // The actions class and method to call to prefetch data
      // when using cat.renderToString method
      fetchAction: 'chatActions.fetchMessages',
      
      // Which store to listen for fetch completion
      // note: if the component subscribes to only one store this can be ommited.
      fetchWaitFor: 'messagesStore',
      
      // the payload to use when calling the fetchAction
      // e.i chatActions.fetchMessages(fetchPayload);
      fetchPayload: {
        param: context.router.getParams();
    };
  }

  renderMessages(messages) {
    return messages.map(message => (
      <MessageListItem
        key={ message.id }
        message={ message }/>
    ));
  }

  render() {
    const { messages, thread } = this.props;

    return (
      <div className='message-section'>
        <h3 className='message-thread-heading'>
          { thread.name }
        </h3>
        <ul
          className='message-list'
          ref='messageList'>
          { this.renderMessages(messages) }
        </ul>
        <MessageComposer
          chatActions={ this.props.chatActions }
          thread={ thread }/>
      </div>
    );
  }
}

```

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

### cat.render(ReactElement, DOMelement)
Yup, thats right! the cat provides a render function. Under the hood it uses Reacts render function but wraps your component so that the cat will be available in your components context and returns an observable. The observable produces the instance returned by React.render.

### cat.renderToString(ReactElement, DOMelement)

This is where things get sweet. cat.renderToString acts as above except the observable returns an object composed of the markup and prefetched data.

```js
class TodoApp extends Cat {
  constructor() {
    super();
    this.register(TodoActions);
    this.register(TodoStore, this);
  }
}

const todoApp = new TodoApp();

todoApp.render(appElement, document.getElementById('todoapp')).subscribe(
  () => {
    console.log('app rendered!');
  },
  err => {
    console.log('rendering has encountered an err: ', err);
  }
);
```


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
