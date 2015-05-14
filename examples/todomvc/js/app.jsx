import React from 'react';
import { Cat } from 'thundercats';
import { Router } from 'director';

import TodoStore from './stores/TodoStore';
import TodoActions from './actions/TodoActions';
import routes from './routes';
import RouterActions from './actions/RouterActions';
import TodoApp from './components/App.jsx';
import TodoService from './services/todoService';

class App extends Cat {
  constructor() {
    super();
    this.register(TodoActions);
    this.register(RouterActions);
    this.register(TodoStore, this);
  }
}

const app = new App();

const { changeRoute } = app.getActions('routerActions');

const router = Router({
  '/': function () {
    changeRoute(routes.ALL);
  },
  '/active': function () {
    changeRoute(routes.ACTIVE);
  },
  '/completed': function () {
    changeRoute(routes.COMPLETED);
  }
});

router.init('/');

app.render(<TodoApp />, document.getElementById('todoapp')).subscribe(
  () => {
    console.log('app rendered!');
  },
  err => {
    console.log('rendering has encountered an err: ', err);
  }
);

TodoService.init(app.getStore('todoStore'));
