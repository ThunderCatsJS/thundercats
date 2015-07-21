/* eslint-disable no-unused-expressions */
import Rx from 'rx';
import chai, { expect } from 'chai';
import { createActions } from './utils';
import { Cat, Store, hydrate, dehydrate } from '../src';

Rx.config.longStackSupport = true;
chai.should();

describe('Translate', function() {
  describe('hydrate', function() {
    let CatStore, CatActions, cat;
    beforeEach(() => {
      CatActions = createActions();
      const CatApp = Cat()
        .init(({ instance })=> {
          instance.register(CatActions);
        });
      cat = CatApp();
    });

    it('should throw if not given an instance of the Cat', () => {
      expect(() => {
        hydrate();
      }).to.throw(/instance of the cat/);

      expect(() => {
        hydrate({});
      }).to.throw(/instance of the cat/);
    });

    it('should return an observable', () => {
      CatStore = createStore();
      cat.register(CatStore, null, cat);
      hydrate(cat, {}).subscribe.should.be.a('function');
    });

    describe('observable', () => {
      it('should call onError if given non object', (done) => {
        CatStore = createStore();
        cat.register(CatStore, null, cat);
        hydrate(cat, '').subscribeOnError(err => {
          err.should.match(/hydrate should get objects/);
          done();
        });
      });

      it('should hydrate store with correct data', (done) => {
        let val = { foo: 'bar' };
        CatStore = createStore();
        cat.register(CatStore, null, cat);
        let catStore = cat.getStore('CatStore');
        hydrate(cat, { CatStore: val })
          .subscribeOnCompleted(() => {
            catStore.value.should.deep.equal(val);
            done();
          });
      });
    });
  });

  describe('dehydrate', function() {
    let CatStore, CatActions, cat, storeVal;
    beforeEach(function() {
      CatActions = createActions();
      const CatApp = Cat()
        .init(({ instance }) => {
          instance.register(CatActions);
        });
      cat = CatApp();
    });

    it('should throw if not given an instance of the Cat', () => {
      expect(() => {
        dehydrate();
      }).to.throw(/instance of the cat/);

      expect(() => {
        dehydrate({});
      }).to.throw(/instance of the cat/);
    });

    it('should return an observable', function(done) {
      CatStore = createStore();
      cat.register(CatStore, null, cat);
      let stateObs = dehydrate(cat);
      expect(stateObs).to.exist;
      stateObs.should.be.an('object');
      stateObs.subscribe.should.be.a('function');
      stateObs.subscribe(state => {
        expect(state).to.exist;
        state.should.be.an('object');
        done();
      });
    });

    describe('observable', () => {
      it('should return store data', function(done) {
        storeVal = { bah: 'humbug' };
        CatStore = createStore(storeVal);
        cat.register(CatStore, null, cat);
        let stateObs = dehydrate(cat);
        stateObs.subscribe(state => {
          state.should.deep.equal({ CatStore: storeVal });
          done();
        });
      });

      it('should return an empty object if no stores have data', done => {
        CatStore = createStore();
        cat.register(CatStore, null, cat);
        let stateObs = dehydrate(cat);
        stateObs.subscribe(state => {
          state.should.deep.equal({ CatStore: {} });
          done();
        });
      });
    });
  });
});

function createStore(initValue = {}) {
  return Store(initValue)
    .refs({ displayName: 'CatStore' })
    .init(({ instance, args }) => {
      const cat = args[0];
      const catActions = cat.getActions('CatActions');
      instance.register(
        catActions.doAction.delay(500).map(() => ({ replace: {}}))
      );
    });
}
