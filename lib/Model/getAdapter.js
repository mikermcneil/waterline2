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
    var datastore = this.orm.getDatastore(this.datastore);//_.find(this.orm.datastores, { identity: this.datastore.toLowerCase() });
    var adapter = this.orm.getAdapter(datastore.adapter); //_.find(this.orm.adapters, { identity: datastore.adapter.toLowerCase() });
    return adapter;
  }
  catch (e) {
    return null;
  }
};
