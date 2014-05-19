/**
 * Module dependencies
 */

var util = require('util');
var assert = require('assert');
var WLFilter = require('waterline-criteria');
var rootrequire = require('root-require');


/**
 * CatPersonAdapter (fixture)
 *
 * Factory which returns the definition of the CatPersonAdapter fixture.
 * @return {Object}
 */

module.exports = function build_CatPersonAdapter() {

  return {

    apiVersion: '2.0.0',

    find: function (db, cid, criteria, cb) {
      assert(
        typeof criteria === 'object',
        '"criteria" argument should exist, and be an object- instead got:\n'+util.inspect(criteria)
      );
      assert(
        !(criteria instanceof rootrequire('lib/Model')),
        '"criteria" argument SHOULD NOT be an instance of Model- but it was:\n'+util.inspect(criteria)
      );
      assert(
        !(criteria instanceof rootrequire('lib/Database')),
        '"criteria" argument SHOULD NOT be an instance of Database- but it was:\n'+util.inspect(criteria)
      );
      assert(
        typeof cb === 'function',
        '"callback" argument should exist, and be a function- instead got:\n'+util.inspect(cb)
      );

      setTimeout(function afterSimulatedLookupDelay () {
        var results = WLFilter(criteria.from, {
          person: require('./person.dataset.fixture'),
          cat: require('./cat.dataset.fixture')
        }, criteria).results;
        return cb(null, results);
      }, 0);
    }
  };
};
