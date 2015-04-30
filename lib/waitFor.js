// # Wait For Utility
//
// Takes observables for arguments,
// converts them to hot observables
// then waits for each one to publish a value
//
// returns an observable.
//
// *Note:* it's good practice to use a firstOrDefault
// observable if you just want a short lived subscription
// and a timeout if you don't want to wait forever!
import Rx from 'rx';
import debugFactory from 'debug';
import { isObservable } from './utils';

const debug = debugFactory('thundercats:waitFor');
const slice = Array.prototype.slice;

export default function waitFor(observables) {
  return Rx.Observable.from(arguments)
    .tap(() => debug('starting waitFor'))
    .tapOnNext(observable => {
      return isObservable(observable) ?
        true :
        new Error(
          'waitFor only take observables but got %s',
          observable
        );
    })
    .map(observable => observable.publish())
    .tapOnNext(observable => observable.connect())
    .toArray()
    .flatMap(arrayOfObservables => Rx.Observable.combineLatest(
      arrayOfObservables,
      function() { return slice.call(arguments); }
    ))
    .doOnNext(() => debug('waitFor onNext!'));
}
