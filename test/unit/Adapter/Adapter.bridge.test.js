/**
 * Module dependencies
 */

var assert = require('assert');
var util = require('util');
var Adapter = require('root-require')('lib/Adapter');
var Datastore = require('root-require')('lib/Datastore');
var Relation = require('root-require')('lib/Relation');
var Deferred = require('root-require')('standalone/Deferred');
var Waterline = require('root-require')('./');

var WLUsageError = require('root-require')('standalone/WLError/WLUsageError');



describe('Adapter', function() {
  describe('.bridge()', function() {

    it('should exist', function() {
      assert(typeof Adapter.bridge === 'function');
    });

    describe('its return value (bridge fn)', function() {

      it('should be a function', function() {
        assert(typeof mockWLEntity.fooBridge === 'function');
      });

      describe('when it (bridge fn) is called with invalid usage', function() {
        it('should throw a WLUsageError', function() {
          try { mockWLEntity.fooBridge(3); }
          catch (e) {
            assert(typeof e === 'object');
            assert(e instanceof WLUsageError, 'Error should be a WLUsageError instance, but instead it sent back: '+require('util').inspect(e));
            return;
          }
          throw new Error('Expected invalid usage passed to the bridge function to throw a WLUsageError');
        });
      });

      describe('when it (bridge fn) is called with valid usage', function() {

        it('should return a Deferred', function() {
          var fooBridge_returns = mockWLEntity.fooBridge();
          assert(typeof fooBridge_returns === 'object');
          assert(fooBridge_returns instanceof Deferred);
        });

        it('should implement `columnName` schema transformation in arguments to adapter method');
        it('should implement `tableName` schema transformation in arguments to adapter method');
        it('should run `compatibilityShim` to transform the adapter method\'s arguments');
      });


      it('should have the same context as the caller (in this case, `mockWLEntity`)', function(done) {
        // Only way to really test this right now is to see if calling `.exec()` works
        // (because that means the bridge fn was able to access the `getAdapter()` method)
        var fooBridge_returns = mockWLEntity.fooBridge();
        fooBridge_returns.exec(done);
      });
    });



    describe('with a `criteria` in `spec`', function() {

      var withCriteriaBridge_returns1;
      var withCriteriaBridge_returns2;
      before(function (){
        withCriteriaBridge_returns1 = mockWLEntity.withCriteriaBridge();
        withCriteriaBridge_returns2 = mockWLEntity.withCriteriaBridge({
          where: {
            id: [1,2]
          }
        });
      });

      it('should return a Deferred from resulting bridge function', function () {
        assert(typeof withCriteriaBridge_returns1 === 'object');
        assert(withCriteriaBridge_returns1 instanceof Deferred);
        assert(typeof withCriteriaBridge_returns2 === 'object');
        assert(withCriteriaBridge_returns2 instanceof Deferred);
      });

      it('should get expected arguments in adapter when resulting bridge fn is called', function (done) {

        withCriteriaBridge_returns1.exec();

        _EXPECT_CRITERIA_IN_ADAPTER = function (criteria) {
          assert(criteria.where && criteria.where.id, 'Expected criteria object passed to adapter method to contain `where` clause, but instead the criteria obj is: '+util.inspect(criteria));
        };
        withCriteriaBridge_returns2.exec();
        done();
      });
    });

  });

});






// Used for message-passing (to check state within an adapter method)
var _EXPECT_CRITERIA_IN_ADAPTER;


// mocks/fixtures:
var orm = Waterline({
  models: {
    someModel: {
      datastore: 'someDatastore',
    }
  },
  datastores: {
    someDatastore: {
      adapter: 'someAdapter'
    }
  },
  adapters: {
    someAdapter: {
      apiVersion: '1.0.0',
      foo: function(/* ... */) {
        assert(arguments.length === ['Datastore', 'Model', 'callback'].length);
        assert(arguments[0] instanceof Datastore, 'Unexpected arguments (expected arguments[0] to be a Datastore) in adapter method: '+util.inspect(arguments));
        assert(arguments[1] instanceof Relation, 'Unexpected arguments (expected arguments[1] to be a Relation) in adapter method: '+util.inspect(arguments));
        assert(typeof arguments[2] === 'function', 'Unexpected arguments in adapter method: '+util.inspect(arguments));
        arguments[2]();
      },
      bar: function ( /* db, cid, criteria, cb */) {
        var expectedNumArgs = ['Datastore', 'Model.cid', 'criteria', 'callback'].length;
        assert(arguments.length === expectedNumArgs, 'Unexpected # of arguments ('+arguments.length+'), expected '+expectedNumArgs+'.  Args: '+util.inspect(arguments));
        assert(arguments[0] instanceof Datastore, 'Unexpected arguments (expected arguments[0] to be a Datastore) in adapter method: '+util.inspect(arguments));
        assert(typeof arguments[1] === 'string', 'Unexpected arguments (expected arguments[1] to be a string) in adapter method: '+util.inspect(arguments));
        assert(typeof arguments[2] === 'object', 'Unexpected arguments (expected arguments[2] to be a criteria object) in adapter method: '+util.inspect(arguments));

        if (_EXPECT_CRITERIA_IN_ADAPTER) { _EXPECT_CRITERIA_IN_ADAPTER(arguments[2]); }
        assert(typeof arguments[3] === 'function', 'Unexpected arguments in adapter method: '+util.inspect(arguments));
        arguments[3]();
      }
    }
  }
});
var mockWLEntity = orm.model('someModel');

mockWLEntity.fooBridge = Adapter.bridge({
  method: 'foo',
  usage: [{
    label: 'callback',
    type: 'function',
    optional: true
  }],
  adapterUsage: {
    '>= 2.0.0': ['callback'],
    '*': ['Datastore', 'Model', 'callback']
  }
});

mockWLEntity.withCriteriaBridge = Adapter.bridge({
  method: 'bar',
  usage: [{
    label: 'criteria',
    type: 'object'
  },
  {
    label: 'callback',
    type: 'function',
    optional: true
  }],
  adapterUsage: {
    '*': ['Datastore', 'Model.cid', 'criteria', 'callback']
  }
});
