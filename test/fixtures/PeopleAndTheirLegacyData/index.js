/**
 * Module dependencies
 */

var rootrequire = require('root-require');
var Waterline = rootrequire('./');



/**
 * PeopleAndTheirLegacyData (fixture)
 * @return {ORM}
 */

module.exports = function PeopleAndTheirLegacyData () {

  return Waterline({
    models: {
      person: {
        datastore: 'default',
        attributes: {
          id: { type: 'integer', primaryKey: true, fieldName: '_legacy_id' },
          name: { type: 'string', fieldName: '_legacy_name' },
          email: { type: 'string', fieldName: '_legacy_email'}
        }
      },
      chat: {
        datastore: 'default',
        attributes: {
          id: { type: 'integer', primaryKey: true },
          message: {type: 'string'},
          recipients: {
            collection: 'person'
          }
        }
      }
    },
    datastores: {
      default: {
        adapter: 'default'
      }
    },
    adapters: {
      'default': require('./adapter')()
    }
  });
};


