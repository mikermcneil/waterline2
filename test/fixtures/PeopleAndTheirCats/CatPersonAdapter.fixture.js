/**
 * Module dependencies
 */
var WLFilter = require('waterline-criteria');


/**
 * CatPersonAdapter (fixture)
 *
 * Factory which returns the definition of the CatPersonAdapter fixture.
 * @return {Object}
 */

module.exports = function build_CatPersonAdapter() {

  return {

    waterlineVersion: '~2.0.0',

    find: function (criteria, cb) {
      var heap = {
        person: require('./person.dataset.fixture'),
        cat: require('./cat.dataset.fixture')
      };
      setTimeout(function () {
        var results = WLFilter(criteria.from, heap, criteria).results;
        return cb(null, results);
      }, 0);
    }
  };
};
