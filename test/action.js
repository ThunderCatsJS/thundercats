/* eslint-disable no-unused-expressions */
var chai = require('chai');
chai.should();
var expect = chai.expect;
var chaiAsPromised = require('chai-as-promised');
var sinon = require('sinon');
var sinonChai = require('sinon-chai');

var Action = require('../').Action;
var inherits = require('../utils').inherits;

chai.use(chaiAsPromised);
chai.use(sinonChai);

describe('Action', function() {

  describe('class', function() {
    it('should create an instance of Action', function() {
      var actions = new Action();
      actions.should.be.an.instanceOf(Action);
    });

    describe('subclass', function() {
      var ThunderCatsHo;
      var catActions;

      beforeEach(function() {
        ThunderCatsHo = function ThunderCatsHo() {
          Action.call(this);
        };

        inherits(ThunderCatsHo, Action);

        ThunderCatsHo.prototype.getInBox = function(value) {
          return {
            author: value,
            result: 'disobey'
          };
        };

        catActions = new ThunderCatsHo();
      });

      it('should be extend-able', function() {
        catActions.should.be.an.instanceOf(ThunderCatsHo);
        catActions.getInBox.should.exist;
      });

      it('should produce observables for defined methods', function() {
        catActions.getInBox.subscribe.should.be.a('function');
      });

      it('should respect original action function', function() {
        catActions.getInBox.subscribe(function(value) {
          value.should.be.an('object');
          value.author.should.equal('human');
          value.result.should.equal('disobey');
        });
        catActions.getInBox('human');
      });
    });
  });

  describe('create', function() {
    it('should create a function observable', function() {
      var action = Action.create();
      action.should.be.a('function');
      action.subscribe.should.to.be.a('function');
    });
  });

  describe('creatActions', function() {
    it(
      'should take a single string and create ' +
      'an object with an action method observable',
      function() {
        var actions = Action.createActions('getKatnip');
        actions.getKatnip.should.exist;
        actions.getKatnip.subscribe.should.be.a('function');
      }
    );

    it('should take an array of strings', function() {
      var actions = Action.createActions([
        'getKatnip',
        'takeNap'
      ]);
      actions.getKatnip.should.exist;
      actions.getKatnip.subscribe.should.be.a('function');
      actions.takeNap.should.exist;
      actions.takeNap.subscribe.should.be.a('function');
    });

    it('should take an array of objects and strings', function() {
      var actions = Action.createActions([
        'getKatnip',
        { name: 'takeNap' }
      ]);

      actions.getKatnip.should.exist;
      actions.getKatnip.subscribe.should.be.a('function');
      actions.takeNap.should.exist;
      actions.takeNap.subscribe.should.be.a('function');
    });

    it('should take an array of objects and strings', function() {
      var actions = Action.createActions([
        'getKatnip',
        {
          name: 'fetchPaper',
          map: function(value) {
            return {
              order: value,
              response: 'nope'
            };
          }
        }
      ]);

      actions.getKatnip.should.exist;
      actions.fetchPaper.should.exist;
      actions.fetchPaper.subscribe.should.be.a('function');
      actions.fetchPaper.subscribe(function(value) {
        value.should.be.an('object');
        value.order.should.equal('now');
        value.response.should.equal('nope');
      });
      actions.fetchPaper('now');
    });

    it(
      'should throw if given anything other than a string or an array',
      function() {
        expect(function() {
          Action.createActions({});
        }).to.throw(/expects a string or an array/);
      }
    );
  });

  describe('call', function() {
    var action;

    beforeEach(function() {
      action = Action.create();
    });

    it(
      'should notify passed value to subscribed observer when called',
      function(done) {
        action.first().subscribe(function (val) {
          val.should.equal(3);
          done();
        });

        action(3);
      }
    );
  });

  describe('map', function() {
    var value1 = {};
    var value2 = {};
    var map;
    var spy;
    var action;

    beforeEach(function() {
      map = function() {
        return value2;
      };

      spy = sinon.spy(map);
      action = Action.create(spy);
    });

    it(
      'should pass the value passed as parameter to the map function',
      function(done) {
        action.first().subscribe(function() {
          done();
        });
        action(value1);
        spy.should.have.been.calledOnce;
        spy.should.have.been.calledWith(value1);
      }
    );


    it(
      'should pass the result of the map function to observers',
      function(done) {
        action.first().subscribe(function(val) {
          val.should.equal(value2);
          done();
        });
        action(value1);
      }
    );

    it('should throw an error when an error is thrown in the map', function() {
      Action.create(function() {
        throw new Error('test');
      }).should.throw();
    });
  });

  describe('disposal', function() {

    var spy;
    var action;

    beforeEach(function() {
      action = Action.create();
      spy = sinon.spy();
    });

    it('should call observer that isn\'t disposed', function() {
      action.subscribe(spy);
      action(3);
      spy.should.have.been.called;
    });

    it('should not call observer that has been disposed', function() {
      action.subscribe(spy).dispose();
      action(3);
      spy.should.not.have.been.called;
    });
  });

  describe('observers', function() {

    var action, disposable;
    beforeEach(function() {
      action = Action.create();
    });

    it('should return false if the action has no observers', function() {
      action.hasObservers().should.be.false;
    });

    it('should return true if the action as observers', function() {
      disposable = action.subscribe(function () {});
      action.hasObservers().should.be.true;
    });

    it('should return false if observers have been disposed of', function() {
      disposable = action.subscribe(function() { });
      disposable.dispose();
      action.hasObservers().should.be.false;
    });
  });
});
