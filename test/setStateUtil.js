var chai = require('chai');
chai.should();
var setStateUtil = require('../lib/setStateUtil');

describe('# Set State Util', function() {
  var operation;
  beforeEach(function() {
    operation = setStateUtil({ cool: 'swag' });
  });

  it('should return an object with the method `transform`', function() {
    operation.should.contain.keys('transform');
    operation.transform.should.be.a('function');
  });

  it('should assign new properties to store state', function() {
    var oldState = {
      cool: 'beans',
      doNot: 'modify'
    };

    var newState = operation.transform(oldState);
    newState.should.contain.keys('cool', 'doNot');
    newState.should.contain({ cool: 'swag' });
  });

  it('should error if passed an improper object', function() {
    var fn = function() {
      operation = setStateUtil();
    };
    fn.should.to.throw();
  });
});
