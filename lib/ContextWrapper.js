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

  getChildContext: function() {
    return {
      cat: this.props.cat
    };
  },

  render: function() {
    return this.props.children;
  }
});

module.exports = ContextWrapper;
