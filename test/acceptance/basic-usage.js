/**
 * Module dependencies
 */

var assert = require('assert');
var _ = require('lodash');
var WLTransform = require('waterline-criteria');
var Waterline = require('../../');




describe('acceptance: basic usage', function (){

  it('should work with sails-memory from npm', function (done) {

    var orm = Waterline({
      adapters: {
        'sails-memory': buildSimpleRAMAdapter()
      },
      datastores: {
        default: {
          adapter: 'sails-memory'
        }
      },
      models: {
        cacheEntry: {
          datastore: 'default',
          attributes: {}
        }
      }
    });


    var CacheEntry = orm.model('cacheEntry');

    // Test a create and a findOne.
    CacheEntry.create({
      id: 3
    }).exec(function (err, newCacheEntry) {
      if (err) return done(err);

      // console.log('created...',newCacheEntry);

      CacheEntry.findOne({
        where: {
          id: 3
        }
      }).exec(function (err, cacheEntry) {
        if (err) return done(err);

        assert(_.isObject(cacheEntry));
        assert(!_.isArray(cacheEntry));
        done();
      });
    });

  });

});



function buildSimpleRAMAdapter(){
  var data = {};

  // TODO:
  // set up some kind of `metadata` object that can be
  // used by adapter authors.  In the case of sails-memory and sails-disk,
  // it can also just host the in-memory representation of the dataset.

  return {
    apiVersion: '2.0.0',

    ////////////////////////////////////////////////////////////////////////
    // TODO:
    // Explore setting up some kind of managed connect/disconnect methods
    // (similar to registerConnection() and teardown() in v0.0.0 of
    // the adapter API, but lower-level.  Allows the adapter author to
    // send back a "connection" object in the callback.)
    //
    // Example:
    // connect: function (datastore, metadata, cb) {
    //   data[datastore.identity] = {};
    //   cb();
    // },
    // disconnect: function (datastore, metadata, cb) {
    //   delete data[datastore.identity];
    //   cb();
    // },
    ////////////////////////////////////////////////////////////////////////

    find: function (datastore, cid, criteria, cb){
      data[datastore.identity] = data[datastore.identity] || {};
      data[datastore.identity][cid] = data[datastore.identity][cid] || [];

      var results;
      try {
        results = WLTransform(data[datastore.identity][cid], criteria).results;
        return cb(null, results);
      }
      catch(e) { return cb(e); }
    },
    create: function (datastore, cid, newRecords, cb){
      data[datastore.identity] = data[datastore.identity] || {};
      data[datastore.identity][cid] = data[datastore.identity][cid] || [];

      _.each(newRecords, function(newRecord){
        data[datastore.identity][cid].push(newRecord);
      });

      cb(null, newRecords);
    },
    update: function (datastore, cid, criteria, values, cb){
      data[datastore.identity] = data[datastore.identity] || {};
      data[datastore.identity][cid] = data[datastore.identity][cid] || [];

      var indices;
      try {
        indices = WLTransform(data[datastore.identity][cid], criteria).indices;
      }
      catch(e) { return cb(e); }

      var updated = [];
      _.each(indices, function (i){
        var updatedRecord = _.extend(data[datastore.identity][cid][i], values);
        updated.push(updatedRecord);
      });
      return cb(null, updated);
    },
    destroy: function (datastore, cid, criteria, cb){
      data[datastore.identity] = data[datastore.identity] || {};
      data[datastore.identity][cid] = data[datastore.identity][cid] || [];

      var indices;
      try {
        indices = WLTransform(data[datastore.identity][cid], criteria).indices;
      }
      catch(e) { return cb(e); }

      var destroyed = [];
      _.each(indices, function (record, i) {
        var destroyedRecord = data[datastore.identity][cid].splice(i, 1);
        destroyed.push(removed);
      });
      return cb(null, destroyed);
    }
  };
}

