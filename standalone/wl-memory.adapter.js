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
  //   global._globalWaterlineRAMDB.datastores[datastore.identity] = {};
  //   cb();
  // },
  // disconnect: function (datastore, metadata, cb) {
  //   delete global._globalWaterlineRAMDB.datastores[datastore.identity];
  //   cb();
  // },
  ////////////////////////////////////////////////////////////////////////
  // TODO:
  // set up some kind of `metadata` object that can be
  // used by adapter authors.  In the case of sails-memory and sails-disk,
  // it can also just host the in-memory representation of the dataset.


  listCollections: function (datastore, cb){
    global._globalWaterlineRAMDB = global._globalWaterlineRAMDB || {};
    global._globalWaterlineRAMDB.meta = global._globalWaterlineRAMDB.meta || {};
    global._globalWaterlineRAMDB.datastores = global._globalWaterlineRAMDB.datastores || {};
    global._globalWaterlineRAMDB.datastores[datastore.identity] = global._globalWaterlineRAMDB.datastores[datastore.identity] || {};
    global._globalWaterlineRAMDB.datastores[datastore.identity].meta = global._globalWaterlineRAMDB.datastores[datastore.identity].meta || {};
    global._globalWaterlineRAMDB.datastores[datastore.identity].collections = global._globalWaterlineRAMDB.datastores[datastore.identity].collections || {};
    cb(null, _.keys(global._globalWaterlineRAMDB.datastores[datastore.identity].collections) || []);
  },
  describe: function (datastore, cid, cb){
    global._globalWaterlineRAMDB = global._globalWaterlineRAMDB || {};
    global._globalWaterlineRAMDB.meta = global._globalWaterlineRAMDB.meta || {};
    global._globalWaterlineRAMDB.datastores = global._globalWaterlineRAMDB.datastores || {};
    global._globalWaterlineRAMDB.datastores[datastore.identity] = global._globalWaterlineRAMDB.datastores[datastore.identity] || {};
    global._globalWaterlineRAMDB.datastores[datastore.identity].meta = global._globalWaterlineRAMDB.datastores[datastore.identity].meta || {};
    global._globalWaterlineRAMDB.datastores[datastore.identity].collections = global._globalWaterlineRAMDB.datastores[datastore.identity].collections || {};
    global._globalWaterlineRAMDB.datastores[datastore.identity].collections[cid] = global._globalWaterlineRAMDB.datastores[datastore.identity].collections[cid] || {};
    global._globalWaterlineRAMDB.datastores[datastore.identity].collections[cid].records = global._globalWaterlineRAMDB.datastores[datastore.identity].collections[cid].records || [];
    global._globalWaterlineRAMDB.datastores[datastore.identity].collections[cid].fields = global._globalWaterlineRAMDB.datastores[datastore.identity].collections[cid].fields || [];
    global._globalWaterlineRAMDB.datastores[datastore.identity].collections[cid].meta = global._globalWaterlineRAMDB.datastores[datastore.identity].collections[cid].meta || {};
    cb(null, global._globalWaterlineRAMDB.datastores[datastore.identity].collections[cid].fields);
  },
  define: function (datastore, cid, attributes, cb){
    cb('todo');
  },
  addIndex: function (datastore, indexName, indexDef, cb){ cb('todo'); },
  removeIndex: function (datastore, indexName, cb){ cb('todo'); },
  addField: function (datastore, cid, fieldName, fieldDef, cb){ cb('todo'); },
  removeField: function (datastore, cid, fieldName, cb){ cb('todo'); },
  drop: function (datastore, cid, cb){ cb('todo'); },


  find: function (datastore, cid, criteria, cb){

    global._globalWaterlineRAMDB = global._globalWaterlineRAMDB || {};
    global._globalWaterlineRAMDB.meta = global._globalWaterlineRAMDB.meta || {};
    global._globalWaterlineRAMDB.datastores = global._globalWaterlineRAMDB.datastores || {};
    global._globalWaterlineRAMDB.datastores[datastore.identity] = global._globalWaterlineRAMDB.datastores[datastore.identity] || {};
    global._globalWaterlineRAMDB.datastores[datastore.identity].meta = global._globalWaterlineRAMDB.datastores[datastore.identity].meta || {};
    global._globalWaterlineRAMDB.datastores[datastore.identity].collections = global._globalWaterlineRAMDB.datastores[datastore.identity].collections || {};
    global._globalWaterlineRAMDB.datastores[datastore.identity].collections[cid] = global._globalWaterlineRAMDB.datastores[datastore.identity].collections[cid] || {};
    global._globalWaterlineRAMDB.datastores[datastore.identity].collections[cid].records = global._globalWaterlineRAMDB.datastores[datastore.identity].collections[cid].records || [];
    global._globalWaterlineRAMDB.datastores[datastore.identity].collections[cid].fields = global._globalWaterlineRAMDB.datastores[datastore.identity].collections[cid].fields || [];
    global._globalWaterlineRAMDB.datastores[datastore.identity].collections[cid].meta = global._globalWaterlineRAMDB.datastores[datastore.identity].collections[cid].meta || {};

    var results;
    try {
      results = WLTransform(global._globalWaterlineRAMDB.datastores[datastore.identity].collections[cid].records, criteria).results;
      return cb(null, results);
    }
    catch(e) { return cb(e); }
  },

  create: function (datastore, cid, newRecords, cb){
    global._globalWaterlineRAMDB = global._globalWaterlineRAMDB || {};
    global._globalWaterlineRAMDB.meta = global._globalWaterlineRAMDB.meta || {};
    global._globalWaterlineRAMDB.datastores = global._globalWaterlineRAMDB.datastores || {};
    global._globalWaterlineRAMDB.datastores[datastore.identity] = global._globalWaterlineRAMDB.datastores[datastore.identity] || {};
    global._globalWaterlineRAMDB.datastores[datastore.identity].meta = global._globalWaterlineRAMDB.datastores[datastore.identity].meta || {};
    global._globalWaterlineRAMDB.datastores[datastore.identity].collections = global._globalWaterlineRAMDB.datastores[datastore.identity].collections || {};
    global._globalWaterlineRAMDB.datastores[datastore.identity].collections[cid] = global._globalWaterlineRAMDB.datastores[datastore.identity].collections[cid] || {};
    global._globalWaterlineRAMDB.datastores[datastore.identity].collections[cid].records = global._globalWaterlineRAMDB.datastores[datastore.identity].collections[cid].records || [];
    global._globalWaterlineRAMDB.datastores[datastore.identity].collections[cid].fields = global._globalWaterlineRAMDB.datastores[datastore.identity].collections[cid].fields || [];
    global._globalWaterlineRAMDB.datastores[datastore.identity].collections[cid].meta = global._globalWaterlineRAMDB.datastores[datastore.identity].collections[cid].meta || {};

    _.each(newRecords, function(newRecord){
      global._globalWaterlineRAMDB.datastores[datastore.identity].collections[cid].records.push(newRecord);
    });

    cb(null, newRecords);
  },

  update: function (datastore, cid, criteria, values, cb){
    global._globalWaterlineRAMDB = global._globalWaterlineRAMDB || {};
    global._globalWaterlineRAMDB.meta = global._globalWaterlineRAMDB.meta || {};
    global._globalWaterlineRAMDB.datastores = global._globalWaterlineRAMDB.datastores || {};
    global._globalWaterlineRAMDB.datastores[datastore.identity] = global._globalWaterlineRAMDB.datastores[datastore.identity] || {};
    global._globalWaterlineRAMDB.datastores[datastore.identity].meta = global._globalWaterlineRAMDB.datastores[datastore.identity].meta || {};
    global._globalWaterlineRAMDB.datastores[datastore.identity].collections = global._globalWaterlineRAMDB.datastores[datastore.identity].collections || {};
    global._globalWaterlineRAMDB.datastores[datastore.identity].collections[cid] = global._globalWaterlineRAMDB.datastores[datastore.identity].collections[cid] || {};
    global._globalWaterlineRAMDB.datastores[datastore.identity].collections[cid].records = global._globalWaterlineRAMDB.datastores[datastore.identity].collections[cid].records || [];
    global._globalWaterlineRAMDB.datastores[datastore.identity].collections[cid].fields = global._globalWaterlineRAMDB.datastores[datastore.identity].collections[cid].fields || [];
    global._globalWaterlineRAMDB.datastores[datastore.identity].collections[cid].meta = global._globalWaterlineRAMDB.datastores[datastore.identity].collections[cid].meta || {};

    var indices;
    try {
      indices = WLTransform(global._globalWaterlineRAMDB.datastores[datastore.identity].collections[cid].records, criteria).indices;
    }
    catch(e) { return cb(e); }

    var updated = [];
    _.each(indices, function (i){
      var updatedRecord = _.extend(global._globalWaterlineRAMDB.datastores[datastore.identity].collections[cid].records[i], values);
      updated.push(updatedRecord);
    });
    return cb(null, updated);
  },


  destroy: function (datastore, cid, criteria, cb){
    global._globalWaterlineRAMDB = global._globalWaterlineRAMDB || {};
    global._globalWaterlineRAMDB.meta = global._globalWaterlineRAMDB.meta || {};
    global._globalWaterlineRAMDB.datastores = global._globalWaterlineRAMDB.datastores || {};
    global._globalWaterlineRAMDB.datastores[datastore.identity] = global._globalWaterlineRAMDB.datastores[datastore.identity] || {};
    global._globalWaterlineRAMDB.datastores[datastore.identity].meta = global._globalWaterlineRAMDB.datastores[datastore.identity].meta || {};
    global._globalWaterlineRAMDB.datastores[datastore.identity].collections = global._globalWaterlineRAMDB.datastores[datastore.identity].collections || {};
    global._globalWaterlineRAMDB.datastores[datastore.identity].collections[cid] = global._globalWaterlineRAMDB.datastores[datastore.identity].collections[cid] || {};
    global._globalWaterlineRAMDB.datastores[datastore.identity].collections[cid].records = global._globalWaterlineRAMDB.datastores[datastore.identity].collections[cid].records || [];
    global._globalWaterlineRAMDB.datastores[datastore.identity].collections[cid].fields = global._globalWaterlineRAMDB.datastores[datastore.identity].collections[cid].fields || [];
    global._globalWaterlineRAMDB.datastores[datastore.identity].collections[cid].meta = global._globalWaterlineRAMDB.datastores[datastore.identity].collections[cid].meta || {};

    var indices;
    try {
      indices = WLTransform(global._globalWaterlineRAMDB.datastores[datastore.identity].collections[cid].records, criteria).indices;
    }
    catch(e) { return cb(e); }

    var destroyed = [];
    _.each(indices, function (record, i) {
      var destroyedRecord = global._globalWaterlineRAMDB.datastores[datastore.identity].collections[cid].records.splice(i, 1);
      destroyed.push(destroyedRecord);
    });
    return cb(null, destroyed);
  }
};
