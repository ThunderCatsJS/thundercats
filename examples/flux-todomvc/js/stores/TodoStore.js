/*
 * Copyright (c) 2014, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * TodoStore
 */

var EventEmitter = require('events').EventEmitter;
var TodoConstants = require('../constants/TodoConstants');
var assign = require('object-assign');
var Store = require('thundercats').Store;
var TodoActions = require('../actions/TodoActions')

var CHANGE_EVENT = 'change';

class TodoStore extends Store {
  constructor () {
    super()
  }
  getInitialValue() {
    return {
      _todos: {}
    };
  }
  getOperations() {
    return [
      TodoActions.create,
      TodoActions.updateText,
      TodoActions.toggleComplete,
      TodoActions.toggleCompleteAll,
      TodoActions.destroy,
      TodoActions.destroyCompleted
    ];
  }
}

module.exports = new TodoStore;
