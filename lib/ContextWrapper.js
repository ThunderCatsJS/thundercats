import React from 'react';
import cloneWithProps from 'react/lib/cloneWithProps';
import invariant from 'invariant';

class ContextWrapper extends React.Component {
  constructor(props) {
    super(props);
  }

  static displayName = 'ThunderCatsContextWrapper'
  static propTypes = {
    cat: React.PropTypes.object.isRequired,
    children: React.PropTypes.element.isRequired
  }

  static childContextTypes = {
    cat: React.PropTypes.object.isRequired
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
    return cloneWithProps(this.props.children);
  }
}

export default ContextWrapper;
