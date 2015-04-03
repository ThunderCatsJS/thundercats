/*
 * Copyright (c) 2014-2015, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * TodoActions
 */

var TodoConstants = require('../constants/TodoConstants');
var Action = require('thundercats').Action
var assign = require('object-assign')

function update(id, updates, state) {
  state._todos[id] = assign({}, state._todos[id], updates);
}
function updateAll(updates, state) {
  for (var task in state._todos) {
    update(task, updates, state);
  }
}
function destroy(id, state) {
  delete state._todos[id]
}
function destroyCompleted(state) {
  for (var task in state._todos) {
    if (state._todos[task].complete) {
      destroy(task, state)
    }
  }
}
function areAllComplete(state) {
  for (var task in state._todos) {
    if (!state._todos[task].complete) {
      return false;
    }
  }
  return true;
}

var TodoActions = Action.createActions([

  /**
   * @param  {string} text
   */
  {
  name: 'create',
  map: function(text) {
    return {
      transform: function(storeState) {
        text = text.trim();
        if (text !== '') {
          var id = (+new Date() + Math.floor(Math.random() * 999999)).toString(36);
          storeState._todos[id] = {
            id: id,
            complete: false,
            text: text
          };
        }
        return storeState;
      }
    }
  }},

  /**
   * @param  {string} id The ID of the ToDo item
   * @param  {string} text
   * payload = {id: id, text: text}
   */
  {
  name: 'updateText',
  map: function(payload) {
    return {
      transform: function(storeState) {
        text = payload.text.trim();
        if (text != '') {
          update(payload.id, {text: payload.text}, storeState)
        }
        return storeState;
      }
    }
  }},

  /**
   * Toggle whether a single ToDo is complete
   * @param  {object} todo
   * payload = { id: id, complete: bool, text: str }
   */
  {
  name: 'toggleComplete',
  map: function(payload) {
    return {
      transform: function(storeState) {
        var id = payload.id;
        if (payload.complete) {
          update(id, {complete: false}, storeState)
        } else {
          update(id, {complete: true}, storeState)
        }
        return storeState;
      }
    }
  }},

  /**
   * Mark all ToDos as complete
   */
  {
  name: 'toggleCompleteAll',
  map: function(payload) {
    return {
      transform: function(storeState) {
        if (areAllComplete(storeState)) {
          updateAll({complete: false}, storeState)
        } else {
          updateAll({complete: true}, storeState)
        }
        return storeState;
      }
    }
  }},

  /**
   * @param  {string} id
   */
  {
  name: 'destroy',
  map: function(payload) {
    return {
      transform: function(storeState) {
        destroy(payload, storeState)
        return storeState;
      }
    }
  }},

  /**
   * Delete all the completed ToDos
   */
  {
  name: 'destroyCompleted',
  map: function(payload) {
    return {
      transform: function(storeState) {
        destroyCompleted(storeState)
        return storeState;
      }
    }
  }}
]);

module.exports = TodoActions;
