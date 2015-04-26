/* eslint-disable no-unused-expressions */
import chai, { expect } from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import { createActions } from './utils';

import { Cat, Store, Actions } from '../';

chai.should();
chai.use(sinonChai);

describe('Cat', function() {
  describe('class', function() {
    it('should be extendable', function() {
      class AppCat extends Cat {
        constructor() {
          super();
        }
      }
      let appCat = new AppCat();
      appCat.should.be.instanceOf(Cat);
    });
  });

  describe('register', function() {
    let CatStore, CatActions, CatApp;
    beforeEach(function() {
      class _CatApp extends Cat {
        constructor() {
          super();
        }
      }
      CatApp = _CatApp;
    });

    it('should register an instance of actions class', function() {
      let cat = new CatApp();
      CatActions = createActions();
      cat._actions.size.should.equal(0);
      cat.register(CatActions);
      cat._actions.size.should.equal(1);
    });

    it('should register an instance of Store class', function() {
      let cat = new CatApp();
      CatActions = createActions();
      CatStore = createStore();
      cat._stores.size.should.equal(0);
      cat.register(CatActions);
      cat.register(CatStore, cat);
      cat._stores.size.should.equal(1);
    });

    it('should throw if given non ThunderCats Store/Actions', function() {
      let cat = new CatApp();
      expect(() => {
        cat.register('not the momma', cat);
      }).to.throw(/Attempted to add a class that is not/);
    });

    it('should throw if actions/store does not have a displayName', function() {
      class NoName extends Actions {
        constructor() {
          super();
        }
        doSomething() {
        }
      }

      let cat = new CatApp();
      expect(() => {
        cat.register(NoName);
      }).to.throw(/does not have a displayName/);
    });

    it('should warn if attempting to add a store twice', function() {
      let CatActions = createActions();
      let CatStore = createStore();
      let cat = new CatApp();
      cat._stores.size.should.equal(0);
      cat.register(CatActions);
      cat.register(CatStore, cat);
      let spy = sinon.spy(console, 'error');
      cat._stores.size.should.equal(1);
      cat.register(CatStore);
      cat._stores.size.should.equal(1);
      spy.restore();
      spy.should.have.been.calledOnce;
      spy.should.have.been.calledWith(sinon.match(/already exists/));
    });

    it('should warn if attempting to add an action twice', function() {
      let CatActions = createActions();
      let cat = new CatApp();
      cat._actions.size.should.equal(0);
      cat.register(CatActions);
      cat._actions.size.should.equal(1);
      let spy = sinon.spy(console, 'error');
      cat.register(CatActions);
      cat._actions.size.should.equal(1);
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
      class CatApp extends Cat {
        constructor() {
          super();
          this.register(CatActions);
          this.register(CatStore, this);
        }
      }
      cat = new CatApp();
    });

    it('should return a Store if it exists', function() {
      let catStore = cat.getStore('CatStore');
      expect(catStore).to.exist;
      catStore.should.be.an.instanceOf(Store);
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
      class CatApp extends Cat {
        constructor() {
          super();
          this.register(CatActions);
        }
      }
      cat = new CatApp();
    });

    it('should return a Actions if it exists', function() {
      let catActions = cat.getActions('CatActions');
      expect(catActions).to.exist;
      catActions.should.be.an.instanceOf(Actions);
    });

    it('should return undefined if Actions does not exits', function() {
      let lameActions = cat.getActions('Lame Actions');
      expect(lameActions).to.not.exist;
      expect(lameActions).to.be.undefined;
    });
  });

  describe('serialize', function() {
    let CatStore, CatActions, cat, storeVal;
    beforeEach(function() {
      CatActions = createActions();
      class CatApp extends Cat {
        constructor() {
          super();
          this.register(CatActions);
        }
      }
      cat = new CatApp();
    });

    it('should return an observable', function() {
      CatStore = createStore();
      cat.register(CatStore, cat);
      let stringyStateObs = cat.serialize();
      expect(stringyStateObs).to.exist;
      stringyStateObs.should.be.an('object');
      stringyStateObs.subscribe.should.be.a('function');
      stringyStateObs.subscribe((stringyState) => {
        expect(stringyState).to.exist;
        stringyState.should.be.a('string');
      });
    });

    it('should serialize store data', function() {
      storeVal = { bah: 'humbug' };
      CatStore = createStore(storeVal);
      cat.register(CatStore, cat);
      let stringyStateObs = cat.serialize();
      stringyStateObs.subscribe((stringyState) => {
        stringyState.should.equal(JSON.stringify({ CatStore: storeVal }));
      });
    });

    it('should return an empty string if no stores have data', function() {
      CatStore = createStore();
      cat.register(CatStore, cat);
      let stringyStateObs = cat.serialize();
      stringyStateObs.subscribe((stringyState) => {
        stringyState.should.equal('');
      });
    });
  });

  describe('deserialize', function() {
    let CatStore, CatActions, cat;
    beforeEach(() => {
      CatActions = createActions();
      class CatApp extends Cat {
        constructor() {
          super();
          this.register(CatActions);
        }
      }
      cat = new CatApp();
    });

    it('should return an observable', () => {
      CatStore = createStore();
      cat.register(CatStore, cat);
      cat.deserialize().subscribe.should.be.a('function');
    });

    describe('observable', () => {
      it('should error if given non strings', () => {
        CatStore = createStore();
        cat.register(CatStore, cat);
        cat.deserialize({ notA: 'String' }).subscribeOnError((err) => {
          err.should.match(/deserialize expects a string/);
        });
      });

      it(
        'should error if stringy data does not parse into an object or null',
        () => {
          CatStore = createStore();
          cat.register(CatStore, cat);
          cat.deserialize('1').subscribeOnError((err) => {
            err.should.match(/should be an object or null/);
          });
        }
      );

      it('should hydrate store with correct data', () => {
        let val = { foo: 'bar' };
        CatStore = createStore();
        cat.register(CatStore, cat);
        let catStore = cat.getStore('CatStore');
        cat.deserialize(JSON.stringify({ CatStore: val }))
          .subscribeOnCompleted(() => {
            catStore.__value.should.deep.equal(val);
          });
      });
    });
  });
});

function createStore(initValue) {
  class CatStore extends Store {
    constructor(cat) {
      super();
      this.__value = initValue;
      let catActions = cat.getActions('CatActions');
      this.registerActions(catActions);
    }
  }
  CatStore.displayName = 'CatStore';
  return CatStore;
}
