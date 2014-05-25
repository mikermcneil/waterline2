/**
 * Module dependencies
 */

var util = require('util');
var assert = require('assert');
var WLTransform = require('waterline-criteria');
var rootrequire = require('root-require');


/**
 * adapter (fixture)
 *
 * Factory which returns the definition of the adapter fixture.
 * @return {Object}
 */

module.exports = function buildAdapter() {

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
        !(criteria instanceof rootrequire('lib/Datastore')),
        '"criteria" argument SHOULD NOT be an instance of Datastore- but it was:\n'+util.inspect(criteria)
      );
      assert(
        typeof cb === 'function',
        '"callback" argument should exist, and be a function- instead got:\n'+util.inspect(cb)
      );

      setTimeout(function afterSimulatedLookupDelay () {
        var results = WLTransform(criteria.from, {
          person: require('./person.dataset'),
          chat: require('./chat.dataset')
        }, criteria).results;
        return cb(null, results);
      }, 0);
    }
  };
};
