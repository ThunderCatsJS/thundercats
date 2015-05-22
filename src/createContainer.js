import Rx from 'rx';
import React, { PropTypes } from 'react';
import invariant from 'invariant';
import assign from 'object.assign';
import debugFactory from 'debug';
import { isObservable } from './utils';

const __DEV__ = process.env.NODE_ENV !== 'production';
const debug = debugFactory('thundercats:container');

function getThundercatsFromComponent(Component) {
  return typeof Component.prototype.getThundercats === 'function' ?
      Component.prototype.getThundercats :
      () => ({});
}

function getChildContext(childContextTypes, currentContext) {

  const compContext = assign({}, currentContext);
  // istanbul ignore else
  if (!childContextTypes || !childContextTypes.cat) {
    delete compContext.cat;
  }
  return compContext;
}

function storeOnError(err) {
  throw new Error(
    'ThunderCats Store encountered an error: ' + err
  );
}

function storeOnCompleted() {
  console.warn('Store has shutdown without error');
}

function verifyStore(displayName, storeName, store) {
  /* istanbul ignore else */
  if (__DEV__) {
    invariant(
      isObservable(store) &&
      typeof store.value === 'object',
      '%s should get at a store with a value but got %s for %s ' +
      'with value %s',
      displayName,
      store,
      storeName,
      store && store.value
    );
  }
}

export default function createContainer(Component) {
  /* istanbul ignore else */
  if (__DEV__) {
    invariant(
      typeof Component === 'function',
      'Container child should be a React Component but got %s',
      Component
    );
  }

  return class extends React.Component {

    constructor(props, context) {
      super(props, context);

      /* istanbul ignore else */
      if (__DEV__) {
        invariant(
          typeof context.cat === 'object',
          '%s should find an instance of the Cat in the context but got %s',
          this.constructor.displayName,
          context.cat
        );
      }

      const cat = context.cat;
      let val = {};
      this.getThundercats = getThundercatsFromComponent(Component);
      const thundercats = this.thundercats =
        this.getThundercats(props, getChildContext(context));

      // set up observable state. This can be a single store or a combination of
      // multiple stores
      if (thundercats.store) {
        this.observableState = cat.getStore(thundercats.store);
        verifyStore(this.displayName, thundercats.store, this.observableState);
        if (typeof thundercats.map === 'function') {
          val = thundercats.map(this.observableState.value);
          this.observableState = this.observableState.map(thundercats.map);
        } else {
          val = this.observableState.value;
        }

      } else if (thundercats.stores) {
        const storeNames = [].slice.call(thundercats.stores);
        const combineLatest = storeNames.pop();

        /* istanbul ignore else */
        if (__DEV__) {
          invariant(
            typeof combineLatest === 'function',
            '%s should get a function for the last argument for ' +
            'thundercats.stores but got %s',
            this.displayName,
            combineLatest
          );
        }

        const stores = [];
        const values = [];
        storeNames.forEach(storeName => {
          let store = cat.getStore(storeName);
          verifyStore(this.displayName, storeName, store);
          stores.push(store);
          values.push(store.value);
        });

        const args = [].slice.call(stores);
        args.push(combineLatest);
        this.observableState =
          Rx.Observable.combineLatest(...args);

        val = combineLatest(...values);
      }

      /* istanbul ignore else */
      if (__DEV__ && (thundercats.store || thundercats.stores)) {
        invariant(
          isObservable(this.observableState),
          '%s should get at a store but found none for %s',
          this.displayName,
          thundercats.store || thundercats.stores
        );
      }

      this.state = assign({}, val);

      // set up actions on state. These will be passed down as props to child
      if (thundercats.actions) {
        const actionsClassNames = Array.isArray(thundercats.actions) ?
          thundercats.actions :
          [thundercats.actions];

        actionsClassNames.forEach(name => {
          this.state[name] = cat.getActions(name);
        });
      }
    }

    static contextTypes = assign(
      {},
      Component.contextTypes || {},
      { cat: PropTypes.object.isRequired }
    );
    static displayName = Component.displayName + 'Container'
    static propTypes = Component.propTypes

    componentWillMount() {
      const cat = this.context.cat;
      const { thundercats } = this;

      if (thundercats.fetchAction) {
        /* istanbul ignore else */
        if (__DEV__) {
          invariant(
            thundercats.fetchAction.split('.').length === 2,
            '%s fetch action should be in the form of ' +
            '`actionsClass.actionMethod` but was given %s',
            thundercats.fetchAction
          );

          invariant(
            typeof thundercats.store === 'string' ||
            typeof thundercats.fetchWaitFor === 'string',
            '%s requires a store to wait for after fetch but was given %s',
            thundercats.store || thundercats.fetchWaitFor
          );
        }

        const fetchActionsName = thundercats.fetchAction.split('.')[0];
        const fetchMethodName = thundercats.fetchAction.split('.')[1];
        const fetchActionsInst = cat.getActions(fetchActionsName);
        const fetchStore = cat.getStore(
          thundercats.store || thundercats.fetchWaitFor
        );

        /* istanbul ignore else */
        if (__DEV__) {
          invariant(
            fetchActionsInst && fetchActionsInst[fetchMethodName],
            '%s expected to find actions class for %s, but found %s',
            this.displayName,
            thundercats.fetchAction,
            fetchActionsInst
          );

          invariant(
            isObservable(fetchStore),
            '%s should get an observable but got %s for %s',
            this.displayName,
            fetchStore,
            thundercats.fetchWaitFor
          );
        }

        debug(
          'cat returned %s for %s',
          fetchActionsInst.displayName,
          fetchActionsName
        );

        const fetchContext = {
          name: thundercats.fetchAction,
          payload: thundercats.payload || {},
          store: fetchStore,
          action: fetchActionsInst[fetchMethodName]
        };

        if (cat.fetchMap) {
          cat.fetchMap.set(fetchContext.name, fetchContext);
        } else {
          thundercats.context = fetchContext;
        }
      }
    }

    componentDidMount() {
      /* istanbul ignore else */
      if (this.observableState) {
        // Now that the component has mounted, we will use a long lived
        // subscription
        this.stateSubscription = this.observableState
          .catch(this.thundercats.onError || storeOnError)
          .subscribe(
            this.storeOnNext.bind(this),
            storeOnError,
            this.thundercats.onCompleted || storeOnCompleted
          );
      }
      if (this.thundercats && this.thundercats.context) {
        this.thundercats.context.action(this.thundercats.context.payload);
      }
    }

    componentWillReceiveProps(nextProps, nextContext) {
      const { payload } =
        this.getThundercats(nextProps, getChildContext(nextContext));
      const { thundercats } = this;
      if (thundercats && payload !== thundercats.payload) {
        this.thundercats.context.action(this.thundercats.context.payload);
      }
    }

    componentWillUnmount() {
      /* istanbul ignore else */
      if (this.stateSubscription) {
        debug('disposing store subscription');
        this.stateSubscription.dispose();
        this.stateSubscription = null;
      }
      this.thundercats = null;
    }

    storeOnNext(val) {
      debug('%s value updating', this.displayName, val);
      this.setState(val);
    }

    render() {
      return React.createElement(
        Component,
        assign({}, this.state, this.props)
      );
    }
  };
}
