'use strict';

var React = require('react/addons');

var ContextWrapper = React.createClass({
  displayName: 'ThunderCatsContextWrapper',

  propTypes: {
    cat: React.PropTypes.object,
    children: React.PropTypes.element
  },

  childContextTypes: {
    cat: React.PropTypes.object
  },

  getChildContext: function getChildContext() {
    return {
      cat: this.props.cat
    };
  },

  render: function render() {
    return this.props.children;
  }
});

module.exports = ContextWrapper;