process.env.NODE_ENV = 'development';
/* eslint-disable no-unused-expressions */
import chai, { expect } from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';

import utils from './utils';
import ContextWrapper from '../lib/ContextWrapper';
import { Store, Cat, createContainer } from '../';

const {
  React, ReactTestUtils, render, createClass, unmountComp, createActions
} = utils;
chai.should();
chai.use(sinonChai);

describe('Container', function() {
  describe('initialization', ()=> {
    it('should be ok without getThundercats defined', () => {
      expect(() => {
        let CatActions = createActions();
        let LionActions = createActions(null, 'LionActions');
        let cat = new Cat();
        cat.register(CatActions);
        cat.register(LionActions);
        let Comp = createContainer(createClass());
        let Burrito = ContextWrapper.wrap(
          React.createElement(
            Comp,
            null
          ),
          cat
        );
        render(Burrito);
      }).to.not.throw();
    });
  });

  describe('actions', function() {
    let cat, container;
    beforeEach(() => {
      let CatActions = createActions();
      let LionActions = createActions(null, 'LionActions');
      cat = new Cat();
      cat.register(CatActions);
      cat.register(LionActions);
    });

    afterEach(() => {
      if (container) {
        unmountComp(container);
      }
    });

    it('should assign actions to props', () => {
      let Comp = createClass({
        getThundercats() {
          return {
            actions: 'catActions'
          };
        }
      });
      let WrappedComp = createContainer(Comp);
      let Burrito = ContextWrapper.wrap(
        React.createElement(WrappedComp),
        cat
      );
      let { instance, cont } = render(Burrito);
      container = cont;
      let comp = ReactTestUtils.findRenderedComponentWithType(instance, Comp);
      expect(comp.props.catActions).to.exist;
    });

    it('should assign multiple actions', () => {
      let Comp = createClass({
        getThundercats() {
          return {
            actions: [
              'catActions',
              'lionActions'
            ]
          };
        }
      });
      let WrappedComp = createContainer(Comp);
      let Burrito = ContextWrapper.wrap(
        React.createElement(WrappedComp),
        cat
      );
      let { instance, cont } = render(Burrito);
      container = cont;
      let comp = ReactTestUtils.findRenderedComponentWithType(instance, Comp);
      expect(comp.props.catActions).to.exist;
      expect(comp.props.lionActions).to.exist;
    });
  });

  describe('store', function() {
    let cat, initValue, Comp;
    beforeEach(() => {
      initValue = { lick: 'furr' };
      let CatActions = createActions();
      let CatStore = createStore(initValue);
      let LionStore = createStore({}, 'LionStore');
      cat = new Cat();
      cat.register(CatActions);
      cat.register(LionStore, cat);
      cat.register(CatStore, cat);
    });

    it('should assign initial store value to comp props', () => {
      let Comp = createClass({
        getThundercats() {
          return {
            store: 'catStore'
          };
        }
      });
      let WrappedComp = createContainer(Comp);
      let Burrito = ContextWrapper.wrap(
        React.createElement(WrappedComp),
        cat
      );
      let { instance, container } = render(Burrito);
      let comp = ReactTestUtils.findRenderedComponentWithType(instance, Comp);
      expect(comp.props.lick).to.exist;
      comp.props.lick.should.equal(initValue.lick);
      unmountComp(container).should.be.true;
    });

    it('should assign mapped store value when map is provided', () => {
      let ba = { da: 'boom' };
      let Comp = createClass({
        getThundercats() {
          return {
            store: 'catStore',
            map: () => {
              return ba;
            }
          };
        }
      });
      let WrappedComp = createContainer(Comp);
      let Burrito = ContextWrapper.wrap(
        React.createElement(WrappedComp),
        cat
      );
      let { instance, container } = render(Burrito);
      let comp = ReactTestUtils.findRenderedComponentWithType(instance, Comp);
      expect(comp.props.da).to.exist;
      comp.props.da.should.equal(ba.da);
      unmountComp(container).should.be.true;
    });

    it('should throw if no store is found for store name', () => {
      const err = /should get at a store with a value/;
      expect(() => {
        Comp = createContainer(createClass({
          getThundercats() {
            return {
              store: 'yo'
            };
          }
        }));
        let Burrito = ContextWrapper.wrap(
          React.createElement(Comp),
          cat
        );
        let { container } = render(Burrito);
        unmountComp(container).should.be.true;
      }).to.throw(err);

      expect(() => {
        Comp = createContainer(createClass({
          getThundercats() {
            return {
              stores: [
                'yo',
                'yo',
                () => {}
              ]
            };
          }
        }));
        let Burrito = ContextWrapper.wrap(
          React.createElement(Comp),
          cat
        );
        let { container } = render(Burrito);
        unmountComp(container).should.be.true;
      }).to.throw(err);
    });

    it('should add multiple stores', () => {
      Comp = createClass(createClass({
        getThundercats() {
          return {
            stores: [
              'catStore',
              'lionStore',
              function(catState, lionState) {
                expect(catState).to.exist;
                expect(lionState).to.exist;
                return { boo: 'ya' };
              }
            ]
          };
        }
      }));
      let Burrito = ContextWrapper.wrap(
        React.createElement(Comp),
        cat
      );
      let { container } = render(Burrito);
      unmountComp(container).should.be.true;
    });

    it('should throw if not given selector function as last array', () => {
      Comp = createContainer(createClass({
        getThundercats() {
          return {
            stores: [
              'catStore',
              'lionStore'
            ]
          };
        }
      }));
      let Burrito = ContextWrapper.wrap(
        React.createElement(Comp),
        cat
      );
      expect(() => {
        render(Burrito);
      }).to.throw(/should get a function/);
    });

    describe('observable', () => {
      let inst, cont, Burrito, WrappedComp;
      beforeEach(() => {
        Comp = createClass({
          getThundercats() {
            return {
              store: 'CatStore',
              actions: 'CatActions'
            };
          }
        });
        WrappedComp = createContainer(Comp);
        Burrito = ContextWrapper.wrap(
          React.createElement(WrappedComp),
          cat
        );
        let ref = render(Burrito);
        inst = ref.instance;
        cont = ref.container;
      });

      afterEach(() => {
        if (cont) {
          unmountComp(cont);
        }
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
          ReactTestUtils.findRenderedComponentWithType(inst, WrappedComp);
        expect(container.stateSubscription).to.exist;
      });

      it('should dispose on component will unmounting', () => {
        let container =
          ReactTestUtils.findRenderedComponentWithType(inst, WrappedComp);
        expect(container.stateSubscription).to.exist;
        unmountComp(cont).should.equal.true;
        expect(container.stateSubscription).to.be.null;
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
      Comp = createContainer(createClass({
        getThundercats() {
          return {
            store: 'CatStore',
            fetchAction: fetchAction,
            payload: fetchPayload
          };
        }
      }));
      const Burrito = ContextWrapper.wrap(
        React.createElement(Comp),
        cat
      );
      const { container } = render(Burrito);
      cont = container;
      const fetchCtx = cat.fetchMap.get(fetchAction);
      expect(fetchCtx).to.not.be.undefined;
      fetchCtx.name.should.equal(fetchAction);
      fetchCtx.payload.should.deep.equal(fetchPayload);
    });

    it('should register with fetchWaitFor with multiple stores', () => {
      Comp = createContainer(createClass({
        getThundercats() {
          return {
            stores: [
              'CatStore',
              value => value
            ],
            fetchWaitFor: 'CatStore',
            fetchAction: fetchAction,
            payload: fetchPayload
          };
        }
      }));
      const Burrito = ContextWrapper.wrap(
        React.createElement(Comp),
        cat
      );
      const { container } = render(Burrito);
      cont = container;
      const fetchCtx = cat.fetchMap.get(fetchAction);
      expect(fetchCtx).to.not.be.undefined;
      fetchCtx.store.displayName.should.deep.equal('CatStore');
    });
  });
});

function createStore(initValue = null, name = 'CatStore') {
  class CatStore extends Store {
    constructor(cat) {
      super();
      this.value = initValue;
      let catActions = cat.getActions('CatActions');
      this.register(catActions);
    }
    static displayName = name
  }
  return CatStore;
}
