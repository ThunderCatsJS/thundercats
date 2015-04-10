const React = require('react/addons');

class ContextWrapper extends React.Component {

  getChildContext() {
    return {
      cat: this.props.cat
    };
  }

  render() {
    return this.props.children;
  }
}

ContextWrapper.displayName = 'ThunderCatsContextWrapper';
ContextWrapper.propTypes = {
  cat: React.PropTypes.object,
  children: React.PropTypes.element
};

ContextWrapper.childContextTypes = {
  cat: React.PropTypes.object
};

module.exports = ContextWrapper;
