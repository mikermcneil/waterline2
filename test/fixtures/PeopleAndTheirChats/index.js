/**
 * Module dependencies
 */

var rootrequire = require('root-require');
var buildAndTestORM = rootrequire('./test/helpers/buildAndTestORM');



/**
 * PeopleAndTheirChats (fixture)
 * @return {ORM}
 */

module.exports = function PeopleAndTheirChats () {

  return buildAndTestORM({
    models: {
      person: {
        datastore: 'default',
        attributes: {
          id: { type: 'integer', primaryKey: true },
          name: { type: 'string' },
          email: { type: 'string' }
        }
      },
      chat: {
        datastore: 'default',
        attributes: {
          id: { type: 'integer', primaryKey: true },
          message: {type: 'string'}
        }
      }
    },
    datastores: {
      default: {
        adapter: 'default'
      }
    },
    adapters: {
      'default': require('./adapter')
    }
  });
};


