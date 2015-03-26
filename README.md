[![Circle CI](https://circleci.com/gh/r3dm/thundercats.svg?style=svg)](https://circleci.com/gh/r3dm/thundercats) [![Coverage Status](https://coveralls.io/repos/r3dm/thundercats/badge.svg)](https://coveralls.io/r/r3dm/thundercats) [![Dependency Status](https://gemnasium.com/r3dm/thundercats.svg)](https://gemnasium.com/r3dm/thundercats) [![NPM version](http://img.shields.io/npm/v/thundercats.svg)](https://npmjs.org/package/thundercats) [![Code Climate](https://codeclimate.com/github/r3dm/thundercats/badges/gpa.svg)](https://codeclimate.com/github/r3dm/thundercats)

[![Stories in Ready](https://badge.waffle.io/r3dm/thundercats.png?label=ready&title=Ready)](https://waffle.io/r3dm/thundercats) [![Join the chat at https://gitter.im/r3dm/thundercats](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/r3dm/thundercats?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge) [![Inline docs](http://inch-ci.org/github/r3dm/thundercats.svg?branch=master)](http://inch-ci.org/github/r3dm/thundercats) [![Downloads](http://img.shields.io/npm/dm/thundercats.svg)](https://npmjs.org/package/thundercats)
# ThunderCats.js

> Thundercats, Ho!

A [Flux](https://github.com/facebook/flux/) architecture implementation based on [RxJS](https://github.com/Reactive-Extensions/RxJS)

An exodus from [rx-flux](https://github.com/fdecampredon/rx-flux).

The [Flux](https://github.com/facebook/flux/) architecture allows you to think of your application as an unidirectional flow of data, this module aims to facilitate the use of [RxJS Observable](https://github.com/Reactive-Extensions/RxJS/blob/master/doc/api/core/observable.md) as basis for defining the relations between the different entities composing your application.

## Difference with the Facebooks Flux

RxFlux shares more similarities with [RefluxJS](https://github.com/spoike/refluxjs) than with the original architecture.

* A store is an [RxJS Observable](https://github.com/Reactive-Extensions/RxJS/blob/master/doc/api/core/observable.md) that a view layer can listen to for state
* An action is a function and an [RxJS Observable](https://github.com/Reactive-Extensions/RxJS/blob/master/doc/api/core/observable.md)
* A store subscribes to an action and updates its state accordingly.
* Actions dispatch themselves so no need for a central dispatcher.

Check out our documentation (a work in progress) over at http://r3dm.github.io/thundercats

## Development

Bring all the PR's!

### Tests
Please at unit tests for any new code. Tests are written using Mocha and Chai.

### Docs

There are two sections to documentation: the guide written directly in the source and the API docs generated from Mocha test suites (in progress).

If you find a typo or would like to contribute to the docs, make your changes and run `make` in the root directory using the command line. This should autogenerate the documentation. Then simply commit and create a PR. Super simple!

### Lint

I am very opinionated when it comes to code style, so please run `npm run lint` before commit changes and verify that there are no errors.

I find it good practice to run `npm test` (test will also lint files) before making any changes to verify that tests are already passing before making any new changes.

#### General rules to follow

* Horizontal space is precious, vertical space is cheap and plentiful. Keep your indenting sane and to a minimum.
* Use named functions instead of anonymous functions assigned to variables.
* For most cases, declare module.exports as a single object with each key a part of the files api at the top, and the named functions underneath this section.

### API

The api is still new and can be malleable for the foreseeable future. If there are features you would like to see please open a new issue for discussion.

For the most part I want this project to support server-side rendering/isomorphic js. My first inclination is to get it working using singletons, which presents data leakage challenges. I am sure we are up to that challenge and can come up with a viable solution.
