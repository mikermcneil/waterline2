/**
 * Module dependencies
 */

var _ = require('lodash');
var WLTransform = require('waterline-criteria');
var Waterline = require('../../');





describe('acceptance: basic usage', function (){

  it('should work with sails-memory on npm', function (done) {

    var orm = Waterline({
      adapters: {
        'sails-memory': buildSimpleRAMAdapter()
      },
      datastores: {
        default: {
          adapter: 'sails-memory'
        }
      },
      cache: {
        datastore: 'default',
        attributes: {}
      }
    });


    var Cache = orm.model('cache');

    Cache.find().exec(console.log);

    done();

  });

});



function buildSimpleRAMAdapter(){
  var data = {};

  return {
    apiVersion: '2.0.0',

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
    create: function (datastore, cid, values, cb){
      data[datastore.identity] = data[datastore.identity] || {};
      data[datastore.identity][cid] = data[datastore.identity][cid] || [];

      data[datastore.identity][cid].push(values);
      cb(null, values);
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

