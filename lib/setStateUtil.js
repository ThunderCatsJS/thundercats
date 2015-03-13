// # Set State utility
//
// A helper function to pass as an argument to Rx.Observable.map;
// If your Observable passes a object, this will assign the properties of
// that object to the current value held in the store.
//
// ```js
// var newMappedObservable = someAction
//   .map(function(newDats) {
//     return { 'someCoolKey': newDats };
//   })
//   .map(setStateUtil);
// ```
//
// now this newMappedObservable can be passed into your ThunderCats Stores
// getOperations spec definition
var invariant = require('../utils').invariant,
    assign = Object.assign || require('object.assign');

module.exports = setStateUtil;

function setStateUtil(newStateToSet) {
  invariant(
    newStateToSet || typeof newStateToSet === 'object',
    'setStateUtil expects an object, but got %s',
    newStateToSet
  );
  return {
    transform: function(oldState) {
      var newState = {};
      assign(newState, oldState, newStateToSet);
      return newState;
    }
  };
}
