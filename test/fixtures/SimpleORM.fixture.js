/**
 * Module dependencies
 */

var _ = require('lodash');
_.defaults = require('merge-defaults');
var assert = require('assert');
var Waterline = require('../..');

// helpers
var isORM = require('../helpers/isORM');
var isAdapter = require('../helpers/isAdapter');
var isDatabase = require('../helpers/isDatabase');
var isModel = require('../helpers/isModel');


var DEFAULT_ONTOLOGY = {
  models: {
    user: {
      database: 'default',
      attributes: {}
    },
    person: {
      database: 'withData',
      attributes: {}
    }
  },
  databases: {
    default: {
      adapter: 'wl-pretend'
    },
    withData: {
      adapter: 'wl-memory'
    }
  },
  adapters: {
    'wl-memory': {
      find: function (criteria, cb) {
        console.log('whee');
        // TODO: use Adapter.wrap instead of all this nonsense
        return orm.query({
          operations: _.cloneDeep(criteria)
        }, function pseudoAdapter() {
          var WLFilter = require('waterline-criteria');
          var stubdata = require('./dataset.fixture');
          var results = WLFilter(criteria.from, stubdata, criteria).results;
          console.log('criteria:',criteria, 'results:',results);
          return cb(null, results);
        });
      }
    },
    'wl-pretend': {
      describe: function (db, modelID, cb) {
        cb(null, {
          attributes: {},
          database: 'default'
        });
      },
      find: function (criteria, cb) { cb('not a real adapter'); }
    }
  }
};


/**
 * Stub out an ORM instance with a simple default ontology.
 * @return {ORM}
 */

module.exports = function SimpleORM (ontology) {
  ontology = _.defaults(_.cloneDeep(DEFAULT_ONTOLOGY), ontology || {});
  return Waterline(ontology);
};



// Run some sanity checks if this is mocha
if (typeof describe !== 'undefined') {
  describe('fixtures', function () {
    describe('SimpleORM()', function () {
      it('should return a sane, valid ORM instance', function () {
        assert(isORM(module.exports()));
      });

      it('should return a properly configured ontology in that ORM instance', function () {
        assert( isAdapter (_.find(module.exports().adapters, { identity: 'wl-pretend' })), 'adapter is missing or invalid' );
        assert( isDatabase(_.find(module.exports().databases, { identity: 'default' })), 'database is missing or invalid' );
        assert( isModel   (_.find(module.exports().models, { identity: 'user' })), 'model is missing or invalid' );
      });
    });
  });
}
