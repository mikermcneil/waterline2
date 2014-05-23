/**
 * Module dependencies
 */

var _ = require('lodash');




/**
 * Look up the live Adapter instance for this Model's Datastore.
 *
 * @return {Adapter}
 */

module.exports = function getAdapter () {
  try {
    var datastore = this.orm.getDatastore(this.datastore);
    var adapter = this.orm.getAdapter(datastore.adapter);
    return adapter;
  }
  catch (e) {
    return null;
  }
};
