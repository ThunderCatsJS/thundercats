process.env.NODE_ENV = 'development';
/* eslint-disable no-unused-expressions */
import chai, { expect } from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';

require('./utils');
import React from 'react/addons';
import ContextWrapper from '../lib/ContextWrapper';
import { Cat } from '../';

const ReactTestUtils = React.addons.TestUtils;

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
    let catApp, Burrito;
    beforeEach(function() {
      catApp = new Cat();
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
      let spy = sinon.spy(console, 'warn');
      ReactTestUtils.renderIntoDocument(React.createElement(
        ContextWrapper,
        { cat: 'notTheMomma' },
        React.createElement('div')
      ));
      spy.restore();
      spy.should.have.been.called;
    });

    it('should add context object to child component', function() {
      const spy = sinon.spy();
      class TestComp extends React.Component {
        constructor(props) {
          super(props);
        }

        componentWillMount() {
          spy(this.context.cat);
        }

        render() {
          return null;
        }
      }

      TestComp.contextTypes = {
        cat: React.PropTypes.object.isRequired,
        name: React.PropTypes.string
      };

      Burrito = ContextWrapper.wrap(React.createElement(TestComp), catApp);
      ReactTestUtils.renderIntoDocument(Burrito);
      spy.should.have.been.calledOnce;
      spy.should.have.been.calledWith(catApp);
    });

    it('should render its children', function() {
    });
  });
});
