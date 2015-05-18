process.env.NODE_ENV = 'development';
/* eslint-disable no-unused-expressions */
import chai, { expect } from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';

import { React, ReactTestUtils } from './utils';
import { Cat } from '../lib';
import ContextWrapper from '../lib/ContextWrapper';

chai.should();
chai.use(sinonChai);

describe('ContextWrapper', function() {
  describe('wrap', function() {
    it('should throw if given a non react component', function() {
      expect(() => {
        ContextWrapper.wrap('not the momma');
      }).to.throw(/expects a valid React element/);
    });

    it('should throw if not given a cat instance', function() {
      expect(() => {
        ContextWrapper.wrap(React.createElement('div'), 'not the momma');
      }).to.throw(/expects an instance of Cat/);
    });

    it('should return a valid react element', function() {
      let catApp = new Cat();
      let Burrito = ContextWrapper.wrap(React.createElement('div'), catApp);
      React.isValidElement(Burrito).should.be.true;
    });
  });

  describe('component', function() {
    let catApp, Burrito, spy;
    beforeEach(function() {
      catApp = new Cat();
    });

    afterEach(() => {
      if (spy && spy.restore) {
        spy.restore();
      }
    });

    it('should throw if given more than one child', function() {
      expect(() => {
        ReactTestUtils.renderIntoDocument(React.createElement(
          ContextWrapper,
          { cat: catApp },
          React.createElement('div'),
          React.createElement('div')
        ));
      }).to.throw();
    });

    it('should warn if cat is not an object', function() {
      // This test is brittle
      // latest version of react use console.error this test may need to change
      // with next release
      spy = sinon.spy(console, 'warn');
      ReactTestUtils.renderIntoDocument(React.createElement(
        ContextWrapper,
        { cat: 'notTheMomma' },
        React.createElement('div')
      ));
      spy.should.have.been.called;
    });

    it('should add context object to child component', function() {
      spy = sinon.spy();
      class TestComp extends React.Component {
        constructor(props, context) {
          super(props, context);
          spy(context.cat);
        }

        static displayName = 'TestComp'
        static contextTypes = {
          cat: React.PropTypes.object.isRequired
        }

        render() {
          return null;
        }
      }

      Burrito = ContextWrapper.wrap(React.createElement(TestComp), catApp);
      ReactTestUtils.renderIntoDocument(Burrito);
      spy.should.have.been.calledOnce;
      spy.should.have.been.calledWith(catApp);
    });

    it('should add context object to (great)grandchild component', function() {
      const spy = sinon.spy();
      class Child extends React.Component {
        constructor(props, context) {
          super(props, context);
        }

        static displayName = 'Child'
        static contextTypes = {
          cat: React.PropTypes.object.isRequired
        }

        render() {
          return React.createElement(
            'div',
            null,
            React.createElement(GrandChild)
          );
        }
      }

      class GrandChild extends React.Component {
        constructor(props, context) {
          super(props, context);
        }

        static displayName = 'GrandChild'
        render() {
          return React.createElement(
            GreatGrandChild
          );
        }
      }

      class GreatGrandChild extends React.Component {
        constructor(props, context) {
          super(props, context);
          spy(context.cat);
        }

        static displayName = 'GreatGrandChild'
        static contextTypes = {
          cat: React.PropTypes.object.isRequired
        }

        render() {
          return React.createElement(
            'h1',
            null,
            'hello thundorians!'
          );
        }
      }

      Burrito = ContextWrapper.wrap(
        React.createElement(Child),
        catApp
      );
      ReactTestUtils.renderIntoDocument(Burrito);
      spy.should.have.been.calledOnce;
      spy.should.have.been.calledWith(catApp);
    });
  });
});
