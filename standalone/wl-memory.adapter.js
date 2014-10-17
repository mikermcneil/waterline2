/**
 * Module dependencies
 */

var _ = require('lodash');
var WLTransform = require('waterline-criteria');







module.exports = {
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
  //   global._globalWaterlineRAMDB[datastore.identity] = {};
  //   cb();
  // },
  // disconnect: function (datastore, metadata, cb) {
  //   delete global._globalWaterlineRAMDB[datastore.identity];
  //   cb();
  // },
  ////////////////////////////////////////////////////////////////////////
  // TODO:
  // set up some kind of `metadata` object that can be
  // used by adapter authors.  In the case of sails-memory and sails-disk,
  // it can also just host the in-memory representation of the dataset.


  listCollections: function (datastore, cb){
    global._globalWaterlineRAMDB = global._globalWaterlineRAMDB || {};
    global._globalWaterlineRAMDB[datastore.identity] = global._globalWaterlineRAMDB[datastore.identity] || {};
    cb(null, _.keys(global._globalWaterlineRAMDB[datastore.identity]) || []);
  },
  describe: function (datastore, cid, cb){ cb('todo'); },
  define: function (datastore, cid, modelDef, cb){ cb('todo'); },
  addIndex: function (datastore, indexName, indexDef, cb){ cb('todo'); },
  removeIndex: function (datastore, indexName, cb){ cb('todo'); },
  addField: function (datastore, cid, fieldName, fieldDef, cb){ cb('todo'); },
  removeField: function (datastore, cid, fieldName, cb){ cb('todo'); },
  drop: function (datastore, cid, cb){ cb('todo'); },


  find: function (datastore, cid, criteria, cb){

    global._globalWaterlineRAMDB = global._globalWaterlineRAMDB || {};
    global._globalWaterlineRAMDB[datastore.identity] = global._globalWaterlineRAMDB[datastore.identity] || {};
    global._globalWaterlineRAMDB[datastore.identity][cid] = global._globalWaterlineRAMDB[datastore.identity][cid] || [];

    var results;
    try {
      results = WLTransform(global._globalWaterlineRAMDB[datastore.identity][cid], criteria).results;
      return cb(null, results);
    }
    catch(e) { return cb(e); }
  },

  create: function (datastore, cid, newRecords, cb){
    global._globalWaterlineRAMDB = global._globalWaterlineRAMDB || {};
    global._globalWaterlineRAMDB[datastore.identity] = global._globalWaterlineRAMDB[datastore.identity] || {};
    global._globalWaterlineRAMDB[datastore.identity][cid] = global._globalWaterlineRAMDB[datastore.identity][cid] || [];

    _.each(newRecords, function(newRecord){
      global._globalWaterlineRAMDB[datastore.identity][cid].push(newRecord);
    });

    cb(null, newRecords);
  },

  update: function (datastore, cid, criteria, values, cb){
    global._globalWaterlineRAMDB = global._globalWaterlineRAMDB || {};
    global._globalWaterlineRAMDB[datastore.identity] = global._globalWaterlineRAMDB[datastore.identity] || {};
    global._globalWaterlineRAMDB[datastore.identity][cid] = global._globalWaterlineRAMDB[datastore.identity][cid] || [];

    var indices;
    try {
      indices = WLTransform(global._globalWaterlineRAMDB[datastore.identity][cid], criteria).indices;
    }
    catch(e) { return cb(e); }

    var updated = [];
    _.each(indices, function (i){
      var updatedRecord = _.extend(global._globalWaterlineRAMDB[datastore.identity][cid][i], values);
      updated.push(updatedRecord);
    });
    return cb(null, updated);
  },

  destroy: function (datastore, cid, criteria, cb){
    global._globalWaterlineRAMDB = global._globalWaterlineRAMDB || {};
    global._globalWaterlineRAMDB[datastore.identity] = global._globalWaterlineRAMDB[datastore.identity] || {};
    global._globalWaterlineRAMDB[datastore.identity][cid] = global._globalWaterlineRAMDB[datastore.identity][cid] || [];

    var indices;
    try {
      indices = WLTransform(global._globalWaterlineRAMDB[datastore.identity][cid], criteria).indices;
    }
    catch(e) { return cb(e); }

    var destroyed = [];
    _.each(indices, function (record, i) {
      var destroyedRecord = global._globalWaterlineRAMDB[datastore.identity][cid].splice(i, 1);
      destroyed.push(destroyedRecord);
    });
    return cb(null, destroyed);
  }
};
