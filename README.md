[![Circle CI](https://circleci.com/gh/ThunderCatsJS/thundercats.svg?style=svg)](https://circleci.com/gh/ThunderCatsJS/thundercats)
[![Coverage Status](https://coveralls.io/repos/ThunderCatsJS/thundercats/badge.svg?branch=master&service=github&style=flat-square)](https://coveralls.io/github/ThunderCatsJS/thundercats?branch=master)
[![Join the chat at https://gitter.im/thundercatsjs/thundercats](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/thundercatsjs/thundercats?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)
[![JS.ORG](https://img.shields.io/badge/js.org-thundercats-ffb400.svg?style=flat-square)](http://js.org)

[![NPM](https://nodei.co/npm/thundercats.png?downloads=true)](https://nodei.co/npm/thundercats/)

# ThunderCats.js

> ThunderCats, Ho!

[Flux](https://github.com/facebook/flux/) meets [RxJS](https://github.com/Reactive-Extensions/RxJS)

## Why

The [Flux](https://github.com/facebook/flux/) architecture allows you to think
of your application as an unidirectional flow of data, this module aims to
facilitate the use of [RxJS Observable](https://github.com/Reactive-Extensions/RxJS/blob/master/doc/api/core/observable.md)
as basis for defining the relations between the different entities composing
your application. This module also implements Universal JavaScript First design.
What does that mean? It means the module is designed with the intent to be used
both server-side and client-side from the beginning.

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

A Cat is a bag where you can register your store and actions factories. It
is also a stamp factory that creates factories that create instances of a cat. By
themselves they are only slightly useful and optional, but combine them with
[ThunderCats-React](https://github.com/berkeleytrue/thundercats-react) and you
can do cool things like server-side rendering with data pre-fetching and call render
methods using the observable pattern.

## Install


```
npm install thundercats
```

ThunderCats makes heavy use of es6 Map object. While available in the latest versions of Node.js, io.js and all modern browsers, a great many older browsers will need a polyfill in order to work with ThunderCats.

I recommend using [es6-map](https://www.npmjs.com/package/es6-map) as a polyfill for just the Map object or [babel polyfill](https://babeljs.io/docs/usage/polyfill/) to give you all the es6 goodies!

## Examples!

Check out:

* [TodoMVC app](https://github.com/thundercatsjs/thundercats-todomvc).
* [Chat App](https://github.com/thundercatsjs/thundercats-chat).
* The source for [The R3DM Consulting](https://github.com/r3dm/r3dm.com) isomorphic app.

## Docs

* [Docs](/docs)

## Contributing

Commits messages should start with

* adds
* changes
* fixes
* removes

Use eslint to lint according to the provided .eslintrc file.
Add unit tests for new features.

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
