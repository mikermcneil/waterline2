/**
 * Module dependencies
 */

var ORM = require('./lib/ORM');



/**
 * Factory which returns an ORM instance.
 * @param  {Object} opts
 * @return {ORM}
 */

module.exports = function Waterline (opts) {
  return new ORM(opts);
};
