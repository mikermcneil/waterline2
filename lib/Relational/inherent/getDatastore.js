/**
 * #Relational.prototype.getDatastore()
 *
 * Look up the datastore instance this model belongs to.
 *
 * @return {Datastore}
 *
 * @api public
 */

module.exports = function getDatastore () {
  try {
    return this.orm.getDatastore(this.datastore);
  }
  catch (e) {
    return null;
  }
};
