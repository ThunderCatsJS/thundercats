import Rx from 'rx';
import React, { PropTypes } from 'react';

const ENTER_KEY = 13;

export default class Header extends React.Component {
  constructor(props, context) {
    super(props, context);
    this.todoActions = context.cat.getActions('todoActions');
  }

  static displayName = 'Header'

  static contextTypes = {
    cat: PropTypes.object.isRequired
  }

  componentDidMount() {
    const { todoActions } = this;

    const handleKeyDownObs = new Rx.Subject();
    this.handleKeyDown = handleKeyDownObs.onNext(handleKeyDownObs);

    this.subscription = handleKeyDownObs
      .filter(e => e.which === ENTER_KEY)
      .tap(e => e.preventDefault())
      .map(({ target }) => target)
      .filter(input => !!input.value.trim())
      .subscribe(input => {
        const val = input.value.trim();
        todoActions.create(val);
      });
  }

  componentWillUnmount() {
    this.subscribtion.dispose();
  }

  render() {

    return (
      <header id='header'>
        <h1>todos</h1>
        <input
            autoFocus={ true }
            id='new-todo'
            onKeyDown={ this.handleKeyDown }
            placeholder='What needs to be done?'/>
      </header>
    );
  }
}
