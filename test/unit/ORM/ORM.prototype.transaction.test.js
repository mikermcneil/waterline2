/**
 * Module dependencies
 */

var assert = require('assert');
var _ = require('lodash');
var ORM = require('../../../lib/ORM');
var WLEntity = require('../../../util/WLEntity');




describe('ORM', function () {
  describe('.prototype.transaction()', function () {

    var orm;
    var User, Pet, Purchase, Location;

    before(function () {
      orm = new ORM();

      orm.identifyModel('User');
      orm.identifyModel('Pet');
      orm.identifyModel('Purchase');
      orm.identifyModel('Location');

      orm.identifyDatastore('extremely enterprise thing');

      orm.refresh();

      // Expose models via closure to make testing easier
      User = orm.model('user');
      Pet = orm.model('pet');
      Purchase = orm.model('purchase');
      Location = orm.model('location');
    });


    it('should exist', function () {
      assert(typeof orm === 'object');
      assert(typeof orm.transaction === 'function');
    });

    it('should NOT work w/ INVALID usage', function () {

      // Need to specify an array of Models
      assert.throws(function () {
        orm.transaction();
      }, 'Should throw when missing array of Model instances');
      assert.throws(function () {
        orm.transaction(function(){});
      }, 'Should throw when missing array of Model instances');
      assert.throws(function () {
        orm.transaction(User, function(){});
      }, 'Should throw when missing array of Model instances');


      // Need to specify a transaction function
      assert.throws(function () {
        orm.transaction([]);
      }, 'Should throw when missing transaction function');
      assert.throws(function () {
        orm.transaction(User);
      }, 'Should throw when missing transaction function');
      assert.throws(function () {
        orm.transaction([User]);
      }, 'Should throw when missing transaction function');


      // Strings don't work - they need to be actual Model instances
      assert.throws(function () {
        orm.transaction(['User']);
      }, 'Should throw if strings are used instead of actual Model instances');
      assert.throws(function () {
        orm.transaction('User', function(){});
      }, 'Should throw if strings are used instead of actual Model instances');
      assert.throws(function () {
        orm.transaction(['User'], function(){});
      }, 'Should throw if strings are used instead of actual Model instances');
    });


    it('should work w/ most minimal valid usage', function (done) {
      orm.transaction([], function start (cb) {
        cb();
      }).exec(function finish (err) {
        done(err);
      });
    });


    it('should work w/ valid usage', function (done) {
      orm.transaction([Pet], function start (Pet, cb) {
        cb();
      }).exec(function finish (err) {
        done(err);
      });
    });

    it('should work w/ some more complex, real-world-ish usage', function (done) {
      orm.transaction([User, Pet, Location], function start (User, Pet, Location, cb) {
        setTimeout(cb, 50);
      }).exec(function finish (err) {
        done(err);
      });
    });


    it('should work when we give it everything we\'ve got', function (done) {
      orm.transaction([Pet, User, Location, Purchase], function start (Pet, User, Location, Purchase, cb) {
        setTimeout(cb, 150);
      }).exec(function finish (err) {
        done(err);
      });
    });

  });
});
