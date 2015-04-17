import React from 'react/addons';
import invariant from 'invariant';

class ContextWrapper extends React.Component {
  constructor(props) {
    super(props);
  }

  // wrap a component in this context wrapper
  static wrap(Component, cat) {
    invariant(
      React.isValidElement(Component),
      'ContextWrapper wrap expects a valid React element'
    );

    invariant(
      typeof cat === 'object',
      'ContextWrapper expects an instance of Cat'
    );

    return React.createElement(
      ContextWrapper,
      { cat: cat },
      Component
    );
  }

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
  cat: React.PropTypes.object.isRequired,
  children: React.PropTypes.element.isRequired
};

ContextWrapper.childContextTypes = {
  cat: React.PropTypes.object.isRequired
};

export default ContextWrapper;
