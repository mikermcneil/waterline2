/**
 * Module dependencies
 */
var WLFilter = require('waterline-criteria');


// Global heap data
var heap = {};

/**
 * MemoryAdapter (fixture)
 * @type {Object}
 */

module.exports = {

  waterlineVersion: '~2.0.0',

  find: function (criteria, cb) {
    setTimeout(function () {
      var results = WLFilter(criteria.from, heap, criteria).results;
      return cb(null, results);
    }, 0);
  }
};
