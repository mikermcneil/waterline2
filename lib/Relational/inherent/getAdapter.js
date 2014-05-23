/**
 * #Relational.prototype.getAdapter()
 *
 * Look up the adapter instance used by this model's datastore.
 *
 * @return {Adapter}
 *
 * @api public
 */

module.exports = function getAdapter () {
  try {
    return this.getDatastore().getAdapter();
  }
  catch (e) {
    return null;
  }
};
