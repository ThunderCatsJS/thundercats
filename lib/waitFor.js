// # Wait For Utility
//
// Takes observables for arguments,
// converts them to hot observables
// then waits for each one to publish a value
//
// returns an observable.
//
// *Note:* it's good practice to use a firstOrDefault
// observable if you just want a short lived subscription
// and a timeout if you don't want to wait forever!
'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports['default'] = waitFor;

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _rx = require('rx');

var _rx2 = _interopRequireDefault(_rx);

var _debug = require('debug');

var _debug2 = _interopRequireDefault(_debug);

var _utils = require('./utils');

var debug = (0, _debug2['default'])('thundercats:waitFor');
var slice = Array.prototype.slice;

function waitFor(observables) {
  return _rx2['default'].Observable.from(arguments).tapOnNext(function (observable) {
    return (0, _utils.isObservable)(observable) ? true : new Error('waitFor only take observables but got %s', observable);
  }).map(function (observable) {
    return observable.publish();
  }).tapOnNext(function (observable) {
    return observable.connect();
  }).toArray().tap(function () {
    return debug('starting waitFor');
  }).flatMap(function (arrayOfObservables) {
    return _rx2['default'].Observable.combineLatest(arrayOfObservables, function () {
      return slice.call(arguments);
    });
  }).doOnNext(function () {
    return debug('waitFor onNext!');
  });
}

module.exports = exports['default'];