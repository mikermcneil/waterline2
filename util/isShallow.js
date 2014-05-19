
/**
 * Module dependencies
 */

var _ = require('lodash');



/**
 * _isShallow()
 *
 * Check if the given operations tree is "shallow"
 * i.e. it has no subqueries or populates, and we can
 * safely enable the `raw` option for efficiency
 *
 * @param {Object} operations   [must be normalized!]
 * @return {Boolean}
 * @api private
 */

module.exports = function _isShallow (operations) {

  // Just because a WHERE or SELECT clause is an object doesn't
  // mean the operations tree is not "shallow"-- it could be a
  // sub-attribute modifier, or a simple embedded lookup
  // (for schemaless dbs like mongo or redis)
  //
  // We can only safely make this distinction because the operations
  // tree has already been normalized.

  return _.all(operations.where, function (whereAttr, attrName) {
    if (_.isObject(whereAttr)){}
  }) && _.all(operations.select, function (selectAttr, attrName) {

  });
};
