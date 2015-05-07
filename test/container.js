process.env.NODE_ENV = 'development';
/* eslint-disable no-unused-expressions */
import chai, { expect } from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';

import utils from './utils';
import ContextWrapper from '../lib/ContextWrapper';
import { Store, Cat, Container } from '../';

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

      let Comp = createClass({
        getThundercats() {
          return {
            store: 'catStore'
          };
        }
      });

      cat.register(CatActions);
      cat.register(CatStore, cat);
      let Burrito = ContextWrapper.wrap(
        React.createElement(
          Container,
          null,
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

  describe('store', function() {
    let cat, initValue, Comp;
    beforeEach(() => {
      initValue = { lick: 'furr' };
      let CatActions = createActions();
      let CatStore = createStore(initValue);
      cat = new Cat();
      cat.register(CatActions);
      cat.register(CatStore, cat);
    });

    it('should throw if not given a store name', () => {
      Comp = createClass({
        getThundercats() {
          return {};
        }
      });

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
      Comp = createClass({
        getThundercats() {
          return {
            store: 'yo'
          };
        }
      });
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

    describe('observable', () => {
      let inst, cont, Burrito;
      beforeEach(() => {
        Comp = createClass({
          getThundercats() {
            return {
              store: 'CatStore',
              actions: 'CatActions'
            };
          }
        });

        Burrito = ContextWrapper.wrap(
          React.createElement(
            Container,
            null,
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
    let cat, cont, Comp, fetchAction, fetchPayload;
    beforeEach(() => {
      let initValue = { lick: 'furr' };
      let CatActions = createActions();
      let CatStore = createStore(initValue);

      fetchAction = 'catActions.doAction';
      fetchPayload = { only: 'A tribute' };
      Comp = createClass({
        getThundercats() {
          return {
            store: 'CatStore',
            fetchAction: fetchAction,
            payload: fetchPayload
          };
        }
      });

      cat = new Cat();
      cat.register(CatActions);
      cat.register(CatStore, cat);
      cat.fetchMap = new Map();
    });

    afterEach(() => {
      cat.fetchMap = null;
      if (cont) {
        unmountComp(cont);
      }
    });

    it('should register a fetch action for given fetch prop', () => {
      const Burrito = ContextWrapper.wrap(
        React.createElement(
          Container,
          null,
          React.createElement(Comp)
        ),
        cat
      );
      const { container } = render(Burrito);
      cont = container;
      const fetchCtx = cat.fetchMap.get(fetchAction);
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
      this.value = initValue;
      let catActions = cat.getActions('CatActions');
      this.register(catActions);
    }
    static displayName = 'CatStore'
  }
  return CatStore;
}
