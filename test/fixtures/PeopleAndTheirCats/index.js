/**
 * Module dependencies
 */

var rootrequire = require('root-require');

var ORMFactory = rootrequire('./test/helpers/buildORMFixture');
var buildDef_PretendAdapter = rootrequire('./test/fixtures/PretendAdapter.fixture');
var buildDef_CatPersonAdapter = require('./CatPersonAdapter.fixture');



/**
 * PeopleAndTheirCats (fixture)
 * @return {ORM}
 */

module.exports = function buildORMFixture () {

  return ORMFactory({
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
      'wl-memory': buildDef_CatPersonAdapter(),
      'wl-pretend': buildDef_PretendAdapter()
    }
  });
};


