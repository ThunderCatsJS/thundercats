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
    'ThunderCats Store encountered an error and has shutdown with: ' + err
  );
}

function storeOnCompleted() {
  console.warn('Store has shutdown without error');
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

    const element = props.children;
    const Component = element.type;

    /* istanbul ignore else */
    if (__DEV__) {
      invariant(
        typeof Component === 'function',
        'Container child should be a React Component but got %s',
        Component
      );
    }

    const instance = instantiateReactComponent(element);
    const publicProps =
      instance._processProps(instance._currentElement.props);

    const publicContext =
      instance._processContext(instance._currentElement._context);

    const inst = new Component(publicProps, publicContext);
    const getThundercats =
      inst.getThundercats && typeof inst.getThundercats === 'function' ?
      inst.getThundercats :
      () => ({});

    this.thundercats = getThundercats(inst.props, inst.state);
    this.thundercatsStore = context.cat.getStore(this.thundercats.store);
    this.displayName = Component.displayName + ' Container';

    /* istanbul ignore else */
    if (__DEV__) {
      invariant(
        this.thundercatsStore && isObservable(this.thundercatsStore),
        '%s should get at a store but found none for %s',
        this.displayName,
        this.thundercats.store
      );
    }

    let val = this.thundercatsStore.value;

    /* istanbul ignore else */
    if (val) {
      this.state = assign({}, val);
    } else {
      this.state = {};
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
      }

      const fetchActionsName = thundercats.fetchAction.split('.')[0];
      const fetchMethodName = thundercats.fetchAction.split('.')[1];
      const fetchActionsInst = cat.getActions(fetchActionsName);

      /* istanbul ignore else */
      if (__DEV__) {
        invariant(
          fetchActionsInst && fetchActionsInst[fetchMethodName],
          '%s expected to find actions class for %s, but found %s',
          this.displayName,
          thundercats.fetchAction,
          fetchActionsInst
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
        store: this.thundercatsStore,
        action: fetchActionsInst[fetchMethodName]
      };
      cat.fetchMap.set(fetchContext.name, fetchContext);
    }
  }

  // ### Component Did Mount
  //
  // This is where we subscribe to the observable Store and track its value.
  // Updates to the stores value will call setState on the container and the
  // container will add that value to child's props
  componentDidMount() {
    // Now that the component has mounted, we will use a long lived
    // the subscription
    debug('subscribing to %s', this.thundercatsStore.displayName);
    this.storeSubscription = this.thundercatsStore
      .catch(this.thundercats.onError || storeOnError)
      .subscribe(
        this.storeOnNext.bind(this),
        storeOnError,
        this.thundercats.onCompleted || storeOnCompleted
      );
  }

  // ### Component Will Unmount
  //
  // On unmount, the subscription to the observable Store is disposed
  componentWillUnmount() {
    debug('disposing store subscription');
    this.storeSubscription.dispose();
    this.storeSubscription = null;
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
