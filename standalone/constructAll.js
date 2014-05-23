'use strict';
/**
 * Module dependencies
 */

var _ = require('lodash');



/**
 * "New up" a given array of definitions using the
 * given Class constructor.
 *
 * @param  {Array{Object?}} set
 * @param {Class.constructor} Class
 * @return {Array{Class}}
 * @api private
 */

module.exports = function _constructAll(set, Class) {
  return _.map(set, function (item) {
    if ( item instanceof Class ) return item;
    else return new Class(item);
  });
};
