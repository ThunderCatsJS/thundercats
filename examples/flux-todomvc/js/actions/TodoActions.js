var uuid = require('node-uuid');
var TodoService = require('../services/todoService');

var Footer = require('../components/footer');
var Header = require('../components/header');
var TodoItem = require('../components/todoItem');
var MainSection = require('../components/mainSection');

// warning: makes heavy use es6 destructuring
var TodoActions = {

  create: Header.createTodo.map(function(text) {
    var todo = {
      id: uuid.v4(),
      text,
      completed: false
    };
    return {todo, promise: TodoService.create(todo) };
  }),

  updateText: TodoItem.updateTodo.map(function ({ text, id }) {
    return {
      text,
      id,
      promise: TodoService.updateText(id, text)
    };
  }),

  toggleComplete: TodoItem.toggleComplete.map(
    (id) => ({id, promise: TodoService.toggleComplete(id)})
  ),

  toggleCompleteAll: MainSection.toggleCompleteAll.map(
    () => ({promise: TodoService.toggleCompleteAll()})
  ),

  destroy: TodoItem.destroyTodo.map(
    (id) => ({id, promise: TodoService.destroy(id)})
  ),

  destroyCompleted: Footer.clearButtonClick.map(
    () => ({promise: TodoService.destroyCompleted()})
  )

};

module.exports = TodoActions;
