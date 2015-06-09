import React, { PropTypes } from 'react';
import { createContainer } from 'thundercats';
import Item from './Item.jsx';

@createContainer({
  actions: ['todoActions']
})
export default class Main extends React.Component {
  constructor(props, context) {
    super(props, context);
    this.state = { editing: null };
  }

  static displayName = 'Main'
  static propTypes = {
    areAllComplete: PropTypes.bool.isRequired,
    todoActions: PropTypes.object.isRequired,
    todos: PropTypes.array.isRequired
  }

  enterEdit(id) {
    this.setState({ editing: id });
  }

  exitEdit() {
    this.setState({ editing: null });
  }

  renderTodos(editing) {
    return this.props.todos.map(todo => (
      <Item
        editing={ editing === todo.id }
        key={ todo.id }
        onCancel={ this.exitEdit }
        onEdit={ this.enterEdit }
        onSave={ this.exitEdit }
        todo={ todo }/>
    ));
  }

  render() {
    const { editing } = this.state;
    const {
      areAllComplete,
      todos,
      todoActions
    } = this.props;

    if (!todos || !todos.length) {
      return null;
    }

    return (
      <section id='main'>
        <input
          checked={ areAllComplete ? 'checked' : '' }
          id='toggle-all'
          onChange={ todoActions.toggleCompleteAll }
          type='checkbox'/>
        <label htmlFor='toggle-all'>Mark all as complete</label>
        <ul id='todo-list'>
          { this.renderTodos(editing) }
        </ul>
      </section>
    );
  }
}
