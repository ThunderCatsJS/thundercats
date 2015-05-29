'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _defineProperty(obj, key, value) { return Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); }

var _rx = require('rx');

var _rx2 = _interopRequireDefault(_rx);

var _objectAssign = require('object.assign');

var _objectAssign2 = _interopRequireDefault(_objectAssign);

var _invariant = require('invariant');

var _invariant2 = _interopRequireDefault(_invariant);

var _debug = require('debug');

var _debug2 = _interopRequireDefault(_debug);

var _utils = require('./utils');

var debug = (0, _debug2['default'])('thundercats:translate');

exports['default'] = {
  dehydrate: function dehydrate(storesObservable) {
    return storesObservable
    // store must have displayName and value
    .filter(function (store) {
      return store.displayName && !!store.value;
    }).map(function (store) {
      return _defineProperty({}, store.displayName, store.value);
    }).reduce(function (allDats, storeDats) {
      return (0, _objectAssign2['default'])(allDats, storeDats);
    }, {}).map(function (allDats) {
      return allDats;
    }).tapOnError(function (err) {
      debug('an error occurred while dehydrating stores', err);
    });
  },

  hydrate: function hydrate(storesObservable, catStateObservable) {
    return _rx2['default'].Observable.combineLatest([storesObservable, catStateObservable.tap((0, _utils.createObjectValidator)('hydrate should get objects but got %s'))], function (store, stateMap) {
      return {
        store: store,
        data: stateMap[store.displayName]
      };
    })
    // filter out falsey data and non objects
    .filter(function (_ref2) {
      var data = _ref2.data;
      return data && typeof data === 'object';
    })
    // assign value to store
    .tap(function (_ref3) {
      var store = _ref3.store;
      var data = _ref3.data;

      debug('updating %s with value: ', store.displayName, data);
      store.value = data;
    })
    // wait to run through all the stores
    ['do'](null, function (err) {
      return debug('deserialize encountered a err', err);
    }, function () {
      return debug('deserialize completed');
    }).lastOrDefault().map(function () {
      return true;
    });
  },

  deserialize: function deserialize(storesObservable, stringyCatStateObservable) {
    var catStateObservable = stringyCatStateObservable.tap(function (stringyCatState) {
      (0, _invariant2['default'])(typeof stringyCatState === 'string', 'deserialize expects a string but got %s', stringyCatState);
    }).map(function (stringyCatState) {
      return JSON.parse(stringyCatState);
    }).tap(function (catState) {
      (0, _invariant2['default'])(typeof catState === 'object', 'parsed value of deserialize argument should be an object or ' + 'null but got %s', catState);
    });

    return this.hydrate(storesObservable, catStateObservable);
  },

  serialize: function serialize(storesObservable) {
    return this.dehydrate(storesObservable).map(function (allDats) {
      return JSON.stringify(allDats);
    }).map(function (allDats) {
      return typeof allDats === 'string' ? allDats : '{}';
    }).tapOnError(function (err) {
      debug('an error occurred while stringifing stores', err);
    });
  }
};
module.exports = exports['default'];