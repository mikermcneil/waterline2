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
    return this.orm.getDatastore(this.datastore);
  }
  catch (e) {
    return null;
  }
};
