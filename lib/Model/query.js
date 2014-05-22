/**
 * Module dependencies
 */

var _ = require('lodash');
_.defaults = require('merge-defaults');


/**
 * Factory method to generate a new generic Waterline Query pointed
 * at this model instance (i.e. presets the "from" property)
 *
 * @param  {Object} opts
 * @param  {Function} worker
 * @return {Query}
 */
module.exports = function query (opts, worker) {
  opts = _.defaults(opts || {}, {
    criteria: {
      from: this.identity
    }
  });
  return this.orm.query(opts, worker);
};
