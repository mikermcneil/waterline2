/**
 * Module dependencies
 */

var assert = require('assert');
var ORM = require('../../../lib/ORM');
var _ = require('lodash');


describe('ORM', function () {
  describe('transaction', function () {

    var orm;
    before(function () {
      orm = new ORM();

      orm.identifyModel('User');
      orm.identifyModel('Pet');
      orm.identifyModel('Purchase');
      orm.identifyModel('Location');

      orm.identifyDatabase('extremely enterprise thing');

      orm.refresh();
    });


    it('should exist', function () {
      assert(typeof orm === 'object');
      assert(typeof orm.transaction === 'function');
    });

    it('should NOT work w/ INVALID usage', function () {

      var User = _.find(orm.models, {identity: 'user'});

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
  });
});
