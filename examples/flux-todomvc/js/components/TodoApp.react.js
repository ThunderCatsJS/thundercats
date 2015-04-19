/**
 * Copyright (c) 2014-2015, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 */

/**
 * This component operates as a "Controller-View".  It listens for changes in
 * the TodoStore and passes the new data to its children.
 */

var Footer = require('./Footer.react');
var Header = require('./Header.react');
var MainSection = require('./MainSection.react');
var React = require('react');
var TodoStore = require('../stores/TodoStore');
var ObservableStateMixin = require('thundercats').ObservableStateMixin;

/**
 * Retrieve the current TODO data from the TodoStore
 */
function mapState(state) {
  var areAllComplete = true;
  for (var task in state._todos) {
    if (!task.complete) {
      areAllComplete = false;
    }
  }
  return {
    allTodos: state._todos,
    areAllComplete: areAllComplete
  };
}

var TodoApp = React.createClass({

  mixins: [ObservableStateMixin],

  getObservable: function() {
    return TodoStore.map(mapState)
  },

  /**
   * @return {object}
   */
  render: function() {
  	return (
      <div>
        <Header />
        <MainSection
          allTodos={this.state.allTodos}
          areAllComplete={this.state.areAllComplete}
        />
        <Footer allTodos={this.state.allTodos} />
      </div>
  	);
  },

  /**
   * Event handler for 'change' events coming from the TodoStore
   */
  _onChange: function() {
    this.setState(mapState());
  }

});

module.exports = TodoApp;
