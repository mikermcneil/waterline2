'use strict';
/**
 * Module dependencies
 */

var _ = require('lodash');



/**
 * "New up" a given array of definitions using the
 * given Class constructor.
 *
 * @param  {Array} arr
 * @return {Array}
 * @api private
 */

module.exports = function pruneUndefined(arr) {
  return _.remove(arr, function (item) {
    return item !== undefined;
  });
};

