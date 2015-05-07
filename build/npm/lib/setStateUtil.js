// # Set State utility
//
// A helper function to pass as an argument to Rx.Observable.map;
// If your Observable passes an object, this will assign the properties of
// that object to the current value held in the store.
//
// ```js
// var newMappedObservable = someAction
//   .map(function(newData) {
//     return { 'someCoolKey': newData };
//   })
//   .map(setStateUtil);
// ```
//
// now this `newMappedObservable` can be passed into your Thundercats
// `Stores.getOperations` spec definition
'use strict';

var invariant = require('invariant'),
    assign = Object.assign || require('object.assign');

module.exports = setStateUtil;

function setStateUtil(newStateToSet) {
  invariant(newStateToSet || typeof newStateToSet === 'object', 'setStateUtil expects an object, but got %s', newStateToSet);
  return {
    transform: function transform(oldState) {
      var newState = {};
      assign(newState, oldState, newStateToSet);
      return newState;
    }
  };
}