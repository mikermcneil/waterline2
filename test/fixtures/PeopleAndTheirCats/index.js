/**
 * Module dependencies
 */

var rootrequire = require('root-require');

var buildAndTestORM = rootrequire('./test/helpers/buildAndTestORM');
var buildDef_PretendAdapter = require('./PretendAdapter.fixture');
var buildDef_CatPersonAdapter = require('./CatPersonAdapter.fixture');



/**
 * PeopleAndTheirCats (fixture)
 * @return {ORM}
 */

module.exports = function PeopleAndTheirCats () {

  return buildAndTestORM({
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
            // current way:
            collection: 'cat',
            via: 'petHuman',

            // Ideas:

            // Array of foreign keys:
            // collection: 'Cat',
            // via: 'Cat.petHuman', // or link: 'Cat.petHuman',
            // fieldName: '_somecolumnnameforarrayofcatpks',
            // type: 'integer[]',

            // -OR-

            // Custom junction collection
            // (this is the default, if `junction` and `type` are omitted)
            // collection: 'Cat',
            // via: 'Cat.petHuman',
            // junction: {
            //   identity: 'person.petofcats',
            //   cid: 'person_petOfCats<->petHuman_person',
            //   attributes: {
            //     id: {
            //       type: 'integer',
            //       primaryKey: true,
            //       fieldName: '_somecolumnnameforpk'
            //     },
            //     cat: {
            //       model: 'Cat',
            //       type: 'integer',
            //       fieldName: '_somecolumnnameforcat'
            //     },
            //     person: {
            //       model: 'Person',
            //       type: 'integer',
            //       fieldName: '_somecolumnnameforperson'
            //     }
            //   }
            // }

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
};


