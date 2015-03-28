/* eslint-disable react/no-multi-comp */
var doc = require('jsdom').jsdom('<!doctype html><html><body></body></html>');

global.document = doc;
global.window = doc.defaultView;
global.window.document = doc;
global.navigator = {
  userAgent: 'node.js'
};

console.debug = console.log;

var React = require('react/addons');
var TestUtils = React.addons.TestUtils;

module.exports = {
  createRenderSpecFunc: createRenderSpecFunc,
  createRenderToStringSpecFunc: createRenderToStringSpecFunc,
  doc: doc,
  unmountComp: unmountComp
};

function createRenderSpecFunc(spec) {
  return function() {
    var FakeComp = React.createClass(spec);
    var element = React.createElement(FakeComp);
    var instance = TestUtils.renderIntoDocument(element);
    return {
      instance: instance,
      element: element,
      FakeComp: FakeComp
    };
  };
}

function createRenderToStringSpecFunc(spec) {
  return function() {
    var FakeComp = React.createClass(spec);
    var element = React.createElement(FakeComp);
    var html = React.renderToString(element);
    return {
      instance: {},
      html: html,
      element: element,
      FakeComp: FakeComp
    };
  };
}

function unmountComp(container) {
  React.unmountComponentAtNode(container.getDOMNode().parent);
}
