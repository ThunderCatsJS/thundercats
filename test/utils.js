var Actions = require('../src').Actions;

module.exports = {
  createActions: createActions
};

function createActions(spy = function() {}, name = 'CatActions') {
  return Actions({
    doAction(val) {
      spy(val);
      return val;
    }
  })
    .refs({ displayName: name });
}
