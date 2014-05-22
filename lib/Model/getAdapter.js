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
    console.log(this.connection, this.datastore);
    // console.log(this.orm, this.orm.adapters, this.orm.datastores, this.orm.models, this);
    var datastore = _.find(this.orm.datastores, { identity: this.datastore });
    var adapter = _.find(this.orm.adapters, { identity: datastore.adapter });
    return adapter;
  }
  catch (e) {
    return null;
  }
};
