import React, { PropTypes } from 'react';
import classNames from 'classNames';

import routes from '../routes';
import pluralize from '../utils/pluralize';

export default class Footer extends React.Component {
  constructor(props, context) {
    super(props, context);
    this.todoActions = context.cat.getActions('todoActions');
  }

  static displayName = 'Footer'

  static contextTypes = {
    cat: PropTypes.object
  }

  static propTypes = {
    activeTodosCount: PropTypes.number.isRequired,
    allTodosCount: PropTypes.number.isRequired,
    completeTodosCount: PropTypes.number.isRequired,
    currentRoute: PropTypes.string.isRequired
  }

  renderClearButton(completeTodosCount) {
    if (!completeTodosCount) {
      return null;
    }
    return (
      <button
        id='clear-completed'
        onClick={ this.todoActions.clearCompleted }>
        Clear completed ({ completeTodosCount })
      </button>
    );
  }

  render() {
    const {
      activeTodosCount,
      allTodosCount,
      completeTodosCount,
      currentRoute,
    } = this.props;

    if (!allTodosCount) {
      return null;
    }

    const allClass =
      classNames({ selected: currentRoute === routes.ALL });
    const activeClass =
      classNames({ selected: currentRoute === routes.ACTIVE });
    const completeClass =
      classNames({ selected: currentRoute === routes.COMPLETED });

    return (
      <footer id='footer'>
        <span id='todo-count'>
          <strong>{ activeTodosCount }</strong>
          { pluralize(activeTodosCount, 'item') }  left
        </span>
        <ul id='filters'>
          <li>
            <a
              className={ allClass }
              href='#/'>
              All
            </a>
          </li>
          {' '}
          <li>
            <a
              className={ activeClass }
              href='#/active'>
              Active
            </a>
          </li>
          {' '}
          <li>
            <a
              className={ completeClass }
              href='#/completed'>
              Completed
            </a>
          </li>
        </ul>
        { this.renderClearButton(completeTodosCount) }
      </footer>
    );
  }
}

module.exports = Footer;
