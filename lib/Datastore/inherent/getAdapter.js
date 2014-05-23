/**
 * Look up the live Adapter instance for this Datastore.
 *
 * @return {Adapter}
 */

module.exports = function getAdapter () {
  return this.orm.getAdapter(this.adapter);
};
