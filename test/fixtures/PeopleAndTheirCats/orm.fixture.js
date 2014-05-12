/**
 * Module dependencies
 */

var _ = require('lodash');
_.defaults = require('merge-defaults');
var rootrequire = require('root-require');
var assert = require('assert');
var WLFilter = require('waterline-criteria');

var Waterline = rootrequire('./');
var isORM = rootrequire('./test/helpers/isORM');
var isAdapter = rootrequire('./test/helpers/isAdapter');
var isDatabase = rootrequire('./test/helpers/isDatabase');
var isModel = rootrequire('./test/helpers/isModel');



/**
 * Stub out an ORM instance with a simple default ontology.
 * @return {ORM}
 */

module.exports = function SimpleORM (ontology) {

  var DEFAULT_ONTOLOGY = {
    models: {
      user: {
        database: 'default',
        attributes: {}
      },
      person: {
        database: 'withData',
        attributes: {
          id: { type: 'integer', primaryKey: true },
          name: { type: 'string' },
          dad: { type: 'json' },
          friends: { type: 'array' },
          petCat: { model: 'cat' },
          petOfCats: { collection: 'cat', via: 'petHuman' }
        }
      },
      cat: {
        database: 'withData',
        attributes: {
          id: {type: 'integer', primaryKey: true},
          numEars: {type: 'integer'},
          name: { type: 'string' },
          petHuman: { model: 'person' },
          owners: { collection: 'person', via: 'petCat' }
          // casualHumanFriends: { collection: 'person' }
        }
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
          setTimeout(function () {
            var stubdata = {
              person: require('./person.dataset.fixture'),
              cat: require('./cat.dataset.fixture')
            };
            var results = WLFilter(criteria.from, stubdata, criteria).results;
            return cb(null, results);
          }, 0);
        }
      },
      'wl-pretend': {
        describe: function (db, modelID, cb) {
          cb(null, {
            attributes: {},
            database: 'default'
          });
        },
        find: function (criteria, cb) {
          setTimeout(function () {
            cb('not a real adapter');
          }, 0);
        }
      }
    }
  };

  ontology = _.defaults(_.cloneDeep(DEFAULT_ONTOLOGY), ontology || {});
  return Waterline(ontology);
};



/**
 * This is a self-testing fixture.
 * Runs some sanity checks (if this is mocha)
 */

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
