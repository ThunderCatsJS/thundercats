'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x, _x2, _x3) { var _again = true; _function: while (_again) { desc = parent = getter = undefined; _again = false; var object = _x,
    property = _x2,
    receiver = _x3; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x = parent; _x2 = property; _x3 = receiver; _again = true; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) subClass.__proto__ = superClass; }

var _react = require('react');

var _react2 = _interopRequireDefault(_react);

var _reactLibCloneWithProps = require('react/lib/cloneWithProps');

var _reactLibCloneWithProps2 = _interopRequireDefault(_reactLibCloneWithProps);

var _invariant = require('invariant');

var _invariant2 = _interopRequireDefault(_invariant);

var ContextWrapper = (function (_React$Component) {
  function ContextWrapper(props) {
    _classCallCheck(this, ContextWrapper);

    _get(Object.getPrototypeOf(ContextWrapper.prototype), 'constructor', this).call(this, props);
  }

  _inherits(ContextWrapper, _React$Component);

  _createClass(ContextWrapper, [{
    key: 'getChildContext',
    value: function getChildContext() {
      return {
        cat: this.props.cat
      };
    }
  }, {
    key: 'render',
    value: function render() {
      return _reactLibCloneWithProps2['default'](this.props.children);
    }
  }], [{
    key: 'displayName',
    value: 'ThunderCatsContextWrapper',
    enumerable: true
  }, {
    key: 'propTypes',
    value: {
      cat: _react2['default'].PropTypes.object.isRequired,
      children: _react2['default'].PropTypes.element.isRequired
    },
    enumerable: true
  }, {
    key: 'childContextTypes',
    value: {
      cat: _react2['default'].PropTypes.object.isRequired
    },
    enumerable: true
  }, {
    key: 'wrap',

    // wrap a component in this context wrapper
    value: function wrap(Component, cat) {
      _invariant2['default'](_react2['default'].isValidElement(Component), 'ContextWrapper wrap expects a valid React element');

      _invariant2['default'](typeof cat === 'object', 'ContextWrapper expects an instance of Cat');

      return _react2['default'].createElement(ContextWrapper, { cat: cat }, Component);
    }
  }]);

  return ContextWrapper;
})(_react2['default'].Component);

exports['default'] = ContextWrapper;
module.exports = exports['default'];