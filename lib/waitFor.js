// # Wait For Utility
//
// Takes observables for arguments,
// converts them to hot observables
// then waits for each one to publish a value
//
// It can also take an optional timeout (milliseconds)
// as the first argument. By default this timeout is 3 seconds.
//
// If the timeout is exceeded, the observers will be notified
// on the onError observer. If no onError observer is supplied
// the timeout throws the Error
//
// returns an observable.
//
// *Note:* it's good practice to use a firstOrDefault
// observable if you just want a short lived subscription
import Rx from 'rx';
import invariant from 'invariant';
import debugFactory from 'debug';
import { areObservable } from './utils';

const debug = debugFactory('thundercats:waitFor');

export default waitFor;

function waitFor(timeout, observables) {
  observables = [].slice.call(arguments);
  if (typeof timeout === 'number') {
    observables = observables.slice(1);
  } else {
    timeout = 3000;
  }
  invariant(
    areObservable(observables),
    'waitFor takes only observables with optional number as the ' +
      'first agruments'
  );
  debug('setting waitFor with timeout %s', timeout);
  return Rx.Observable.combineLatest(
    observables.map(function(obs) {
      let published = obs.publish();
      published.connect();
      return published;
    }),
    function(values) {
      values = [].slice.call(arguments);
      debug('waitFor complete');
      return values;
    }
  ).timeout(timeout);
}
