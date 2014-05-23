/**
 * Look up the live Adapter instance for this Model's Datastore.
 *
 * @return {Adapter}
 */

module.exports = function getAdapter () {
  try {
    return this.orm.getDatastore(this.datastore).getAdapter();
  }
  catch (e) {
    return null;
  }
};
