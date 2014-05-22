/**
 * Module dependencies
 */

var _ = require('lodash');


/**
 * Look up the live Datastore instance for this Model.
 *
 * @return {Datastore}
 */

module.exports = function getDatastore () {
  try {
    var datastore = _.find(this.orm.datastores, { identity: this.datastore });
    return datastore;
  }
  catch (e) {
    return null;
  }
};
