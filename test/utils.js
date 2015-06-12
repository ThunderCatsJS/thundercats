var Actions = require('../src').Actions;

module.exports = {
  createActions: createActions
};

function createActions(spy = function() {}, name = 'CatActions') {
  class CatActions extends Actions {
    constructor() {
      super();
    }
    static displayName = name;
    doAction(val) {
      spy(val);
      return val;
    }
  }
  return CatActions;
}
