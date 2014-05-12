/**
 * PeopleAndTheirCats (fixture)
 * @type {Ontology(def)}
 */

module.exports = {
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
    'wl-memory': require('root-require')('./test/fixtures/MemoryAdapter.fixture'),
    'wl-pretend': require('root-require')('./test/fixtures/PretendAdapter.fixture')
  }
};
