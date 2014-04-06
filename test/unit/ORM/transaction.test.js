/**
 * Module dependencies
 */

var assert = require('assert');
var ORM = require('../../../lib/ORM');



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
      });
      assert.throws(function () {
        orm.transaction(function(){});
      });
      assert.throws(function () {
        orm.transaction(User, function(){});
      });


      // Need to specify a transaction function
      assert.throws(function () {
        orm.transaction([]);
      });
      assert.throws(function () {
        orm.transaction(User);
      });
      assert.throws(function () {
        orm.transaction([User]);
      });


      // Strings don't work
      assert.throws(function () {
        orm.transaction(['User']);
      });
      assert.throws(function () {
        orm.transaction('User', function(){});
      });
      assert.throws(function () {
        orm.transaction(['User'], function(){});
      });

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
