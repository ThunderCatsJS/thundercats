process.env.NODE_ENV = 'development';
/* eslint-disable no-unused-expressions */
import Rx from 'rx';
import chai, { expect } from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import assign from 'object.assign';

import utils from './utils';
import ContextWrapper from '../src/ContextWrapper';
import { Store, Cat, createContainer } from '../src';

const {
  createActions,
  createClass,
  isComponentClass,
  React,
  ReactTestUtils,
  render,
  unmountComp
} = utils;

chai.should();
chai.use(sinonChai);

describe('Container', function() {
  describe('initialization', ()=> {
    it('should be ok with empty options', () => {
      expect(() => {
        let CatActions = createActions();
        let cat = new Cat();
        cat.register(CatActions);
        let Comp = createContainer({}, createClass());
        let Burrito = ContextWrapper.wrap(
          React.createElement(Comp),
          cat
        );
        render(Burrito);
      }).to.not.throw();
    });

    it('should return a function when no Component is given', () => {
      let createContainerDecorator = createContainer({});
      createContainerDecorator.should.be.a('function');
    });

    describe('decorator', function() {
      let createContainerDecorator;
      beforeEach(() => {
        createContainerDecorator = createContainer({});
      });

      it('should throw when not given a Component', () => {
        expect(() => {
          createContainerDecorator('not the momma');
        }).to.throw(/should get a React Component/);
      });

      it('should return a Component', () => {
        let ContainedComp = createContainerDecorator(createClass());
        expect(ContainedComp).to.exist;
        isComponentClass(ContainedComp).should.be.true;
      });
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
      let Comp = createClass();
      let WrappedComp = createContainer({
        actions: 'catActions'
      }, Comp);
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
      let Comp = createClass();
      let WrappedComp = createContainer({
        actions: [
          'catActions',
          'lionActions'
        ]
      }, Comp);
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
      let Comp = createClass();
      let WrappedComp = createContainer({
        store: 'catStore'
      }, Comp);
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
      let Comp = createClass();
      let WrappedComp = createContainer({
        store: 'catStore',
        map: () => {
          return ba;
        }
      }, Comp);
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
        Comp = createContainer({ store: 'yo' }, createClass());
        let Burrito = ContextWrapper.wrap(
          React.createElement(Comp),
          cat
        );
        let { container } = render(Burrito);
        unmountComp(container).should.be.true;
      }).to.throw(err);

      expect(() => {
        Comp = createContainer({
          stores: [
            'CatStore',
            'yo'
          ],
          combineLatest: () => {}
        }, createClass());
        let Burrito = ContextWrapper.wrap(
          React.createElement(Comp),
          cat
        );
        let { container } = render(Burrito);
        unmountComp(container).should.be.true;
      }).to.throw(err);
    });

    it('should add multiple stores', () => {
      let spy = sinon.spy(cat, 'getStore');
      Comp = createContainer({
        stores: [
          'catStore',
          'lionStore'
        ],
        combineLatest: function(catState, lionState) {
          expect(catState).to.exist;
          expect(lionState).to.exist;
          return { boo: 'ya' };
        }
      }, createClass());
      let Burrito = ContextWrapper.wrap(
        React.createElement(Comp),
        cat
      );
      let { container } = render(Burrito);
      spy.restore();
      spy.should.have.been.calledTwice;
      unmountComp(container).should.be.true;
    });

    it('should throw if not given combineLatest with multiple stores', () => {
      Comp = createContainer({
        stores: [
          'catStore',
          'lionStore'
        ]
      }, createClass());
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
        Comp = createClass();
        WrappedComp = createContainer({
          store: 'CatStore',
          actions: 'CatActions'
        }, Comp);
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
        catActions.doAction({ lick: 'paw' });
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

  describe('getPayload', function() {
    let thundercatSpy, cat, divContainer;
    beforeEach(() => {
      thundercatSpy = sinon.spy(function() {
        return {};
      });
      cat = new Cat();
      cat.register(createActions());
      cat.register(createStore(), cat);
    });

    after(() => {
      if (divContainer) {
        unmountComp(divContainer);
      }
    });

    it('should be called with props and context', () => {
      let Comp = createContainer({
        store: 'catStore',
        fetchAction: 'catActions.doAction',
        getPayload: thundercatSpy
      }, createClass({
        contextTypes: {
          foo: React.PropTypes.string
        },
        propTypes: {
          mew: React.PropTypes.string
        }
      }));
      let Burrito = ContextWrapper.wrap(
        React.createElement(Comp, { mew: 'purr' }),
        cat
      );
      divContainer = render(Burrito).container;
      thundercatSpy.should.have.been.calledOnce;
      thundercatSpy.should.have.calledWithMatch(
        { mew: 'purr' },
        { foo: undefined } // eslint-disable-line
      );
    });

    it('should not have the cat in context', () => {
      let Comp = createContainer({
        store: 'catStore',
        fetchAction: 'catActions.doAction',
        getPayload: thundercatSpy
      }, createClass());
      let Burrito = ContextWrapper.wrap(
        React.createElement(Comp),
        cat
      );
      divContainer = render(Burrito).container;
      thundercatSpy.should.have.been.calledOnce;
      thundercatSpy.args[0][1].should.deep.equal({});
    });

    it('should have the cat in context if in Comp.contextTypes', () => {
      let Comp = createContainer({
        store: 'catStore',
        fetchAction: 'catActions.doAction',
        getPayload: thundercatSpy
      }, createClass({
        contextTypes: {
          cat: React.PropTypes.object
        }
      }));
      let Burrito = ContextWrapper.wrap(
        React.createElement(Comp),
        cat
      );
      divContainer = render(Burrito).container;
      thundercatSpy.should.have.been.calledOnce;
      thundercatSpy.args[0][1].should.deep.equal({ cat: cat });
    });
  });

  describe('shouldContainerFetch', function() {
    let options, cat, divContainer;
    beforeEach(() => {
      options = {
        store: 'catStore',
        fetchAction: 'catActions.doAction',
        getPayload: () => ({})
      };
      cat = new Cat();
      cat.register(createActions());
      cat.register(createStore(), cat);
    });

    after(() => {
      if (divContainer) {
        unmountComp(divContainer);
      }
    });

    it('should prevent fetching after initial fetch when false/absent', () => {
      let catActions = cat.getActions('catActions');
      let spy = sinon.spy(catActions, 'doAction');
      let Comp = createContainer(
        options,
        createClass()
      );
      let Burrito = ContextWrapper.wrap(
        React.createElement(Comp),
        cat
      );
      divContainer = render(Burrito).container;
      spy.restore();
      spy.should.have.been.calledOnce;
    });

    it('should re-fetch when true', () => {
      let propSubject = new Rx.Subject();
      let spy = sinon.spy(props => props);
      let Comp = createContainer(
        assign(
          {},
          options,
          {
            getPayload: spy,
            shouldContainerFetch: function() {
              return true;
            }
          }
        ),
        createClass()
      );
      let Parent = createClass({
        getInitialState: function() {
          return {
            foo: 'bar'
          };
        },
        componentDidMount() {
          this.dispose = propSubject.subscribe(foo => {
            this.setState({ foo }); // eslint-disable-line
          });
        },
        componentWillUnmount() {
          this.dispose && this.dispose.dispose && this.dispose.dispose();
        },
        render() {
          return React.createElement(
            Comp,
            { foo: this.state.foo }
          );
        }
      });
      let Burrito = ContextWrapper.wrap(
        React.createElement(Parent),
        cat
      );
      let { container } = render(Burrito);
      divContainer = container;
      spy.should.have.been.calledOnce;
      propSubject.onNext('bu');
      spy.should.have.been.calledTwice;
      spy.should.have.been.calledWithMatch({ foo: 'bu' });
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
      Comp = createContainer({
        store: 'CatStore',
        fetchAction: fetchAction,
        getPayload: () => fetchPayload
      }, createClass());
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
      Comp = createContainer({
        stores: [ 'CatStore' ],
        combineLatest: value => value,
        fetchWaitFor: 'CatStore',
        fetchAction: fetchAction,
        getPayload: () => fetchPayload
      }, createClass());
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

function createStore(initValue = {}, name = 'CatStore') {
  class CatStore extends Store {
    constructor(cat) {
      super();
      this.value = initValue;
      let catActions = cat.getActions('CatActions');
      this.register(Store.setter(catActions.doAction));
    }
    static displayName = name
  }
  return CatStore;
}
