import uuid from 'node-uuid';
import { Actions } from 'thundercats';
import TodoService from '../services/todoService';

export default class TodoActions extends Actions {
  constructor() {
    super();
  }

  static displayName = 'TodoActions'

  create(text) {
    const todo = {
      id: uuid.v4(),
      text,
      complete: false
    };
    return {
      todo,
      promise: TodoService.create(todo)
    };
  }

  destroy(id) {
    return {
      id,
      promise: TodoService.destroy(id)
    };
  }

  destroyCompleted() {
    return {
      promise: TodoService.destroyCompleted()
    };
  }

  fetchTodos() {
    TodoService.getTodos()
      .then(state => {
        this.updateMany(state.todosMap);
      })
      .catch(err => {
        console.log('an error occurred retrieving todos from server: ', err);
      });
  }

  toggleComplete(id) {
    return {
      id,
      promise: TodoService.toggleComplete(id)
    };
  }

  toggleCompleteAll() {
    return {
      promise: TodoService.toggleCompleteAll()
    };
  }

  updateMany(todosMap) {
    return todosMap;
  }

  updateText({ id, text }) {
    return {
      id,
      text,
      promise: TodoService.updateText(id, text)
    };
  }
}
