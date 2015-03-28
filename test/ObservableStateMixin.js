/* eslint-disable no-unused-expressions, no-undefined */
var Rx = require('rx'),
    chai = require('chai'),
    utils = require('./utils'),
    sinon = require('sinon'),
    expect = chai.expect,
    ObservableStateMixin = require('../').ObservableStateMixin;

chai.should();
chai.use(require('sinon-chai'));

// var sinon = require('sinon');

describe('Observable State Mixin', function() {

  describe('getObservable', function() {
    var observable1, observable2, spy, spy2;

    beforeEach(function() {
      spy = sinon.spy();
      spy2 = sinon.spy();
      observable1 = new Rx.BehaviorSubject({ test: 'one'});
      observable2 = new Rx.BehaviorSubject({ test2: 'purrfect' });
    });

    it('should return a single observable', function() {
      var func = utils.createRenderSpecFunc({
        displayName: 'Panthro',
        mixins: [ObservableStateMixin],
        getObservable: function() {
          return observable1;
        },
        render: function() {
          spy(this.state.test);
          return null;
        }
      });
      expect(func).not.to.throw();
      spy.should.have.been.calledTwice;
      spy.should.have.been.calledWith('one');
    });

    it('should return a multiple observable', function() {
      expect(utils.createRenderSpecFunc({
        mixins: [ObservableStateMixin],
        getObservable: function() {
          return [
            observable1,
            observable2
          ];
        },
        render: function() {
          spy(this.state.test);
          spy2(this.state.test2);
          return null;
        }
      })).not.to.throw();
    });

    it('should update initial value', function() {
      expect(utils.createRenderToStringSpecFunc({
        mixins: [ObservableStateMixin],
        getObservable: function() {
          return [
            observable1,
            observable2
          ];
        },
        render: function() {
          spy(this.state.test);
          spy2(this.state.test2);
          return null;
        }
      })).not.to.throw();
      spy.should.have.been.calledOnce;
      spy.should.have.been.calledWith('one');
      spy2.should.have.been.calledWith(undefined);
    });

    it('should not subscribe to observer on initial render', function() {
      expect(utils.createRenderToStringSpecFunc({
        mixins: [ObservableStateMixin],
        getObservable: function() {
          return observable1;
        },
        render: function() {
          spy(this.state.test);
          return null;
        }
      })).not.to.throw();
      spy.should.have.been.calledOnce;
      spy.should.have.been.calledWith('one');
      observable1.hasObservers().should.equal(false);
      // spy2.should.have.been.calledWith('purrfect');
    });

    it('should not subscribe to observer on initial render', function() {
      expect(utils.createRenderToStringSpecFunc({
        mixins: [ObservableStateMixin],
        getObservable: function() {
          return observable1;
        },
        render: function() {
          spy(this.state.test);
          return null;
        }
      })).not.to.throw();
      spy.should.have.been.calledOnce;
      spy.should.have.been.calledWith('one');
      observable1.hasObservers().should.equal(false);
      // spy2.should.have.been.calledWith('purrfect');
    });

    it('should throw if it is not defined', function() {
      expect(utils.createRenderSpecFunc({
        mixins: [ObservableStateMixin],
        getNOTObservable: function() {
          return Rx.Observable.empty();
        },
        render: function() {
          return null;
        }
      })).to.throw(/should provide "getObservable" function/);
    });

    it(
      'should throw if it is not a function',
      function() {
        expect(utils.createRenderSpecFunc({
          displayName: 'monkey',
          mixins: [ObservableStateMixin],
          getObservable: 'island',
          render: function() {
            return null;
          }
        })).to.throw(/should provide "getObservable" function/);
      }
    );
    it(
      'should throw if it does not return an observable',
      function() {
        expect(utils.createRenderSpecFunc({
          displayName: 'monkey',
          mixins: [ObservableStateMixin],
          getObservable: function() {
            return 'island';
          },
          render: function() {
            return null;
          }
        })).to.throw(/should return an Rx.Observable/);
      }
    );
    it(
      'should throw if it does not return an array of observables',
      function() {
        expect(utils.createRenderSpecFunc({
          displayName: 'monkey',
          mixins: [ObservableStateMixin],
          getObservable: function() {
            return [
              Rx.Observable.from({}),
              'island'
            ];
          },
          render: function() {
            return null;
          }
        }))
          .to
          .throw(
            /should return an Rx.Observable or an array of Rx.Observables/
          );
      }
    );

    it(
      'should throw if the observable state does returns not object or null',
      function() {
        expect(utils.createRenderSpecFunc({
          displayName: 'monkey',
          mixins: [ObservableStateMixin],
          getObservable: function() {
            return Rx.Observable.from([5, 2]);
          },
          render: function() {
            return null;
          }
        })).to.throw(/should publish objects or null/);
      }
    );
  });

  describe('subscription', function() {
    var observable1, spy;

    beforeEach(function() {
      spy = sinon.spy();
      observable1 = new Rx.BehaviorSubject({ test: 'one'});
    });

    it('should subscribe to observable state after mount', function() {
      utils.createRenderSpecFunc({
        mixins: [ObservableStateMixin],
        getObservable: function() {
          return observable1;
        },
        render: function() {
          spy(this.state.test);
          return null;
        }
      })();
      spy.should.have.been.calledTwice;
      spy.should.have.been.calledWith('one');
      observable1.hasObservers().should.equal(true);
    });

    it('should unsubscribe to observable state after unmount', function() {
      var ctx = utils.createRenderSpecFunc({
        mixins: [ObservableStateMixin],
        getObservable: function() {
          return observable1;
        },
        render: function() {
          spy(this.state.test);
          return null;
        }
      })();
      spy.should.have.been.calledTwice;
      spy.should.have.been.calledWith('one');
      observable1.hasObservers().should.equal(true);
      ctx.instance.componentWillUnmount();
      observable1.hasObservers().should.equal(false);
    });
  });

  describe('dispose all', function() {
    var ctx, observable;

    beforeEach(function() {
      observable = new Rx.BehaviorSubject({ statement: 'ThunderCats, ho!' });
      ctx = utils.createRenderSpecFunc({
        mixins: [ObservableStateMixin],
        getObservable: function() {
          return observable;
        },
        render: function() {
          return null;
        }
      })();
    });

    it('should add static method to component', function() {
      ctx.FakeComp.disposeAllSubscriptions.should.be.a('function');
    });

    // this should test disposal of subscription on multiple components
    // using the observable state mixin
    it('should remove dispose all subscriptions when called', function() {
      observable.hasObservers().should.be.true;
      ctx.FakeComp.disposeAllSubscriptions();
      observable.hasObservers().should.be.false;
    });
  });
});
