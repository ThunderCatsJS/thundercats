import React from 'react';
import { Actions } from 'thundercats';
import cx from 'react/lib/cx';

const { PropTypes } = React;
const ESCAPE_KEY = 27;
const ENTER_KEY = 13;

export class ItemActions extends Actions {
  constructor() {
    super([
      'handleBlur',
      'handleDoubleClick',
      'handleKeyDown',
      'handleTextChange'
    ]);
  }
}

export default class Item extends React.Component {
  constructor(props) {
    super(props);
    this.state = { editText: props.todo.text };
    this.itemActions = new ItemActions();
  }

  static displayName = 'TodoItem'

  static propTypes = {
    editing: React.PropTypes.bool.isRequired,
    itemActions: PropTypes.object.isRequired,
    onCancel: PropTypes.func.isRequired,
    onEdit: PropTypes.func.isRequired,
    onSave: PropTypes.func.isRequired,
    todo: PropTypes.object.isRequired,
    todoActions: PropTypes.object.isRequired
  }

  componentDidMount() {
    const { todo, todoActions } = this.props;
    const {
      handleBlur,
      handleDoubleClick,
      handleKeyDown,
      handleTextChange
    } = this.props.itemActions;

    handleKeyDown
      .tap(e => {
        if (e.which === ESCAPE_KEY) {
          this.setState({ editText: todo.text });
          this.props.onCancel();
        }
      })
      .filter(e => e.which === ENTER_KEY)
      .doOnNext(e => e.preventDefault())
      .merge(handleBlur)
      .map(() => {
        return {
          val: this.state.editText.trim(),
          todo: todo
        };
      })
      .subscribe(({ val, todo }) => {
        if (val) {
          todoActions.updateText({ id: todo.id, text: val });
          this.props.onSave(todo.id);
          this.setState({ editText: val });
        } else {
          todoActions.destroy(todo.id);
        }
      });

    handleTextChange.subscribe(e => {
      this.setState({ editText: e.target.value});
    });

    handleDoubleClick.subscribe(() => {
      var { todo } = this.props;
      this.props.onEdit(todo.id);
      this.setState({ editText: todo.text });
    });

    /*
    this.lifecycle.componentDidUpdate
      .filter(prev => this.props.editing && !prev.editing)
      .subscribe(() => {
        var node = this.refs.editField.getDOMNode();
        node.focus();
        node.value = this.props.todo.text;
        node.setSelectionRange(node.value.length, node.value.length);
      });
    */
  }

  render() {
    const { todo, editing, todoActions } = this.props;
    const { editText } = this.state;
    const {
      handleTextChange,
      handleDoubleClick,
      handleKeyDown,
      handleBlur
    } = this.itemActions;

    const className = cx({
      completed: todo.complete,
      editing: editing
    });

    return (
      <li className={ className }>
        <div className='view'>
          <input
            checked={ todo.complete }
            className='toggle'
            onChange={ () => todoActions.toggleComplete(todo.id) }
            type='checkbox'/>
          <label
            className='todoLabel'
            onDoubleClick={ handleDoubleClick }>
            { todo.text }
          </label>
          <button
            className='destroy'
            onClick={ () => todoActions.destroyTodo(todo.id) }/>
        </div>
        <input
          className='edit'
          onBlur={ handleBlur }
          onChange={ handleTextChange }
          onKeyDown={ handleKeyDown }
          value={ editText }/>
      </li>
    );
  }
}
