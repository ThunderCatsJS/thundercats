// Create Container
//
// Wraps a component in ThunderCats container.
// The container does the following.
//
// * retrieves and manages subscription to a ThunderCats Store
// * retrieves Actions for this store
// * register an active store
// * register a store as the recipient of a data fetch
// * initiates data fetch with given payload
//
// If a fetchAction is provided, the container Initiates fetching by calling
// the action defined as the fetchAction and will pass it the fetchPayload
// during the ComponentWillMount life cycle.
//
// props to pass to the container
//
// * store
// * actions
// * fetchAction
// * fetchPayload
// * onError
// * onCompleted
//
import React from 'react/addons';
import invariant from 'invariant';
import assign from 'object.assign';
import debugFactory from 'debug';
import { isObservable } from './utils';

const debug = debugFactory('thundercats:container');

class Container extends React.Component {

  constructor(props, context) {
    super(props, context);

    this.state = {};
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

    if (props.fetchAction) {
      invariant(
        props.fetchAction.split('.').length === 2,
        '%s fetch action should be in the form of ' +
        '`actionsClass.actionMethod` but was given %s',
        props.fetchAction
      );

      this.state.fetchClass = props.fetchAction.split('.')[0];
      this.state.fetchMethod = props.fetchAction.split('.')[1];
    }

    this.displayName = props.children.type.displayName ?
      props.children.type.displayName + ' Container' :
      'Anon Container';

    this.state.store = context.cat.getStore(props.store);

    invariant(
      this.state.store && isObservable(this.state.store),
      '%s should get at a store but found none for %s',
      this.displayName,
      props.store
    );

    let val = this.state.store.__value;
    this._checkVal(val);

    /* istanbul ignore else */
    if (val) {
      this.state = assign({}, this.state, val);
    }
  }

  static displayName = 'ThunderCatainer'

  static propTypes = {
    actions: React.PropTypes.oneOfType([
      React.PropTypes.string,
      React.PropTypes.arrayOf(React.PropTypes.string)
    ]),
    children: React.PropTypes.element.isRequired,
    fetchAction: React.PropTypes.string,
    fetchPayload: React.PropTypes.object,
    store: React.PropTypes.string.isRequired
  }

  static contextTypes = {
    cat: React.PropTypes.object.isRequired
  }

  // ### Component Will Mount
  //
  // This is triggered on both the server and the client. This will do the
  // following:
  //
  // * get the actions relevant to the component
  // * call the data fetch action with fetch payload
  // * register the store to wait for data fetch completion
  //
  componentWillMount() {
    const cat = this.context.cat;
    // get actions
    if (this.props.actions) {
      var actionsNames = this.props.actions;
      debug('getting actions for %s', actionsNames);

      /* istanbul ignore else */
      if (!Array.isArray(actionsNames)) {
        actionsNames = [actionsNames];
      }

      actionsNames.forEach((actionsName) => {
        // lowercase first later of actions as it is an instance;
        this.state[
          actionsName.slice(0, 1).toLowerCase() + actionsName.slice(1)
        ] = cat.getActions(actionsName);
      });
    }
    // initiate fetch if fetchAction is supplied
    if (this.state.fetchClass) {
      const fetchActions = cat.getActions(this.state.fetchClass);
      const fetchMethod = this.state.fetchMethod;
      debug(
        'getAction for %s returned %s',
        this.state.fetchClass,
        fetchActions
      );
      invariant(
        fetchActions && fetchActions[fetchMethod],
        '%s expected to find actions class for %s, but found %s',
        this.displayName,
        this.props.fetchAction,
        fetchActions
      );
      const fetchCtx = {
        name: this.props.fetchAction,
        payload: this.props.fetchPayload || {},
        action: fetchActions[fetchMethod]
      };
      cat.registerFetcher(fetchCtx);
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
    debug('subscribing to %s', this.state.store.displayName);
    this.storeSubscription = this.state.store.subscribe(
      this._storeOnNext.bind(this),
      this.props.onError || this._storeOnError,
      this.props.onCompleted || this._storeOnCompleted
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

  render() {
    return React.addons.cloneWithProps(
      this.props.children,
      assign({}, this.state)
    );
  }

  // This is the observer that will watch the observable Store.
  _storeOnNext(val) {
    this._checkVal(val);
    debug('%s value updating', this.displayName, val);
    this.setState(val);
  }

  // If the observable Store throws an error this method will be called. This
  // can be overwritten by providing `onError` function on the props of this
  // container
  _storeOnError(err) {
    throw new Error(
      'ThunderCats Store encountered an error and has shutdown with: ' + err
    );
  }

  // If the observable Store completes, this method is called. This can be
  // overwritten by providing `onCompleted` function on the props of the
  // container
  _storeOnCompleted() {
    console.warn('Store has shutdown without error');
  }

  // Checks to make sure the value provided by the store is either an object or
  // null
  _checkVal(val) {
    invariant(
      typeof val === 'object',
      '%s should get objects or null from its store but was given: %s',
      this.displayName,
      val
    );
  }
}

export default Container;
