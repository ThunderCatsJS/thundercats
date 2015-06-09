import React, { PropTypes } from 'react';
import { createContainer } from 'thundercats';

import routes from '../routes';
import Footer from './Footer.jsx';
import Header from './Header.jsx';
import Main from './Main.jsx';

@createContainer({
  store: 'todoStore',
  fetchAction: 'todoActions.fetchState',
  map: ({ currentRoute, todosMap }) => {
    const allTodos = Object.keys(todosMap).reduce(function (todos, id) {
      todos.push(todosMap[id]);
      return todos;
    }, []);

    const todos = allTodos.filter(({ complete }) => (
      currentRoute === routes.ALL ||
      (complete && currentRoute === routes.COMPLETED) ||
      (!complete && currentRoute === routes.ACTIVE)
    ));

    const areAllComplete = allTodos.every(todo => todo.complete);

    const activeTodosCount = allTodos.reduce((accum, todo) => {
      return todo.complete ? accum : accum + 1;
    }, 0);

    const completeTodosCount = allTodos.length - activeTodosCount;

    return {
      activeTodosCount,
      allTodosCount: allTodos.length,
      areAllComplete,
      completeTodosCount,
      currentRoute,
      todos
    };
  }
})
export default class App extends React.Component {
  constructor(props) {
    super(props);
  }

  static displayName = 'App'
  static propTypes = {
    activeTodosCount: PropTypes.number,
    allTodosCount: PropTypes.number,
    areAllComplete: PropTypes.bool,
    completeTodosCount: PropTypes.number,
    currentRoute: PropTypes.string,
    todos: PropTypes.array
  };

  shouldComponentUpdate(props) {
    return this.props.todos !== props.todos ||
      this.props.currentRoute !== props.currentRoute;
  }

  render() {
    const {
      activeTodosCount,
      allTodosCount,
      areAllComplete,
      currentRoute,
      completeTodosCount,
      todos
    } = this.props;

    return (
      <div>
        <Header />
        <Main
          areAllComplete={ areAllComplete }
          todos={ todos }/>
        <Footer
          activeTodosCount={ activeTodosCount }
          allTodosCount={ allTodosCount }
          completeTodosCount={ completeTodosCount }
          currentRoute={ currentRoute }/>
      </div>
    );
  }
}
