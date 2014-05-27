/**
 * Module dependencies
 */

var _ = require('lodash');
_.defaultsDeep = require('merge-defaults');


/**
 * Factory method to generate a new generic Waterline Query pointed
 * at this model/junction (i.e. presets the "from" or "junction" property)
 *
 * @param  {Object} opts
 * @param  {Function} worker
 * @return {Query}
 *
 * @api public
 */
module.exports = function query (opts, worker) {
  opts = _.defaultsDeep(opts || {}, {
    criteria: {}
  });

  if (this.constructor.name === 'Junction') {
    opts.criteria.junction = this.identity;
  }
  else {
    opts.criteria.from = this.identity;
  }

  return this.orm.query(opts, worker);
};
