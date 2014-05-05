/**
 * Module dependencies
 */

var _ = require('lodash');




/**
 * Compute the union of two (flat) WHERE criteria objects.
 *
 * Errs on the side of permissiveness- better to net
 * more results than to skip some.
 *
 * @param  {Criteria} x
 * @param  {Criteria} y
 * @return {Criteria}
 */
module.exports = function criteriaUnion (x, y) {

  var conflicts = [];
  var union = {};

  // First, add the easy cases to the union.
  // (i.e. where one side defines a criterion and the other doesn't.)
  // Keep track of conflicts for use below.
  _.each(x, function eachAttrInX (xsub, attrName) {
    var ysub = y[attrName];
    if ( !ysub ) {
      union[attrName] = xsub;
      return;
    }
    conflicts[attrName] = conflicts[attrName] || {x: xsub, y: ysub};
  });
  _.each(y, function eachAttrInY (ysub, attrName) {
    var xsub = x[attrName];
    if ( !xsub ) {
      union[attrName] = ysub;
      return;
    }
    conflicts[attrName] = conflicts[attrName] || {x: xsub, y: ysub};
  });

  // Now resolve criteria conflicts
  _.each(conflicts, function (conflict, attrName) {

    // Handle double-IN conflict
    if (_.isArray(conflict.x) && _.isArray(conflict.y)) {
      union[attrName] = _.union(conflict.x, conflict.y);
      return;
    }
    // Handle one-sided IN conflicts
    else if (_.isArray(conflict.x)) {
      union[attrName] = conflict.x.concat([conflict.y]);
      return;
    }
    else if (_.isArray(conflict.y)) {
      union[attrName] = conflict.y.concat([conflict.x]);
      return;
    }
    // Handle double sub-attribute modifier conflict
    else if (_.isObject(conflict.x) && _.isObject(conflict.y)) {}
    // Handle one-sided sub-attribute modifier conflicts
    else if (_.isObject(conflict.x)) {}
    else if (_.isObject(conflict.y)) {}

    // TODO:
    // In the naive case, combine the criteria for the attribute
    // into an IN query (basically creating a sub-attribute OR clause).

    // FOR NOW:
    // If no resolution is to be had, ignore the troublesome
    // attribute value that's causing the clash.
    // This omits it as a criterion, meaning it will not be
    // factored into any future result sets obtained from
    // this query.
  });

  return union;
};
