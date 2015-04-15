import React from 'react/addons';
import invariant from 'invariant';

class ContextWrapper extends React.Component {
  constructor(props) {
    super(props);
  }

  // wrap a component in this context wrapper
  static wrap(Component) {
    invariant(
      React.isValidElement(Component),
      'cat.renderToString and render expects a valid React element'
    );
    return React.createElement(
      ContextWrapper,
      { cat: this },
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
  cat: React.PropTypes.object,
  children: React.PropTypes.element
};

ContextWrapper.childContextTypes = {
  cat: React.PropTypes.object
};

export default ContextWrapper;
