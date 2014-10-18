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
    var collections = GlobalRAMStore.getDatabase(datastore.identity).collections || [];
    return cb(null, collections);
  },
  describe: function (datastore, cid, cb){
    var fields = GlobalRAMStore.getCollection(datastore.identity, cid).fields;
    return cb(null, fields);
  },
  define: function (datastore, cid, fields, cb){
    var db = GlobalRAMStore.getDatabase(datastore.identity);
    db.collections[cid] = {
      meta: {},
      fields: fields,
      records: []
    };
    return cb();
  },

  addIndex: function (datastore, cid, iid, indexDef, cb){
    var collection = GlobalRAMStore.getCollection(datastore.identity, cid);
    collection.meta.indices = collection.meta.indices || [];
    collection.meta.indices.push({
      id: iid,
      // example `fields`:  ['firstName', 'lastName']
      fields: indexDef.fields,
      unique: _.isUndefined(indexDef.unique) ? false : indexDef.unique
    });
    return cb();
  },

  removeIndex: function (datastore, cid, iid, cb){
    var collection = GlobalRAMStore.getCollection(datastore.identity, cid);
    collection.meta.indices = collection.meta.indices || [];
    _.remove(collection.meta.indices, {
      id: iid
    });
    return cb();
  },

  // listIndexes: function (datastore, cb){
  //   TODO: in WL core, make an alias for listIndexes which automatically fwds
  // },
  listIndices: function (datastore, cb){
    var collection = GlobalRAMStore.getCollection(datastore.identity, cid);
    collection.meta.indices = collection.meta.indices || [];
    return cb(null, collection.meta.indices);
  },

  addField: function (datastore, cid, fieldName, fieldDef, cb){
    var db = GlobalRAMStore.getDatabase(datastore.identity);
    db.collections[cid].fields[fieldName] = fieldDef;
    return cb();
  },

  removeField: function (datastore, cid, fieldName, cb){
    var db = GlobalRAMStore.getDatabase(datastore.identity);
    delete db.collections[cid].fields[fieldName];
    return cb();
  },

  drop: function (datastore, cid, cb){
    var db = GlobalRAMStore.getDatabase(datastore.identity);
    delete db.collections[cid];
    return cb();
  },


  find: function (datastore, cid, criteria, cb){

    var allRecords = GlobalRAMStore.getCollection(datastore.identity, cid).records;

    var results;
    try {
      results = WLTransform(allRecords, criteria).results;
      return cb(null, results);
    }
    catch(e) { return cb(e); }
  },

  create: function (datastore, cid, newRecords, cb){
    var allRecords = GlobalRAMStore.getCollection(datastore.identity, cid).records;

    _.each(newRecords, function(newRecord){
      allRecords.push(newRecord);
    });

    cb(null, newRecords);
  },

  update: function (datastore, cid, criteria, values, cb){
    var allRecords = GlobalRAMStore.getCollection(datastore.identity, cid).records;

    var indices;
    try {
      indices = WLTransform(allRecords, criteria).indices;
    }
    catch(e) { return cb(e); }

    var updated = [];
    _.each(indices, function (i){
      allRecords[i] = _.extend(allRecords[i], values);
      updated.push(allRecords[i]);
    });
    return cb(null, updated);
  },


  destroy: function (datastore, cid, criteria, cb){
    var allRecords = GlobalRAMStore.getCollection(datastore.identity, cid).records;

    var indices;
    try {
      indices = WLTransform(allRecords, criteria).indices;
    }
    catch(e) { return cb(e); }

    var destroyed = [];
    _.each(indices, function (record, i) {
      var destroyedRecord = allRecords.splice(i, 1);
      destroyed.push(destroyedRecord);
    });
    return cb(null, destroyed);
  }
};






// Here's an example of the data structure implemented by the global RAM
// database contained in this module:
// ====================================================================
// global._globalWaterlineRAMDB = {
//   meta: {},
//   datastores: {
//     '*': {
//       meta: {},
//       collections: {
//         '*': {
//           meta: {},
//           fields: {},
//           records: [{...}, {...}]
//         }
//       }
//     }
//   }
// };
// ====================================================================

var GlobalRAMStore = {};
GlobalRAMStore.getDatabase = function(datastoreIdentity) {
  global._globalWaterlineRAMDB = global._globalWaterlineRAMDB || {};
  global._globalWaterlineRAMDB.meta = global._globalWaterlineRAMDB.meta || {};
  global._globalWaterlineRAMDB.datastores = global._globalWaterlineRAMDB.datastores || {};
  global._globalWaterlineRAMDB.datastores[datastoreIdentity] = global._globalWaterlineRAMDB.datastores[datastoreIdentity] || {};
  global._globalWaterlineRAMDB.datastores[datastoreIdentity].meta = global._globalWaterlineRAMDB.datastores[datastoreIdentity].meta || {};
  global._globalWaterlineRAMDB.datastores[datastoreIdentity].collections = global._globalWaterlineRAMDB.datastores[datastoreIdentity].collections || {};
  return global._globalWaterlineRAMDB.datastores[datastoreIdentity];
};
GlobalRAMStore.getCollection = function(datastoreIdentity, cid) {
  GlobalRAMStore.getDatabase(datastoreIdentity);
  global._globalWaterlineRAMDB.datastores[datastoreIdentity].collections[cid] = global._globalWaterlineRAMDB.datastores[datastoreIdentity].collections[cid] || {};
  global._globalWaterlineRAMDB.datastores[datastoreIdentity].collections[cid].records = global._globalWaterlineRAMDB.datastores[datastoreIdentity].collections[cid].records || [];
  global._globalWaterlineRAMDB.datastores[datastoreIdentity].collections[cid].fields = global._globalWaterlineRAMDB.datastores[datastoreIdentity].collections[cid].fields || {};
  global._globalWaterlineRAMDB.datastores[datastoreIdentity].collections[cid].meta = global._globalWaterlineRAMDB.datastores[datastoreIdentity].collections[cid].meta || {};
  return global._globalWaterlineRAMDB.datastores[datastoreIdentity].collections[cid];
};

