/**
 * Module dependencies
 */

var assert = require('assert');
var _ = require('lodash');
var Waterline = require('../../');
var WLMemoryAdapter = require('root-require')('standalone/wl-memory.adapter.js');




describe('acceptance: basic usage', function (){

  it('should work with sails-memory from npm', function (done) {

    var orm = Waterline({
      adapters: {
        'sails-memory': WLMemoryAdapter
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


        CacheEntry.update({
          where: {
            id: 3
          }
        }, {
          name: 'rick'
        }).exec(function(err, updatedCacheEntries) {
          if (err) return done(err);

          assert(_.isArray(updatedCacheEntries));
          assert.equal(updatedCacheEntries.length,1);


          CacheEntry.destroy({
            where: {
              id: 3
            }
          }).exec(function (err) {
            if (err) return done(err);

            CacheEntry.find().exec(function (err, cacheEntries) {
              if (err) return done(err);

              assert(_.isArray(cacheEntries));
              assert.equal(cacheEntries.length,0, 'Expected record to be destroyed, but it still exists.');
              done();
            });
          });

        });

      });
    });

  });

});


