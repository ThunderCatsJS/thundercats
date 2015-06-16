import React from 'react';
import { Router, Route } from 'react-router';
import BrowserHistory from 'react-router/lib/BrowserHistory';


import App from './app.jsx';
import Home from './screens/home';

require('normalize.css/normalize.css');

var routerApp = (
  <Router history={ BrowserHistory }>
    <Route component={ App }>
      <Route
        component={ Home }
        path='*' />
    </Route>
  </Router>
);

React.render(routerApp, document.getElementById('thunder'));
