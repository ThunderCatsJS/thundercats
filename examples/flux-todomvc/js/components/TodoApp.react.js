/**
 * Copyright (c) 2014, Facebook, Inc.
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
var StateStreamMixin = require('rx-react').StateStreamMixin;


var TodoApp = React.createClass({
  mixins: [StateStreamMixin],
  
  contextTypes: {
    todoStore: React.PropTypes.object.isRequired,
  },
  
  getStateStream: function() {
    return this.context.todoStore.map(function (todos) {
      return {
        allTodos: todos,
        areAllComplete: Object.keys(todos).every(function (id) {
          return todos[id].completed;
        })
      };
    });
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


});

module.exports = TodoApp;
