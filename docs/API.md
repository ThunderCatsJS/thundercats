# API Reference

## Actions

### Actions(spec : object) : ActionsFactory
[&#x24C8;]()

A factory that produces stampit factory functions. Takes in optional object
`spec`.

`spec` can take optional `init`, `props`, `refs`, and `statics` properties that are used
normally to create stamps and are added to
the stamp factory returned. To see more documentation of these features see the
stampit [docs](https://github.com/stampit-org/stampit).

Any other properties are used to create observables
methods of these factories instances. These are taken as the specifications of the actions instance.

> spec signature : { methodName: mappingFunction | null }

For every key on spec,
there will be a corresponding method with that name. If the keys value on spec
is a function, it is used as an initial mapping function. If value is null, the
indentity function, `((x) => x)`, is used.

A mapping function has the following signature

`(value : any) : any|Observable<any>`

If a mapping function returns an observable, that observable is subscribed to
and those values it returns are passed to that actions observables.

### ActionsFactory(instanceProperties) : actions

A factory function ([a stampit stamp](https://github.com/stampit-org/stampit#stampit-api)) that returns an actions instance with methods defined during factory creation above.

### actions.someObservableMethod : observable

Any method defined during factory creation will be an observable method availble
on the instance object. This method has all the methods available to an [RxJS Observable](https://github.com/Reactive-Extensions/RxJS/blob/master/doc/api/core/observable.md#observable-instance-methods) instance as well as...

### actions.someObservableMethod.displayName : string

A displayName taken from the key in `spec`

## Store

### Store(initialValue : object, stampDescriptor : object) : StoreFactory
[&#x24C8;]()

Returns a factory function (a stampit stamp).
`stampDescriptor` is an object with the `init`, `props`, `refs`, and `statics` properties all of which are optional.
These properties are the same used to normally create stamps and are added to
the stamp factory returned. To see more documentation of these features see the
stampit [docs](https://github.com/stampit-org/stampit)

### Store.createRegistrar(store : StoreInstance) : function
[&#x24C8;]()

Takes a store instance and creates a register function. For those who love to be
always functional.

### Store.fromMany(observable[, obsevable[, observable...]]) : observable
[&#x24C8;]()

Register many observables at once. Uses [RxJS merge ](https://github.com/Reactive-Extensions/RxJS/blob/master/doc/api/core/operators/merge.md) under the [hood](https://github.com/thundercatsjs/thundercats/blob/master/src/Store.js#L168).

### Store.setter(observable : Observable\<object\>) : observable
[&#x24C8;]()

Converts objects emitted by an observable into new objects with key `setter` set to
the that object.

note: cannot be used in conjunction with optimistic updates

### Store.transformer(observable : Observable\<function\>) : observable
[&#x24C8;]()

Converts functions emitted by an observable into objects with the key
`transform` set to that function.

note: cannot be used in conjunction with optimistic updates

### Store.replacer(observable : Observable\<object\>) : observable
[&#x24C8;]()

Converts objects emitted by an observable into new objects with key `replace` set to
the that object.

note: cannot be used in conjunction with optimistic updates

## StoreFactory(instanceProps : object) : store instance

StoreFactories are stampit stamps. You can use the Static methods above as well as the
static methods of a [stampit](https://github.com/stampit-org/stampit#stampit-api) stamp.

### store.register(observable : Observable) : Array\<observable\>
[&#x24C8;]()

Returns an array of all the currently registered observables

Registered observables must return objects. The object top level key determines the type of operation the store will perform (remember stores are reducers). The following are keys and corresponding operations.

### store.shouldStoreNotify(value, nextValue) : bool

A user definable method that will be called during operations onNext lifecycle. It
will pass in the current value and the next value. If the return is true, then
the store operates as normal. If false, the store will not notify its observers.

#### _replace: object_
[&#x24C8;]()

Observables that return `{ replace: newStoreValue }` will replace the current value of the store with the property supplied, deleting properties not specified in the new value.

#### _transform: function_
[&#x24C8;]()

Observables can also return `{ transform: transfromFunctin }`. The transform function will then be called internally and be supplied the with the current value held by the store. This transform function should then return the new value of the store.

#### _set: object_
[&#x24C8;]()

Observables that return `{ set: newValues }` will use Object.assign to update the value held by the store.

note: observables must return an object with at least one of the above keys.

#### (optional) _optimistic: promise|observable_
[&#x24C8;]()

Optimistic updates can be done using the optimistic key. The store will update its value and register the operation for later undoing. If the promise `rejects` or if the observable calls `onError` the store will undo the operation and replay the operations after it with this value the old value. Bam! Optimistic updates!

## Cat

### Cat(stampDescriptor : object) : CatFactory
[&#x24C8;]()

A factory that produces stampit factory functions. Takes in optional object
`stampDescriptor` with the `init`, `props`, `refs`, and `statics` properties all of
which are optional.
These properties are the same used to normally create stamps and are added to
the stamp factory returned. To see more documentation of these features see the
stampit [docs](https://github.com/stampit-org/stampit).

### CatFactory(instanceProperties) : cat

A factory function [a stampit stamp](https://github.com/stampit-org/stampit#stampit-api) that creates instances of itself.

### cat.register(StoreOrActions : function[, ...optional args to pass to Factory]) : Map\<displayName : string, store : storeInstance\>
[&#x24C8;]()

Register your Store and Actions factory using the `register` instance method. Any extra arguments to the register method are passed to the factory on instantiation. Stores instances are available through the `cat.getStore` method. Actions on `getActions` method.

### cat.getStore(storeDisplayName : string) : storeInstance|undefined
[&#x24C8;]()

Get the instance of the store from the cat with displayName equal to `storeDisplayName` (case insensitive);
returns `undefined` if not found

### cat.getActions(actionsDisplayName : string) : actionsInstance|undefined
[&#x24C8;]()

Get the instance of the actions from the cat with displayName equal to `actionsDisplayName` (case insensitive);
returns `undefined` if not found.

### cat.get(storeOractionsDisplayName : string) : storeInstance|actionsInstance|undefined
[&#x24C8;]()

Same as the above two but will first check for a store, if none found it will
then check if in actions, else it returns undefined

### cat.dispose()

Iterates through all the store instances and dispose of their observers.

## hydrate(catInstance, storesState: object) : observable
[&#x24C8;]()

Will take an object that is used to hydrate the stores. The `storesState` object
should have the signature `{ displayNameOfStore: storeSate }`. Each key that
matches a store displayName will be used to hydrate that particular store. The
value used to hydrate the store must be an object. When the hydrate completes,
the onNext and onCompleted callbacks are called.

## dehydrate(catInstanec) : observable\<storesState : object\>
[&#x24C8;]()

Returns an observable. This observables onNext is called with an object with the
signature `{ storeDisplayName: storeState }`.

