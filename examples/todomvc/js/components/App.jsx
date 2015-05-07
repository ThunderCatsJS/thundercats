import React, { PropTypes } from 'react';

import routes from '../routes';
import Footer from './Footer.jsx';
import Header from './Header.jsx';
import Main from './Main.jsx';

export default class App extends React.Component {
  constructor(props) {
    super(props);
  }

  static displayName = 'App'
  static propTypes = {
    todosMap: PropTypes.array,
    currentRoute: PropTypes.string
  };

  getThundercats() {
    return {
      store: 'todoStore'
    };
  }

  shouldComponentUpdate(props) {
    return this.props.todosMap !== props.todosMap ||
      this.props.currentRoute !== props.currentRoute;
  }

  render() {
    const { currentRoute, todosMap } = this.props;

    const allTodos = Object.keys(todosMap).reduce(function (todos, id) {
      todos.push(todosMap[id]);
      return todos;
    }, []);

    const todos = allTodos.filter(({ complete }) => (
      currentRoute === routes.ALL ||
      (complete && currentRoute === routes.COMPLETED) ||
      (!complete && currentRoute === routes.ACTIVE)
    ));

    const areAllComplete = todos.every(todo => todo.complete);

    const activeTodosCount = todos.reduce((accum, todo) => {
      return todo.complete ? accum : accum + 1;
    }, 0);

    const completeTodosCount = todos.length - activeTodosCount;

    return (
      <div>
        <Header />
        <Main
          areAllComplete={ areAllComplete }
          todos={ todos }/>
        <Footer
          activeTodosCount={ activeTodosCount }
          completeTodosCount={ completeTodosCount }
          currentRoute={ currentRoute }/>
      </div>
    );
  }
}
