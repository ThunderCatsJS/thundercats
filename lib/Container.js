import Rx from 'rx';
import React, { PropTypes } from 'react';
import cloneWithProps from 'react/lib/cloneWithProps';
import instantiateReactComponent from 'react/lib/instantiateReactComponent';
import invariant from 'invariant';
import assign from 'object.assign';
import debugFactory from 'debug';
import { isObservable } from './utils';

const __DEV__ = process.env.NODE_ENV !== 'production';
const debug = debugFactory('thundercats:container');

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

export default class Container extends React.Component {

  constructor(props, context) {
    super(props, context);

    /* istanbul ignore else */
    if (__DEV__) {
      invariant(
        props.children && !Array.isArray(props.children),
        'Container expects a single child but got %s',
        props.children
      );

      invariant(
        context.cat,
        'Container expects an instance of the Cat on the container but got %s',
        context.cat
      );
    }

    const cat = context.cat;
    const element = props.children;
    const Component = element.type;
    this.displayName = Component.displayName + ' Container';

    /* istanbul ignore else */
    if (__DEV__) {
      invariant(
        typeof Component === 'function',
        'Container child should be a React Component but got %s',
        Component
      );
    }

    // instantiate the child component and call getThundercats to retrieve
    // config info
    const instance = instantiateReactComponent(element);
    const publicProps =
      instance._processProps(instance._currentElement.props);

    const publicContext =
      instance._processContext(instance._currentElement._context);

    const inst = new Component(publicProps, publicContext);
    const getThundercats = typeof inst.getThundercats === 'function' ?
      inst.getThundercats :
      () => ({});

    let val = {};
    const thundercats = this.thundercats =
      getThundercats(inst.props, inst.state);

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

  static displayName = 'ThunderCatainer'
  static propTypes = { children: PropTypes.element.isRequired }
  static contextTypes = { cat: PropTypes.object.isRequired }

  componentWillMount() {
    const cat = this.context.cat;
    const { props, thundercats } = this;

    if (thundercats.fetchAction && cat.fetchMap) {
      /* istanbul ignore else */
      if (__DEV__) {
        invariant(
          thundercats.fetchAction.split('.').length === 2,
          '%s fetch action should be in the form of ' +
          '`actionsClass.actionMethod` but was given %s',
          props.fetchAction
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
      cat.fetchMap.set(fetchContext.name, fetchContext);
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
  }

  componentWillUnmount() {
    /* istanbul ignore else */
    if (this.stateSubscription) {
      debug('disposing store subscription');
      this.stateSubscription.dispose();
      this.stateSubscription = null;
    }
  }

  storeOnNext(val) {
    debug('%s value updating', this.displayName, val);
    this.setState(val);
  }

  render() {
    return cloneWithProps(
      this.props.children,
      assign({}, this.state)
    );
  }
}
