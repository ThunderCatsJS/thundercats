[![Circle CI](https://circleci.com/gh/r3dm/thundercats.svg?style=svg)](https://circleci.com/gh/r3dm/thundercats) [![Stories in Ready](https://badge.waffle.io/r3dm/thundercats.png?label=ready&title=Ready)](https://waffle.io/r3dm/thundercats) [![Join the chat at https://gitter.im/r3dm/thundercats](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/r3dm/thundercats?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)
ThunderCats.js
=======




> Thundercats, Ho!


A [Flux](https://github.com/facebook/flux/) architecture implementation based on [RxJS](https://github.com/Reactive-Extensions/RxJS)

An exodus from [rx-flux](https://github.com/fdecampredon/rx-flux).

The [Flux](https://github.com/facebook/flux/) architecture allows you to think your application as an unidirectional flow of data, this module aims to facilitate the use of [RxJS Observable](https://github.com/Reactive-Extensions/RxJS/blob/master/doc/api/core/observable.md) as basis for defining the relations between the different entities composing your application.


Difference with the Original Flux
---------------------------------

RxFlux shares more similarities with [RefluxJS](https://github.com/spoike/refluxjs) than with the original architecture.

* A store is an [RxJS Observable](https://github.com/Reactive-Extensions/RxJS/blob/master/doc/api/core/observable.md) that *holds* a value
* An action is a function and an [RxJS Observable](https://github.com/Reactive-Extensions/RxJS/blob/master/doc/api/core/observable.md)
* A store subscribes to an action and update accordingly its value.
* There is no central dispatcher.

Check out our documentation ( A work in progress) over at http://r3dm.github.io/thundercats
