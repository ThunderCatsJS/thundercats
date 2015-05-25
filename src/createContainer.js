import Rx from 'rx';
import React, { PropTypes } from 'react';
import invariant from 'invariant';
import assign from 'object.assign';
import debugFactory from 'debug';
import { getName, isObservable } from './utils';

const __DEV__ = process.env.NODE_ENV !== 'production';
const debug = debugFactory('thundercats:container');

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

export default function createContainer(options, Component) {
  /* istanbul ignore else */
  if (__DEV__) {
    invariant(
      typeof options === 'object',
      '%s should get an options object but got %s',
      options
    );
  }
  /* istanbul ignore else */
  if (!Component) {
    return createContainer.bind(null, options);
  }
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
          getName(this),
          context.cat
        );
      }

      const cat = context.cat;
      let val = {};

      // set up observable state. This can be a single store or a combination of
      // multiple stores
      if (options.store) {
        this.observableState = cat.getStore(options.store);
        verifyStore(getName(this), options.store, this.observableState);

        if (typeof options.map === 'function') {
          val = options.map(this.observableState.value);
          this.observableState = this.observableState.map(options.map);
        } else {
          val = this.observableState.value;
        }

      } else if (options.stores) {
        const storeNames = [].slice.call(options.stores);
        const combineLatest = options.combineLatest;

        /* istanbul ignore else */
        if (__DEV__) {
          invariant(
            typeof combineLatest === 'function',
            '%s should get a function for options.combineLatest with ' +
            ' options.stores but got %s',
            getName(this),
            combineLatest
          );
        }

        const stores = [];
        const values = [];
        storeNames.forEach(storeName => {
          let store = cat.getStore(storeName);
          verifyStore(getName(this), storeName, store);
          stores.push(store);
          values.push(store.value);
        });

        const args = stores.slice(0);
        args.push(combineLatest);
        this.observableState =
          Rx.Observable.combineLatest(...args);

        val = combineLatest(...values);
      }

      /* istanbul ignore else */
      if (__DEV__ && (options.store || options.stores)) {
        invariant(
          isObservable(this.observableState),
          '%s should get at a store but found none for %s',
          getName(this),
          options.store || options.stores
        );
      }

      this.state = assign({}, val);

      // set up actions on state. These will be passed down as props to child
      if (options.actions) {
        const actionsClassNames = Array.isArray(options.actions) ?
          options.actions :
          [options.actions];

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
    static propTypes = Component.propTypes || {}

    componentWillMount() {
      const cat = this.context.cat;

      if (options.fetchAction) {
        /* istanbul ignore else */
        if (__DEV__) {
          invariant(
            options.fetchAction.split('.').length === 2,
            '%s fetch action should be in the form of ' +
            '`actionsClass.actionMethod` but was given %s',
            getName(this),
            options.fetchAction
          );

          invariant(
            typeof options.store === 'string' ||
            typeof options.fetchWaitFor === 'string',
            '%s requires a store to wait for after fetch but was given %s',
            getName(this),
            options.store || options.fetchWaitFor
          );

          invariant(
            typeof options.getPayload === 'function',
            '%s should get a function for options.getPayload but was given %s',
            getName(this),
            options.getPayload
          );
        }

        const fetchActionsName = options.fetchAction.split('.')[0];
        const fetchMethodName = options.fetchAction.split('.')[1];
        const fetchActionsInst = cat.getActions(fetchActionsName);
        const fetchStore = cat.getStore(
          options.store || options.fetchWaitFor
        );

        /* istanbul ignore else */
        if (__DEV__) {
          invariant(
            fetchActionsInst && fetchActionsInst[fetchMethodName],
            '%s expected to find actions class for %s, but found %s',
            getName(this),
            options.fetchAction,
            fetchActionsInst
          );

          invariant(
            isObservable(fetchStore),
            '%s should get an observable but got %s for %s',
            getName(this),
            fetchStore,
            options.fetchWaitFor
          );
        }

        debug(
          'cat returned %s for %s for %s',
          fetchActionsInst.displayName,
          fetchActionsName,
          getName(this)
        );

        const action = fetchActionsInst[fetchMethodName];

        if (cat.fetchMap) {
          debug('%s getPayload in componentWillMount', getName(this));
          const payload = options.getPayload(
            this.props,
            getChildContext(Component.contextTypes, this.context)
          );

          cat.fetchMap.set(options.fetchAction, {
            name: options.fetchAction,
            payload: payload,
            store: fetchStore,
            action: action
          });
        } else {
          options.action = action;
        }
      }
    }

    componentDidMount() {
      /* istanbul ignore else */
      if (this.observableState) {
        // Now that the component has mounted, we will use a long lived
        // subscription
        this.stateSubscription = this.observableState
          .subscribe(
            this.storeOnNext.bind(this),
            options.storeOnError || storeOnError,
            options.onCompleted || storeOnCompleted
          );
      }
      /* istanbul ignore else */
      if (options.action && options.getPayload) {
        debug('%s fetching on componentDidMount', getName(this));
        options.action(
          options.getPayload(
            this.props,
            getChildContext(Component.contextTypes, this.context)
          )
        );
      }
    }

    componentWillReceiveProps(nextProps, nextContext) {
      /* istanbul ignore else */
      if (
        options.action &&
        options.shouldContainerFetch &&
        options.shouldContainerFetch(
          this.props,
          nextProps,
          this.context,
          nextContext
        )
      ) {
        debug('%s fetching on componentWillReceiveProps', getName(this));
        options.action(
          options.getPayload(
          nextProps,
          getChildContext(Component.contextTypes, nextContext)
        ));
      }
    }

    componentWillUnmount() {
      /* istanbul ignore else */
      if (this.stateSubscription) {
        debug('%s disposing store subscription', getName(this));
        this.stateSubscription.dispose();
        this.stateSubscription = null;
      }
    }

    storeOnNext(val) {
      debug('%s value updating', getName(this), val);
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
