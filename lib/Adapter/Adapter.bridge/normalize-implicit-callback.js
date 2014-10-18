/**
 * Module dependencies
 */

var _ = require('lodash');



/**
 * Normalize implicit/internal callback
 * (not what is publicly exposed to .exec())
 *
 * @param  {[type]}   adapter [description]
 * @param  {Function} cb      [description]
 * @return {[type]}           [description]
 * @api private
 */
module.exports = function _normalizeImplicitCallback(adapter, cb) {
  if (!_.isFunction(cb)) {
    return function (err) {
      if (err) {
        if (adapter && adapter.orm) {
          // TODO: emit error on ORM instead of throwing
          throw err;
          // adapter.orm.emit('error', err);
        }
        else throw err;
      }
    };
  }
  else return cb;
};
