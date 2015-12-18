/* eslint-disable no-unused-expressions */
import Rx from 'rx';
import chai, { expect } from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import { createActions } from './utils';

import { Cat, Store, Actions } from '../src';

Rx.config.longStackSupport = true;
chai.should();
chai.use(sinonChai);

describe('Cat', function() {
  describe('Factory', function() {
    it('should be extendable', function() {
      const AppCat = Cat().refs({ displayName: 'FooActions' });
      let appCat = AppCat();
      appCat.register.should.be.a('function');
      appCat.displayName.should.equal('FooActions');
    });
  });

  describe('register', function() {
    let CatStore, CatActions, CatApp;
    beforeEach(function() {
      CatApp = Cat();
    });

    it('should register an instance of actions class', function() {
      let cat = new CatApp();
      CatActions = createActions();
      cat.actions.size.should.equal(0);
      cat.register(CatActions);
      cat.actions.size.should.equal(1);
    });

    it('should register an instance of Store class', function() {
      let cat = new CatApp();
      CatActions = createActions();
      CatStore = createStore();
      cat.stores.size.should.equal(0);
      cat.register(CatActions);
      cat.register(CatStore, null, cat);
      cat.actions.size.should.equal(1);
      cat.stores.size.should.equal(1);
    });

    it('should throw if actions/store does not have a displayName', function() {
      const NoName = Actions({
        doSomething() { }
      });

      let cat = CatApp();
      expect(() => {
        cat.register(NoName);
      }).to.throw(/does not have a displayName/);
    });

    it('should warn if attempting to add a store twice', function() {
      let CatActions = createActions();
      let CatStore = createStore();
      let cat = new CatApp();
      cat.stores.size.should.equal(0);
      cat.register(CatActions);
      cat.register(CatStore, null, cat);
      let spy = sinon.spy(console, 'error');
      cat.stores.size.should.equal(1);
      cat.register(CatStore, null, cat);
      cat.stores.size.should.equal(1);
      spy.restore();
      spy.should.have.been.calledOnce;
      spy.should.have.been.calledWith(sinon.match(/already exists/));
    });

    it('should warn if attempting to add an action twice', function() {
      let CatActions = createActions();
      let cat = new CatApp();
      cat.actions.size.should.equal(0);
      cat.register(CatActions);
      cat.actions.size.should.equal(1);
      let spy = sinon.spy(console, 'error');
      cat.register(CatActions);
      cat.actions.size.should.equal(1);
      spy.restore();
      spy.should.have.been.calledOnce;
      spy.should.have.been.calledWith(sinon.match(/already exists/));
    });
  });

  describe('getStore', function() {
    let cat, CatActions, CatStore;
    beforeEach(function() {
      CatActions = createActions();
      CatStore = createStore();
      const CatApp = Cat()
        .init(({ instance }) => {
          instance.register(CatActions);
          instance.register(CatStore, null, instance);
        });
      cat = CatApp();
    });

    it('should return a Store if it exists', function() {
      let catStore = cat.getStore('CatStore');
      expect(catStore).to.exist;
      catStore.register.should.exist;
      catStore.subscribe.should.exist;
    });

    it('should return undefined if a Store does not exits', function() {
      let lameStore = cat.getStore('LameStore');
      expect(lameStore).to.not.exist;
      expect(lameStore).to.be.undefined;
    });
  });

  describe('getActions', function() {
    let cat, CatActions;

    beforeEach(function() {
      CatActions = createActions();
      const CatApp = Cat()
        .init(({ instance }) => {
          instance.register(CatActions);
        });
      cat = CatApp();
    });

    it('should return a Actions if it exists', function() {
      let catActions = cat.getActions('CatActions');
      expect(catActions).to.exist;
      catActions.doAction.should.exist;
    });

    it('should return undefined if Actions does not exits', function() {
      let lameActions = cat.getActions('Lame Actions');
      expect(lameActions).to.not.exist;
      expect(lameActions).to.be.undefined;
    });
  });

  describe('get', function() {
    let cat, CatActions, CatStore;

    beforeEach(function() {
      CatActions = createActions();
      CatStore = createStore();
      const CatApp = Cat()
        .init(({ instance }) => {
          instance.register(CatActions);
          instance.register(CatStore, null, instance);
        });
      cat = CatApp();
    });

    it('should return a Store if it exists', function() {
      let catStore = cat.get('CatStore');
      expect(catStore).to.exist;
      catStore.register.should.exist;
      catStore.subscribe.should.exist;
    });

    it('should return a Actions if it exists', function() {
      let catActions = cat.get('CatActions');
      expect(catActions).to.exist;
      catActions.doAction.should.exist;
    });

    it('should return undefined if a StoreOrAtions does not exits', function() {
      let lameStore = cat.get('LameStore');
      expect(lameStore).to.not.exist;
      expect(lameStore).to.be.undefined;
    });
  });

  describe('dispose', function() {
    let cat, CatActions, CatStore;

    beforeEach(function() {
      CatActions = createActions();
      CatStore = createStore();
      const CatApp = Cat()
        .init(({ instance }) => {
          instance.register(CatActions);
          instance.register(CatStore, null, instance);
        });
      cat = CatApp();
    });
    it('should iterate and dispose of all observables', () => {
      const catStore = cat.getStore('catStore');
      const catActions = cat.getActions('catActions');
      catStore.hasObservers().should.be.false;
      catActions.doAction.hasObservers().should.be.false;
      // add observer to store
      // in turn store observers actions
      catStore.subscribe(() => {});
      catStore.hasObservers().should.be.true;
      catActions.doAction.subscribe(() => {});

      catActions.doAction.hasObservers().should.be.true;
      cat.dispose();

      catStore.hasObservers().should.be.false;
      catActions.doAction.hasObservers().should.equal(false);
    });
  });
});

function createStore(initValue = {}) {
  return Store({ refs: { value: initValue } })
    .refs({ displayName: 'CatStore' })
    .init(({ instance, args }) => {
      const cat = args[0];
      const catActions = cat.getActions('CatActions');
      instance.register(
        catActions.doAction.delay(500).map(() => ({ replace: {}}))
      );
    });
}
