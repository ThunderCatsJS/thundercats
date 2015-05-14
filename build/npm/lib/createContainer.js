'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { desc = parent = getter = undefined; _again = false; var object = _x,
    property = _x2,
    receiver = _x3; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

exports['default'] = createContainer;

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) arr2[i] = arr[i]; return arr2; } else { return Array.from(arr); } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; }

var _rx = require('rx');

var _rx2 = _interopRequireDefault(_rx);

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _reactLibInstantiateReactComponent = require('react/lib/instantiateReactComponent');

var _reactLibInstantiateReactComponent2 = _interopRequireDefault(_reactLibInstantiateReactComponent);

var _invariant = require('invariant');

var _invariant2 = _interopRequireDefault(_invariant);

var _objectAssign = require('object.assign');

var _objectAssign2 = _interopRequireDefault(_objectAssign);

var _debug = require('debug');

var _debug2 = _interopRequireDefault(_debug);

var _utils = require('./utils');

var __DEV__ = process.env.NODE_ENV !== 'production';
var debug = _debug2['default']('thundercats:container');

function storeOnError(err) {
  throw new Error('ThunderCats Store encountered an error: ' + err);
}

function storeOnCompleted() {
  console.warn('Store has shutdown without error');
}

function verifyStore(displayName, storeName, store) {
  /* istanbul ignore else */
  if (__DEV__) {
    _invariant2['default'](_utils.isObservable(store) && typeof store.value === 'object', '%s should get at a store with a value but got %s for %s ' + 'with value %s', displayName, store, storeName, store && store.value);
  }
}

function createContainer(Component) {
  /* istanbul ignore else */
  if (__DEV__) {
    _invariant2['default'](typeof Component === 'function', 'Container child should be a React Component but got %s', Component);
  }

  var Container = (function (_React$Component) {
    function Container(props, context) {
      var _this2 = this;

      _classCallCheck(this, Container);

      _get(Object.getPrototypeOf(Container.prototype), 'constructor', this).call(this, props, context);

      /* istanbul ignore else */
      if (__DEV__) {
        _invariant2['default'](typeof context.cat === 'object', '%s should find an instance of the Cat in the context but got %s', this.constructor.displayName, context.cat);
      }

      var cat = context.cat;
      var element = _react2['default'].createElement(Component, props);

      // instantiate the child component and call getThundercats to retrieve
      // config info
      var instance = _reactLibInstantiateReactComponent2['default'](element);
      var publicProps = instance._processProps(instance._currentElement.props);

      var publicContext = instance._processContext(instance._currentElement._context);

      var inst = new Component(publicProps, publicContext);
      var getThundercats = typeof inst.getThundercats === 'function' ? inst.getThundercats : function () {
        return {};
      };

      var val = {};
      var thundercats = this.thundercats = getThundercats(inst.props, inst.state);

      // set up observable state. This can be a single store or a combination of
      // multiple stores
      if (thundercats.store) {
        this.observableState = cat.getStore(thundercats.store);
        verifyStore(this.displayName, thundercats.store, this.observableState);
        if (typeof thundercats.map === 'function') {
          val = thundercats.map(this.observableState.value);
          this.observableState = this.observableState.map(thundercats.map);
        } else {
          val = this.observableState.value;
        }
      } else if (thundercats.stores) {
        var _Rx$Observable;

        (function () {
          var storeNames = [].slice.call(thundercats.stores);
          var combineLatest = storeNames.pop();

          /* istanbul ignore else */
          if (__DEV__) {
            _invariant2['default'](typeof combineLatest === 'function', '%s should get a function for the last argument for ' + 'thundercats.stores but got %s', _this2.displayName, combineLatest);
          }

          var stores = [];
          var values = [];
          storeNames.forEach(function (storeName) {
            var store = cat.getStore(storeName);
            verifyStore(_this2.displayName, storeName, store);
            stores.push(store);
            values.push(store.value);
          });

          var args = [].slice.call(stores);
          args.push(combineLatest);
          _this2.observableState = (_Rx$Observable = _rx2['default'].Observable).combineLatest.apply(_Rx$Observable, _toConsumableArray(args));

          val = combineLatest.apply(undefined, values);
        })();
      }

      /* istanbul ignore else */
      if (__DEV__ && (thundercats.store || thundercats.stores)) {
        _invariant2['default'](_utils.isObservable(this.observableState), '%s should get at a store but found none for %s', this.displayName, thundercats.store || thundercats.stores);
      }

      this.state = _objectAssign2['default']({}, val);

      // set up actions on state. These will be passed down as props to child
      if (thundercats.actions) {
        var actionsClassNames = Array.isArray(thundercats.actions) ? thundercats.actions : [thundercats.actions];

        actionsClassNames.forEach(function (name) {
          _this2.state[name] = cat.getActions(name);
        });
      }
    }

    _inherits(Container, _React$Component);

    _createClass(Container, [{
      key: 'componentWillMount',
      value: function componentWillMount() {
        var cat = this.context.cat;
        var props = this.props;
        var thundercats = this.thundercats;

        if (thundercats.fetchAction && cat.fetchMap) {
          /* istanbul ignore else */
          if (__DEV__) {
            _invariant2['default'](thundercats.fetchAction.split('.').length === 2, '%s fetch action should be in the form of ' + '`actionsClass.actionMethod` but was given %s', props.fetchAction);

            _invariant2['default'](typeof thundercats.store === 'string' || typeof thundercats.fetchWaitFor === 'string', '%s requires a store to wait for after fetch but was given %s', thundercats.store || thundercats.fetchWaitFor);
          }

          var fetchActionsName = thundercats.fetchAction.split('.')[0];
          var fetchMethodName = thundercats.fetchAction.split('.')[1];
          var fetchActionsInst = cat.getActions(fetchActionsName);
          var fetchStore = cat.getStore(thundercats.store || thundercats.fetchWaitFor);

          /* istanbul ignore else */
          if (__DEV__) {
            _invariant2['default'](fetchActionsInst && fetchActionsInst[fetchMethodName], '%s expected to find actions class for %s, but found %s', this.displayName, thundercats.fetchAction, fetchActionsInst);

            _invariant2['default'](_utils.isObservable(fetchStore), '%s should get an observable but got %s for %s', this.displayName, fetchStore, thundercats.fetchWaitFor);
          }

          debug('cat returned %s for %s', fetchActionsInst.displayName, fetchActionsName);

          var fetchContext = {
            name: thundercats.fetchAction,
            payload: thundercats.payload || {},
            store: fetchStore,
            action: fetchActionsInst[fetchMethodName]
          };
          cat.fetchMap.set(fetchContext.name, fetchContext);
        }
      }
    }, {
      key: 'componentDidMount',
      value: function componentDidMount() {
        /* istanbul ignore else */
        if (this.observableState) {
          // Now that the component has mounted, we will use a long lived
          // subscription
          this.stateSubscription = this.observableState['catch'](this.thundercats.onError || storeOnError).subscribe(this.storeOnNext.bind(this), storeOnError, this.thundercats.onCompleted || storeOnCompleted);
        }
      }
    }, {
      key: 'componentWillUnmount',
      value: function componentWillUnmount() {
        /* istanbul ignore else */
        if (this.stateSubscription) {
          debug('disposing store subscription');
          this.stateSubscription.dispose();
          this.stateSubscription = null;
        }
      }
    }, {
      key: 'storeOnNext',
      value: function storeOnNext(val) {
        debug('%s value updating', this.displayName, val);
        this.setState(val);
      }
    }, {
      key: 'render',
      value: function render() {
        return _react2['default'].createElement(Component, _objectAssign2['default']({}, this.state, this.props));
      }
    }], [{
      key: 'displayName',
      value: Component.displayName + 'Container',
      enumerable: true
    }, {
      key: 'propTypes',
      value: Component.propTypes,
      enumerable: true
    }, {
      key: 'contextTypes',
      value: { cat: _react.PropTypes.object.isRequired },
      enumerable: true
    }]);

    return Container;
  })(_react2['default'].Component);

  return Container;
}

module.exports = exports['default'];