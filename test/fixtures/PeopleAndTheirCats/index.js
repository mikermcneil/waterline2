/**
 * Module dependencies
 */

var rootrequire = require('root-require');
var _ = require('lodash');

var Waterline = rootrequire('./');
var buildDef_PretendAdapter = require('./PretendAdapter.fixture');
var buildDef_CatPersonAdapter = require('./CatPersonAdapter.fixture');



/**
 * PeopleAndTheirCats (fixture)
 * @return {ORM}
 */

module.exports = function PeopleAndTheirCats () {

  var orm = Waterline({
    models: {
      user: {
        datastore: 'default',
        attributes: {}
      },
      person: {
        datastore: 'withData',
        attributes: {
          id: { type: 'integer', primaryKey: true },
          name: { type: 'string' },
          dad: { type: 'json' },
          friends: { type: 'array' },
          petCat: { model: 'cat' },
          petOfCats: {
            collection: 'cat',
            via: 'petHuman'
          }
        }
      },
      cat: {
        datastore: 'withData',
        attributes: {
          id: {type: 'integer', primaryKey: true},
          numEars: {type: 'integer'},
          name: { type: 'string' },
          petHuman: { model: 'person' },
          owners: { collection: 'person', via: 'petCat' }
        }
      }
    },
    datastores: {
      default: {
        adapter: 'wl-pretend'
      },
      withData: {
        adapter: 'wl-memory'
      }
    },
    adapters: {
      'wl-memory': buildDef_CatPersonAdapter(),
      'wl-pretend': buildDef_PretendAdapter()
    }
  });


  // The following self-tests this fixture.
  // (if this is mocha, runs some quick sanity checks)
  if (typeof describe !== 'undefined') {
    var assert = require('assert');

    /**
     * Tests
     */
    describe('fixtures', function () {
      describe(require('util').format('Waterline(%s)',PeopleAndTheirCats), function () {
        it('should return a sane, valid ORM instance', function () {
          assert(Waterline.ORM.isORM(orm));
        });

        it('should return a properly configured ontology in that ORM instance', function () {
          assert( Waterline.Adapter.isAdapter (_.find(orm.adapters, { identity: 'wl-pretend' })), 'adapter is missing or invalid' );
          assert( Waterline.Datastore.isDatastore (_.find(orm.datastores, { identity: 'default' })), 'datastore is missing or invalid' );
          assert( Waterline.Model.isModel   (_.find(orm.models, { identity: 'user' })), 'model is missing or invalid' );
        });
      });
    });
  }


  return orm;
};


