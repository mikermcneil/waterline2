/**
 * Module dependencies
 */

var assert = require('assert');
var util = require('util');
var _ = require('lodash');
var Adapter = require('root-require')('lib/Adapter');
var Datastore = require('root-require')('lib/Datastore');
var Relation = require('root-require')('lib/Relation');
var Deferred = require('root-require')('standalone/Deferred');
var Waterline = require('root-require')('./');

var WLUsageError = require('root-require')('standalone/WLError/WLUsageError');








//
// ****************************************************************
// Mocks / Fixtures
// ****************************************************************
//

// Used for message-passing (to check state within an adapter method)
var _EXPECT_CRITERIA_IN_ADAPTER;
var _EXPECT_CID_IN_ADAPTER;

// Ontology
var orm = Waterline({
  models: {
    someModel: {
      datastore: 'someDatastore',
      attributes: {
        firstName: {
          type: 'string'
        }
      }
    },
    someOtherModel: {
      datastore: 'someOtherDatastore',
      cid: '_some_legacy_table_or_something',
      attributes: {
        firstName: {
          type: 'string',
          fieldName: '_first_name'
        }
      }
    }
  },
  datastores: {
    someDatastore: {
      adapter: 'someAdapter'
    },
    someOtherDatastore: {
      adapter: 'someOtherAdapter'
    }
  },
  adapters: {

    // NOTE: because no apiVersion is specified, this adapter defaults to `0.0.0`
    someAdapter: {
      foo: function(/* ... */) {
        assert(arguments.length === ['Datastore', 'Model', 'callback'].length);
        assert(arguments[0] instanceof Datastore, 'Unexpected arguments (expected arguments[0] to be a Datastore) in adapter method: '+util.inspect(arguments));
        assert(arguments[1] instanceof Relation, 'Unexpected arguments (expected arguments[1] to be a Relation) in adapter method: '+util.inspect(arguments));
        assert(typeof arguments[2] === 'function', 'Unexpected arguments in adapter method: '+util.inspect(arguments));
        arguments[2]();
      },
    },


    someOtherAdapter: {

      apiVersion: '2.0.0',

      // Note that this one also tests that overriding `find` works
      find: function ( /* db, cid, criteria, cb */ ) {
        var expectedNumArgs = ['Datastore', 'Model.cid', 'criteria', 'callback'].length;
        assert(arguments.length === expectedNumArgs, 'Unexpected # of arguments ('+arguments.length+'), expected '+expectedNumArgs+'.  Args: '+util.inspect(arguments));
        assert(arguments[0] instanceof Datastore, 'Unexpected arguments (expected arguments[0] to be a Datastore) in adapter method: '+util.inspect(arguments));
        assert(typeof arguments[1] === 'string', 'Unexpected arguments (expected arguments[1] to be a string) in adapter method: '+util.inspect(arguments));
        assert(typeof arguments[2] === 'object', 'Unexpected arguments (expected arguments[2] to be a criteria object) in adapter method: '+util.inspect(arguments));

        // Apply one-time checks using probe fns defined in closure scope
        if (_EXPECT_CID_IN_ADAPTER) {
          _EXPECT_CID_IN_ADAPTER(arguments[1]);
          _EXPECT_CID_IN_ADAPTER = false;
        }
        if (_EXPECT_CRITERIA_IN_ADAPTER) {
          _EXPECT_CRITERIA_IN_ADAPTER(arguments[2]);
          _EXPECT_CRITERIA_IN_ADAPTER = false;
        }

        assert(typeof arguments[3] === 'function', 'Unexpected arguments in adapter method: '+util.inspect(arguments));

        // Physical-layer mock data
        var MOCK_PHYSICAL_LAYER_DATA = [{
          _first_name: 'Lisa',
          _last_name: 'Frank'
        },
        {
          _first_name: 'Jerry',
          _last_name: 'Lewis',
          physicalFirstNameIsJerry: true
        },
        {
          _first_name: 'Eustace',
          _last_name: 'Juicetus'
        },
        {
          _first_name: 'Eustace',
          _last_name: 'Snoozetus'
        },
        {
          _first_name: 'Anne',
          _last_name: 'Frank'
        },
        {
          _first_name: 'Jerry',
          _last_name: 'Bluis',
          firstName: 'a deliberate red herring!',
          physicalFirstNameIsJerry: true
        }];

        arguments[3](null, MOCK_PHYSICAL_LAYER_DATA);
      }
    }
  }
});


// Arbitrary bridge fns
var mockWLEntity = orm.model('someModel');

mockWLEntity.fooBridge = Adapter.bridge({
  usage: [{
    label: 'callback',
    type: 'function',
    optional: true
  }],
  adapterMethod: 'foo',
  adapterUsage: {
    '>= 2.0.0': ['callback'],
    '*': ['Datastore', 'Model', 'callback']
  }
});

var otherMockWLEntity = orm.model('someOtherModel');
otherMockWLEntity.withCriteriaBridge = Adapter.bridge({
  usage: [{
    label: 'criteria',
    type: 'object'
  },
  {
    label: 'callback',
    type: 'function',
    optional: true
  }],
  adapterMethod: 'find',
  adapterUsage: {
    '*': ['Datastore', 'Model.cid', 'criteria', 'callback']
  },
  adapterResults: {
    type: 'attrValues[]'
  }
});















//
// ****************************************************************
// The Actual Tests
// ****************************************************************
//

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

      });


      it('should have the same context as the caller (in this case, `mockWLEntity`)', function(done) {
        // Only way to really test this right now is to see if calling `.exec()` works
        // (because that means the bridge fn was able to access the `getAdapter()` method)
        var fooBridge_returns = mockWLEntity.fooBridge();
        fooBridge_returns.exec(done);
      });
    });


    describe('with a `cid` in spec', function (done) {

      it('should implement `cid` (i.e. `tableName`) schema transformation in arguments to adapter method', function (){

        _EXPECT_CID_IN_ADAPTER = function (cid) {
          assert(cid && cid === '_some_legacy_table_or_something', 'Expected `cid` === "_some_legacy_table_or_something" but instead I got: '+util.inspect(cid));
        };

        otherMockWLEntity.withCriteriaBridge().exec(done);

      });
    });

    describe('with a `criteria` in `spec`', function() {

      var withCriteriaBridge_returns1;
      var withCriteriaBridge_returns2;
      before(function (){
        withCriteriaBridge_returns1 = otherMockWLEntity.withCriteriaBridge();
        withCriteriaBridge_returns2 = otherMockWLEntity.withCriteriaBridge({
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

      it('should implement `fieldName` (i.e. `columnName`) schema transformation in criteria argument passed to adapter method', function (done){

        _EXPECT_CRITERIA_IN_ADAPTER = function (criteria) {
          assert(
            criteria.where && criteria.where._first_name === 'Eustace' && !criteria.where.firstName,
            'Expected criteria object passed to adapter method to transform '+
            'attribute "firstName" into "_first_name", but instead the criteria '+
            'obj is: '+util.inspect(criteria)
          );
        };

        otherMockWLEntity.withCriteriaBridge({
          where: {
            firstName: 'Eustace'
          }
        })
        .exec(done);

      });

    });


    it.skip('should implement `fieldName` (i.e. `columnName`) schema transformation on `attrValues[]` argument passed to adapter method', function (done){
      done(new Error('todo'));
    });
    it.skip('should implement `fieldName` (i.e. `columnName`) schema transformation on `attrValues` argument passed to adapter method', function (done){
      done(new Error('todo'));
    });


    // Transformation of result records
    it.skip('should UN-transform result records, mapping their `fieldName`s to their logical attribute name if the bridge method has `adapterResults: {type: "attrValues[]" }`', function (){
      otherMockWLEntity.withCriteriaBridge({
        where: {
          firstName: 'Eustace'
        }
      })
      .exec(function (err, resultRecords) {
        if (err) return done(err);
        assert(_.isArray(resultRecords), 'Expected results from bridge method to be an array of records, but got: '+util.inspect(resultRecords, false, null));
        assert(_.all(resultRecords, function _hasFirstNameProp (record) {
          return record.firstName;
        }), 'Expected all results from bridge method to have a `firstName` property, but got: '+util.inspect(resultRecords, false, null));
        done();
      });
    });

    // Sanity check the transformation of results from CRUD methods
    it('should UN-transform result records, mapping their `fieldName`s to their logical attribute name if this is a `find`', function (done){
      otherMockWLEntity.find({
        where: {
          firstName: 'Eustace'
        }
      })
      .exec(function (err, resultRecords) {
        if (err) return done(err);
        assert(_.isArray(resultRecords), 'Expected results from bridge method to be an array of records, but got: '+util.inspect(resultRecords, false, null));
        assert(_.all(resultRecords, function _hasFirstNameProp (record) {
          return record.firstName;
        }), 'Expected all results from bridge method to have a `firstName` property, but got: '+util.inspect(resultRecords, false, null));
        done();
      });
    });
    it.skip('should UN-transform result records, mapping their `fieldName`s to their logical attribute name if this is a `create`', function (done){
      return done(new Error('todo'));
    });
    it.skip('should UN-transform result records, mapping their `fieldName`s to their logical attribute name if this is a `update`', function (done){
      return done(new Error('todo'));
    });
    it.skip('should UN-transform result records, mapping their `fieldName`s to their logical attribute name if this is a `destroy`', function (done){
      return done(new Error('todo'));
    });


    it('should prioritize explicit attr values in result records over `fieldName--(backto)->logical attrname` mappings', function (done){
      otherMockWLEntity.withCriteriaBridge({
        where: {
          firstName: 'Eustace'
        }
      })
      .exec(function (err, resultRecords) {
        if (err) return done(err);
        assert(_.isArray(resultRecords), 'Expected results from bridge method to be an array of records, but got: '+util.inspect(resultRecords, false, null));

        var trickRecord = _.find(resultRecords, function _isTheTrickRecord (record) {
          return record.physicalFirstNameIsJerry && record.firstName !== 'Jerry';
        });
        assert(trickRecord);

        done();
      });
    });

  });

});






