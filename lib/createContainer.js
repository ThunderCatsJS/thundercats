'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { var object = _x, property = _x2, receiver = _x3; desc = parent = getter = undefined; _again = false; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

exports['default'] = createContainer;

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) arr2[i] = arr[i]; return arr2; } else { return Array.from(arr); } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; }

var _rx = require('rx');

var _rx2 = _interopRequireDefault(_rx);

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _invariant = require('invariant');

var _invariant2 = _interopRequireDefault(_invariant);

var _objectAssign = require('object.assign');

var _objectAssign2 = _interopRequireDefault(_objectAssign);

var _debug = require('debug');

var _debug2 = _interopRequireDefault(_debug);

var _utils = require('./utils');

var __DEV__ = process.env.NODE_ENV !== 'production';
var debug = (0, _debug2['default'])('thundercats:container');

function getChildContext(childContextTypes, currentContext) {

  var compContext = (0, _objectAssign2['default'])({}, currentContext);
  // istanbul ignore else
  if (!childContextTypes || !childContextTypes.cat) {
    delete compContext.cat;
  }
  return compContext;
}

function storeOnError(err) {
  throw new Error('ThunderCats Store encountered an error: ' + err);
}

function storeOnCompleted() {
  console.warn('Store has shutdown without error');
}

function verifyStore(displayName, storeName, store) {
  /* istanbul ignore else */
  if (__DEV__) {
    (0, _invariant2['default'])((0, _utils.isObservable)(store) && typeof store.value === 'object', '%s should get at a store with a value but got %s for %s ' + 'with value %s', displayName, store, storeName, store && store.value);
  }
}

function createContainer(options, Component) {
  /* istanbul ignore else */
  if (__DEV__) {
    (0, _invariant2['default'])(typeof options === 'object', 'createContainer should get an options object but got %s', options);
  }

  /* istanbul ignore else */
  if (!Component) {
    return createContainer.bind(null, options);
  }

  /* istanbul ignore else */
  if (__DEV__) {
    (0, _invariant2['default'])(Component.prototype && Component.prototype.render && Component.prototype.setState, 'createContainer should get a React Component but got %s', (0, _utils.getName)(Component) + 'Container');
  }

  return (function (_React$Component) {
    var _class = function (props, context) {
      var _this = this;

      _classCallCheck(this, _class);

      _get(Object.getPrototypeOf(_class.prototype), 'constructor', this).call(this, props, context);

      /* istanbul ignore else */
      if (__DEV__) {
        (0, _invariant2['default'])(typeof context.cat === 'object', '%s should find an instance of the Cat in the context but got %s', (0, _utils.getName)(this), context.cat);
      }

      var cat = context.cat;
      var val = {};

      // set up observable state. This can be a single store or a combination of
      // multiple stores
      if (options.store) {
        this.observableState = cat.getStore(options.store);
        verifyStore((0, _utils.getName)(this), options.store, this.observableState);

        if (typeof options.map === 'function') {
          val = options.map(this.observableState.value);
          this.observableState = this.observableState.map(options.map);
        } else {
          val = this.observableState.value;
        }
      } else if (options.stores) {
        var _Rx$Observable;

        (function () {
          var storeNames = [].slice.call(options.stores);
          var combineLatest = options.combineLatest;

          /* istanbul ignore else */
          if (__DEV__) {
            (0, _invariant2['default'])(typeof combineLatest === 'function', '%s should get a function for options.combineLatest with ' + ' options.stores but got %s', (0, _utils.getName)(_this), combineLatest);
          }

          var stores = [];
          var values = [];
          storeNames.forEach(function (storeName) {
            var store = cat.getStore(storeName);
            verifyStore((0, _utils.getName)(_this), storeName, store);
            stores.push(store);
            values.push(store.value);
          });

          var args = stores.slice(0);
          args.push(combineLatest);
          _this.observableState = (_Rx$Observable = _rx2['default'].Observable).combineLatest.apply(_Rx$Observable, _toConsumableArray(args));

          val = combineLatest.apply(undefined, values);
        })();
      }

      /* istanbul ignore else */
      if (__DEV__ && (options.store || options.stores)) {
        (0, _invariant2['default'])((0, _utils.isObservable)(this.observableState), '%s should get at a store but found none for %s', (0, _utils.getName)(this), options.store || options.stores);
      }

      this.state = (0, _objectAssign2['default'])({}, val);

      // set up actions on state. These will be passed down as props to child
      if (options.actions) {
        var actionsClassNames = Array.isArray(options.actions) ? options.actions : [options.actions];

        actionsClassNames.forEach(function (name) {
          _this.state[name] = cat.getActions(name);
        });
      }
    };

    _inherits(_class, _React$Component);

    _createClass(_class, [{
      key: 'componentWillMount',
      value: function componentWillMount() {
        var cat = this.context.cat;

        if (options.fetchAction) {
          /* istanbul ignore else */
          if (__DEV__) {
            (0, _invariant2['default'])(options.fetchAction.split('.').length === 2, '%s fetch action should be in the form of ' + '`actionsClass.actionMethod` but was given %s', (0, _utils.getName)(this), options.fetchAction);

            (0, _invariant2['default'])(typeof options.store === 'string' || typeof options.fetchWaitFor === 'string', '%s requires a store to wait for after fetch but was given %s', (0, _utils.getName)(this), options.store || options.fetchWaitFor);

            (0, _invariant2['default'])(typeof options.getPayload === 'function', '%s should get a function for options.getPayload but was given %s', (0, _utils.getName)(this), options.getPayload);
          }

          var fetchActionsName = options.fetchAction.split('.')[0];
          var fetchMethodName = options.fetchAction.split('.')[1];
          var fetchActionsInst = cat.getActions(fetchActionsName);
          var fetchStore = cat.getStore(options.store || options.fetchWaitFor);

          /* istanbul ignore else */
          if (__DEV__) {
            (0, _invariant2['default'])(fetchActionsInst && fetchActionsInst[fetchMethodName], '%s expected to find actions class for %s, but found %s', (0, _utils.getName)(this), options.fetchAction, fetchActionsInst);

            (0, _invariant2['default'])((0, _utils.isObservable)(fetchStore), '%s should get an observable but got %s for %s', (0, _utils.getName)(this), fetchStore, options.fetchWaitFor);
          }

          debug('cat returned %s for %s for %s', (0, _utils.getName)(fetchActionsInst), fetchActionsName, (0, _utils.getName)(this));

          var action = fetchActionsInst[fetchMethodName];

          if (cat.fetchMap) {
            debug('%s getPayload in componentWillMount', (0, _utils.getName)(this));
            var payload = options.getPayload(this.props, getChildContext(Component.contextTypes, this.context));

            cat.fetchMap.set(options.fetchAction, {
              name: options.fetchAction,
              payload: payload,
              store: fetchStore,
              action: action
            });
          } else {
            options.action = action;
          }
        }
      }
    }, {
      key: 'componentDidMount',
      value: function componentDidMount() {
        /* istanbul ignore else */
        if (this.observableState) {
          // Now that the component has mounted, we will use a long lived
          // subscription
          this.stateSubscription = this.observableState.subscribe(this.storeOnNext.bind(this), options.storeOnError || storeOnError, options.onCompleted || storeOnCompleted);
        }
        /* istanbul ignore else */
        if (options.action && options.getPayload) {
          debug('%s fetching on componentDidMount', (0, _utils.getName)(this));
          options.action(options.getPayload(this.props, getChildContext(Component.contextTypes, this.context)));
        }
      }
    }, {
      key: 'componentWillReceiveProps',
      value: function componentWillReceiveProps(nextProps, nextContext) {
        /* istanbul ignore else */
        if (options.action && options.shouldContainerFetch && options.shouldContainerFetch(this.props, nextProps, this.context, nextContext)) {
          debug('%s fetching on componentWillReceiveProps', (0, _utils.getName)(this));
          options.action(options.getPayload(nextProps, getChildContext(Component.contextTypes, nextContext)));
        }
      }
    }, {
      key: 'componentWillUnmount',
      value: function componentWillUnmount() {
        /* istanbul ignore else */
        if (this.stateSubscription) {
          debug('%s disposing store subscription', (0, _utils.getName)(this));
          this.stateSubscription.dispose();
          this.stateSubscription = null;
        }
      }
    }, {
      key: 'storeOnNext',
      value: function storeOnNext(val) {
        debug('%s value updating', (0, _utils.getName)(this), val);
        this.setState(val);
      }
    }, {
      key: 'render',
      value: function render() {
        return _react2['default'].createElement(Component, (0, _objectAssign2['default'])({}, this.state, this.props));
      }
    }], [{
      key: 'contextTypes',
      value: (0, _objectAssign2['default'])({}, Component.contextTypes || {}, { cat: _react.PropTypes.object.isRequired }),
      enumerable: true
    }, {
      key: 'displayName',
      value: Component.displayName + 'Container',
      enumerable: true
    }, {
      key: 'propTypes',
      value: Component.propTypes || {},
      enumerable: true
    }]);

    return _class;
  })(_react2['default'].Component);
}

module.exports = exports['default'];