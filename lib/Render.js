'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.fetch = fetch;
exports.RenderToObs = RenderToObs;

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) arr2[i] = arr[i]; return arr2; } else { return Array.from(arr); } }

var _rx = require('rx');

var _rx2 = _interopRequireDefault(_rx);

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _debug = require('debug');

var _debug2 = _interopRequireDefault(_debug);

var _ContextWrapper = require('./ContextWrapper');

var _ContextWrapper2 = _interopRequireDefault(_ContextWrapper);

var _waitFor = require('./waitFor');

var _waitFor2 = _interopRequireDefault(_waitFor);

var debug = (0, _debug2['default'])('thundercats:render');

function fetch(fetchMap, stores) {
  if (!fetchMap || fetchMap.size === 0) {
    debug('cat found empty fetch map');
    return _rx2['default'].Observable['return']({
      data: {},
      fetchMap: fetchMap
    });
  }

  var fetchCtx = _rx2['default'].Observable.from(fetchMap.values()).shareReplay();

  var waitForStores = fetchCtx.pluck('store').toArray().tap(function (arrayOfStores) {
    return debug('waiting for %s stores', arrayOfStores.length);
  }).map(function (arrayOfStores) {
    return _waitFor2['default'].apply(undefined, _toConsumableArray(arrayOfStores)).firstOrDefault().shareReplay();
  }).tap(function (waitForStores) {
    return waitForStores.subscribe();
  });

  var fetchObs = fetchCtx.map(function (_ref) {
    var action = _ref.action;
    var payload = _ref.payload;
    return { action: action, payload: payload };
  }).tapOnNext(function () {
    return debug('init individual fetchers');
  }).tapOnNext(function (_ref2) {
    var action = _ref2.action;
    var payload = _ref2.payload;

    action(payload);
  }).tapOnCompleted(function () {
    return debug('fetchers activated');
  }).toArray();

  return _rx2['default'].Observable.combineLatest(waitForStores, fetchObs.delaySubscription(50), function (data) {
    return { data: data, fetchMap: fetchMap };
  });
}

function RenderToObs(Comp, DOMContainer) {
  return new _rx2['default'].AnonymousObservable(function (observer) {
    var instance = null;
    instance = _react2['default'].render(Comp, DOMContainer, function (err) {
      /* istanbul ignore else */
      if (err) {
        return observer.onError(err);
      }
      /* istanbul ignore else */
      if (instance) {
        observer.onNext(instance);
      }
    });
    observer.onNext(instance);
  });
}

exports['default'] = {
  render: function render(cat, Component, DOMContainer) {
    return _rx2['default'].Observable.just(Component).map(function (Comp) {
      return _ContextWrapper2['default'].wrap(Comp, cat);
    }).flatMap(function (Burrito) {
      return RenderToObs(Burrito, DOMContainer);
    }, function (Burrito, inst) {
      return inst;
    });
  },

  renderToString: function renderToString(cat, Component) {
    var stores = cat.stores;

    var fetchMap = new Map();
    cat.fetchMap = fetchMap;
    return _rx2['default'].Observable.just(Component).map(function (Comp) {
      return _ContextWrapper2['default'].wrap(Comp, cat);
    }).doOnNext(function (Burrito) {
      debug('initiation fetcher registration');
      _react2['default'].renderToStaticMarkup(Burrito);
      debug('fetcher registration complete');
    }).flatMap(function () {
      return fetch(fetchMap, stores);
    }, function (Burrito, _ref3) {
      var data = _ref3.data;
      var fetchMap = _ref3.fetchMap;

      return {
        Burrito: Burrito,
        data: data,
        fetchMap: fetchMap
      };
    }).map(function (_ref4) {
      var Burrito = _ref4.Burrito;
      var data = _ref4.data;
      var fetchMap = _ref4.fetchMap;

      var markup = _react2['default'].renderToString(Burrito);
      return {
        markup: markup,
        data: data,
        fetchMap: fetchMap
      };
    }).firstOrDefault().tapOnNext(function () {
      return cat.fetchMap = null;
    });
  }
};