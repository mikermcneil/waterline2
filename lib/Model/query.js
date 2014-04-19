/**
 * Module dependencies
 */

var _ = require('lodash');
_.defaults = require('merge-defaults');


/**
 * Factory method to generate a new Query using this model instance.
 *
 * @param  {Object} opts
 * @param  {Function} worker
 * @return {Query}
 */
module.exports = function query (opts, worker) {
  return this.orm.query(_.defaults(opts, {
    operations: {
      from: this.identity
    }
  }), worker);
};
