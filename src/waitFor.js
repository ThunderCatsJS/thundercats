import Rx from 'rx';
import debugFactory from 'debug';
import { isObservable } from './utils';

const debug = debugFactory('thundercats:waitFor');
const slice = Array.prototype.slice;

export default function waitFor() {
  return Rx.Observable.from(arguments)
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
    .tap(() => debug('starting waitFor'))
    .flatMap(arrayOfObservables => Rx.Observable.combineLatest(
      arrayOfObservables,
      function() { return slice.call(arguments); }
    ))
    .doOnNext(() => debug('waitFor onNext!'));
}
