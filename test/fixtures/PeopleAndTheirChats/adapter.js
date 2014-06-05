/**
 * Module dependencies
 */

var util = require('util');
var assert = require('assert');
var _ = require('lodash');
var WLTransform = require('waterline-criteria');
var rootrequire = require('root-require');
var Waterline = rootrequire('./');

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
        !(Waterline.Relation.isRelation(criteria)),
        '"criteria" argument SHOULD NOT be an instance of Relation- but it was:\n'+util.inspect(criteria)
      );
      assert(
        !(Waterline.Datastore.isDatastore(criteria)),
        '"criteria" argument SHOULD NOT be an instance of Datastore- but it was:\n'+util.inspect(criteria)
      );
      assert(
        typeof cb === 'function',
        '"callback" argument should exist, and be a function- instead got:\n'+util.inspect(cb)
      );

      console.log('[[in adapter]] find from '+criteria.from.identity+':', criteria);

      // console.log('In adapter, arguments === ', arguments);
      setTimeout(function afterSimulatedLookupDelay () {
        var results = WLTransform(criteria.from.identity, {
          person: require('./person.dataset'),
          chat: require('./chat.dataset'),
          chatperson: require('./chatperson.junction.dataset'),
          share: require('./share.dataset')
        }, criteria).results;
        if (criteria.from.identity === 'share') {
          console.log('results === ',results);
        }
        else console.log('result pk values === ',_.pluck(results, 'id'));
        return cb(null, results);
      }, 0);
    }
  };
};
