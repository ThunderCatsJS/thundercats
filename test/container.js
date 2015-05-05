process.env.NODE_ENV = 'development';
/* eslint-disable no-unused-expressions */
import chai, { expect } from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';

import utils from './utils';
import ContextWrapper from '../lib/ContextWrapper';
import { Store, Cat, Container } from '../';
import { notifyObservers } from '../lib/Store';
import { setPath } from '../lib/Cat';

const {
  React, ReactTestUtils, render, createClass, unmountComp, createActions
} = utils;
chai.should();
chai.use(sinonChai);

describe('Container', function() {
  describe('initialization', ()=> {
    it('should throw if given no children', () => {
      expect(() => {
        let cat = new Cat();
        let Burrito = ContextWrapper.wrap(React.createElement(Container), cat);
        render(Burrito);
      }).to.throw(/expects a single child/);
    });

    it('should throw if given more than one child', () => {
      expect(() => {
        let cat = new Cat();
        let Burrito = ContextWrapper.wrap(
          React.createElement(
            Container,
            null,
            React.createElement('div'),
            React.createElement('div')
          ),
          cat
        );
        render(Burrito);
      }).to.throw(/expects a single child/);
    });

    it('should assign initial store value to comp props', () => {
      let ba = { da: 'boom' };
      let CatActions = createActions();
      let CatStore = createStore(ba);
      let cat = new Cat();
      let Comp = createClass();
      cat.register(CatActions);
      cat.register(CatStore, cat);
      let Burrito = ContextWrapper.wrap(
        React.createElement(
          Container,
          { store: 'CatStore' },
          React.createElement(Comp)
        ),
        cat
      );
      let { instance, container } = render(Burrito);
      let comp = ReactTestUtils.findRenderedComponentWithType(instance, Comp);
      expect(comp.props.da).to.exist;
      comp.props.da.should.equal(ba.da);
      unmountComp(container).should.be.true;
    });
  });

  describe('actions props', function() {
    let FelineActions, CatActions, Comp, cat;
    beforeEach(() => {
      CatActions = createActions(null, 'CatActions');
      FelineActions = createActions(null, 'FelineActions');
      let CatStore = createStore();
      cat = new Cat();
      Comp = createClass();
      cat.register(CatActions);
      cat.register(FelineActions);
      cat.register(CatStore, cat);
    });

    it('should add actions object to props', () => {
      let Burrito = ContextWrapper.wrap(
        React.createElement(
          Container,
          {
            store: 'CatStore',
            actions: 'CatActions'
          },
          React.createElement(Comp)
        ),
        cat
      );
      let { instance, container } = render(Burrito);
      let comp = ReactTestUtils.findRenderedComponentWithType(instance, Comp);
      expect(comp.props.catActions).to.exist;
      comp.props.catActions.should.be.an.instanceOf(CatActions);
      unmountComp(container).should.be.true;
    });

    it('should also add multiple actions objects to props', () => {
      let Burrito = ContextWrapper.wrap(
        React.createElement(
          Container,
          {
            store: 'CatStore',
            actions: [
              'CatActions',
              'FelineActions'
            ]
          },
          React.createElement(Comp)
        ),
        cat
      );
      let { instance, container } = render(Burrito);
      let comp = ReactTestUtils.findRenderedComponentWithType(instance, Comp);
      expect(comp.props.catActions).to.exist;
      expect(comp.props.felineActions).to.exist;
      comp.props.catActions.should.be.an.instanceOf(CatActions);
      comp.props.felineActions.should.be.an.instanceOf(FelineActions);
      unmountComp(container);
    });
  });

  describe('store', function() {
    let cat, initValue, Comp;
    beforeEach(() => {
      initValue = { lick: 'furr' };
      let CatActions = createActions();
      let CatStore = createStore(initValue);
      cat = new Cat();
      Comp = createClass();
      cat.register(CatActions);
      cat.register(CatStore, cat);
    });

    it('should throw if not given a store name prop', () => {
      expect(() => {
        let Burrito = ContextWrapper.wrap(
          React.createElement(
            Container,
            null,
            React.createElement(Comp)
          ),
          cat
        );
        let { container } = render(Burrito);
        unmountComp(container).should.be.true;
      }).to.throw(/should get at a store but found none/);
    });

    it('should throw if no store is found for store name prop', () => {
      expect(() => {
        let Burrito = ContextWrapper.wrap(
          React.createElement(
            Container,
            { store: 'not the momma' },
            React.createElement(Comp)
          ),
          cat
        );
        let { container } = render(Burrito);
        unmountComp(container).should.be.true;
      }).to.throw(/should get at a store but found none/);
    });

    it('should throw if given improper value to component', () => {
      expect(() => {
        let Burrito = ContextWrapper.wrap(
          React.createElement(
            Container,
            {
              store: 'CatStore',
              actions: 'CatActions'
            },
            React.createElement(Comp)
          ),
          cat
        );
        let { container } = render(Burrito);
        let store = cat.getStore('CatStore');
        store.value = 'not the momma';
        notifyObservers(store.value, store.observers);
        unmountComp(container).should.be.true;
      }).to.throw(/should get objects or null/);
    });

    describe('observable', () => {
      let inst, cont, Burrito;
      beforeEach(() => {
        Burrito = ContextWrapper.wrap(
          React.createElement(
            Container,
            {
              store: 'CatStore',
              actions: 'CatActions'
            },
            React.createElement(Comp)
          ),
          cat
        );
        let { instance, container } = render(Burrito);
        inst = instance;
        cont = container;
      });

      afterEach(() => {
        unmountComp(cont);
      });

      it('should update comp props ', () => {
        let comp = ReactTestUtils.findRenderedComponentWithType(inst, Comp);
        expect(comp.props.lick).to.exits;
        let catActions = cat.getActions('CatActions');
        catActions.doAction({ value: { lick: 'paw' } });
        expect(comp.props.lick).to.exits;
        comp.props.lick.should.equal('paw');
      });

      it('should throw on errors', () => {
        expect(() => {
          let catStore = cat.getStore('CatStore');
          catStore.observers.forEach((observer) => {
            observer.onError('meow');
          });
        }).to.throw(/ThunderCats Store encountered an error/);
      });

      it('should warn if completes', () => {
        let spy = sinon.spy(console, 'warn');
        let catStore = cat.getStore('CatStore');
        catStore.observers.forEach((observer) => {
          observer.onCompleted();
        });
        spy.restore();
        spy.should.have.been.calledOnce;
        spy.should.have.been.calledWith(
          sinon.match(/Store has shutdown without error/i)
        );
      });

      it('should subscribe to store', () => {
        let catStore = cat.getStore('CatStore');
        catStore.hasObservers().should.be.true;
        let container =
          ReactTestUtils.findRenderedComponentWithType(inst, Container);
        expect(container.storeSubscription).to.exist;
      });

      it('should dispose on component will unmounting', () => {
        let container =
          ReactTestUtils.findRenderedComponentWithType(inst, Container);
        expect(container.storeSubscription).to.exist;
        unmountComp(cont).should.equal.true;
        expect(container.storeSubscription).to.be.null;
      });
    });
  });

  describe('fetching registration', function() {
    let cat, cont, fetcherSpy, Comp;
    beforeEach(() => {
      let initValue = { lick: 'furr' };
      let CatActions = createActions();
      let CatStore = createStore(initValue);
      cat = new Cat();
      fetcherSpy = sinon.spy(cat, 'registerFetcher');
      Comp = createClass();
      cat.register(CatActions);
      cat.register(CatStore, cat);
      setPath(cat, '/foo');
    });

    afterEach(() => {
      fetcherSpy.restore();
      if (cont) {
        unmountComp(cont);
      }
    });

    it('should register a fetch action for given fetch prop', () => {
      const fetchAction = 'catActions.doAction';
      const fetchPayload = { only: 'A tribute' };
      const Burrito = ContextWrapper.wrap(
        React.createElement(
          Container,
          {
            store: 'CatStore',
            actions: 'CatActions',
            fetchAction: fetchAction,
            fetchPayload: fetchPayload
          },
          React.createElement(Comp)
        ),
        cat
      );
      const { container } = render(Burrito);
      cont = container;
      fetcherSpy.should.have.been.calledOnce;
      const fetchCtx = cat.paths.get('/foo').get(fetchAction);
      expect(fetchCtx).to.not.be.undefined;
      fetchCtx.name.should.equal(fetchAction);
      fetchCtx.payload.should.deep.equal(fetchPayload);
    });
  });
});

function createStore(initValue = null) {
  class CatStore extends Store {
    constructor(cat) {
      super();
      this.__value = initValue;
      let catActions = cat.getActions('CatActions');
      this.register(catActions);
    }
    static displayName = 'CatStore'
  }
  return CatStore;
}
