var React = require('react'),
    doc = require('jsdom').jsdom();

global.document = doc;
global.window = doc.defaultView;
global.window.document = doc;
global.navigator = {
  userAgent: 'Chrome'
};

module.exports = {
  createRenderSpecFunc: createRenderSpecFunc,
  doc: doc
};

var div = doc.createElement('div');

function createRenderSpecFunc(spec) {
  return function() {
    var FakeComp = React.createClass(spec);
    return React.render(React.createElement(FakeComp), div);
  };
}
