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

    it('should NOT work w/ INVALID usage');

    it('should work w/ most minimal valid usage', function (cb) {
      orm.transaction([], function (cb) {
        console.log(arguments);
        cb();
      }).exec(function (err) {
        cb();
      });
    });
  });
});
