import React from 'react';
import StyleSheet from 'react-style';
import { Colors } from 'react-material/lib/style';
import urls from '../../constants/urls';

const HomeStyles = StyleSheet.create({
  normal: {
    backgroundColor: Colors.grey.P100,
    minHeight: '100%'
  },

  container: {
    margin: 'auto',
    maxWidth: '700px',
    padding: '56px 20px 0'
  },

  header: {
    color: Colors.indigo.P500,
    fontSize: '34',
    lineHeight: '32px',
    marginBottom: 42,
    paddingTop: 80,
    fontWeight: 400
  },

  paragraph: {
    color: Colors.grey.P900,
    fontSize: '20',
    lineHeight: '32px'
  }
});

export default class extends React.Component {
  static displayName = 'Home'
  render() {
    return (
      <div styles={ [HomeStyles.container] }>
        <header>
          <h1 styles={ [HomeStyles.header] }>ThunderCats, Ho!</h1>
        </header>
        <p>
          A <a href={ urls.flux }>Flux</a>
          {' '}
          architecture implementation based on
          {' '}
          <a href={ urls.rxjs }>RxJS</a>
        </p>
        <p>
          The
          {' '}
          <a href={ urls.flux }>Flux</a>
          {' '}
          architecture allows you to think of your application as an
          unidirectional flow of data, this module aims to facilitate the use
          of
          {' '}
          <a href={ urls.rxjs }>RxJS Observable</a> as basis for
          defining the relations between the different entities composing
          your application.
        </p>

        <h2>Difference with the
          Facebooks Flux
        </h2>
        <p>
          Thundercats.js shares more similarities with
          {' '}
          <a href={ urls.reflux }>RefluxJS</a>
          {' '}
          than with the
          original architecture.
        </p>
        <ul>
          <li>A store is an
            {' '}
            <a href={ urls.rxjs }>RxJS Observable</a>
            {' '}
            that a view layer can listen to for state
          </li>
          <li>An action is a function and an
            {' '}
            <a href={ urls.rxjs }>RxJS Observable</a>
            {' '}
          </li>
          <li>A store subscribes to an action and updates its state
            according to the actions operations.
          </li>
          <li>Actions dispatch themselves so no need for a central
            dispatcher.
          </li>
        </ul>
        <div>
          <p><a href={ urls.source }>View The Source</a></p>
        </div>
      </div>
    );
  }
}
