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
const React = require('react/addons'),
    invariant = require('invariant'),
    assign = require('object.assign'),
    utils = require('./utils'),
    isObservable = utils.isObservable;

class Container extends React.Component {
  constructor(props) {
    super(props);

    this.state.store = this.cat.getStore(this.props.store);

    invariant(
      this.state.store && isObservable(this.state.store),
      '%s should get at a store but found none for %s',
      this.displayName,
      this.props.store
    );


    let val = this.state.store.__getValue || null;
    this._checkVal(val);
    return val;
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
    // register actions
    if (this.props.actions) {
      var actionsName = this.props.actions;
      if (!Array.isArray(actionsName)) {
        actionsName = [actionsName];
      }

      actionsName.forEach(function(actionsName) {
        this.state[actionsName] = cat.getAction(actionsName);
      });
    }
    const fetchAction = this.props.fetchAction;
    const fetchPayload = this.props.fetchPayload || {};
    // initiate fetch if fetchAction is supplied
    if (fetchAction && this.props[fetchAction]) {
      cat.registerFetcher(this.props[fetchAction], {
        fetchPayload: fetchPayload,
        fetchName: fetchAction,
        storeName: this.state.store.displayName
      });
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
    this.storeSubscription = this.state.store.subscribe(
      this.storeOnNext,
      this.props.onError || this._storeOnNext,
      this.props.onCompleted || this._storeOnCompleted
    );
  }

  // ### Component Will Unmount
  //
  // On unmount, the subscription to the observable Store is disposed
  componentWillUnmount() {
    this.storeSubscription.dispose();
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
      'The store %s should publish objects or null given: %s',
      this.state.store.displayName,
      val
    );
  }
}

Container.displayName = 'ThunderCatainer';
Container.propTypes = {
  actions: React.PropTypes.oneOfType([
    React.PropTypes.string,
    React.PropTypes.arrayOf(React.PropTypes.string)
  ]),
  children: React.PropTypes.element,
  fetchAction: React.PropTypes.string,
  fetchPayload: React.PropTypes.object,
  onCompleted: React.PropTypes.func,
  onError: React.PropTypes.func,
  store: React.PropTypes.string.isRequired
};

Container.contextTypes = {
  cat: React.PropTypes.object
};


module.exports = Container;
