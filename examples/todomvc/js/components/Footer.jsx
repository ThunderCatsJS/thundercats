import React, { PropTypes } from 'react';
import cx from 'react/lib/cx';

import routes from '../routes';
import pluralize from '../utils/pluralize';

export default class Footer extends React.Component {
  constructor(props) {
    super(props);
  }

  static displayName = 'Footer'

  static propTypes = {
    activeTodosCount: PropTypes.number.isRequired,
    completeTodosCount: PropTypes.number.isRequired,
    currentRoute: PropTypes.string.isRequired,
    todoActions: PropTypes.object.isRequired
  }

  render() {
    const {
      activeTodosCount,
      completeTodosCount,
      currentRoute,
      todoActions
    } = this.props;

    if (!activeTodosCount && !completeTodosCount) {
      return null;
    }

    let clearButton = null;

    if (completeTodosCount > 0) {
      clearButton = (
        <button
          id='clear-completed'
          onClick={ todoActions.clearCompleted }>
          Clear completed ({ completeTodosCount })}
        </button>
      );
    }

    return (
      <footer id='footer'>
        <span id='todo-count'>
          <strong>{ activeTodosCount }</strong>
          { pluralize(activeTodosCount, 'item') } left
        </span>
        <ul id='filters'>
          <li>
            <a
              className={ cx({ selected: currentRoute === routes.ALL_TODOS }) }
              href='#/'>
              All
            </a>
          </li>
          {' '}
          <li>
            <a
              className={
                cx({ selected: currentRoute === routes.ACTIVE_TODOS })
              }
              href='#/active'>
              Active
            </a>
          </li>
          {' '}
          <li>
            <a
              className={
                cx({ selected: currentRoute === routes.COMPLETED_TODOS })
              }
              href='#/completed'>
              Completed
            </a>
          </li>
        </ul>
        { clearButton }
      </footer>
    );
  }
}

module.exports = Footer;
