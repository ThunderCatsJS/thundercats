import Rx from 'rx';
import { createContainer } from 'thundercats';
import React, { PropTypes } from 'react';

const ENTER_KEY = 13;

@createContainer({
  actions: ['todoActions']
})
export default class Header extends React.Component {
  constructor(props, context) {
    super(props, context);
  }

  static displayName = 'Header'
  static propTypes = {
    todoActions: PropTypes.object
  }

  componentDidMount() {
    const { todoActions } = this.props;

    const handleKeyDownObs = new Rx.Subject();
    this.handleKeyDown = handleKeyDownObs.onNext.bind(handleKeyDownObs);

    this.subscription = handleKeyDownObs
      .filter(e => e.which === ENTER_KEY)
      .tap(e => e.preventDefault())
      .map(({ target }) => target)
      .filter(input => !!input.value.trim())
      .subscribe(input => {
        const val = input.value.trim();
        input.value = '';
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
