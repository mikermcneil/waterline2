/**
 * Module dependencies
 */

var assert = require('assert');
var ORM = require('../../../lib/ORM');



describe('ORM', function () {
  describe('refresh', function () {

    var orm;
    before(function () {
      orm = new ORM();
    });

    it('should exist and work w/ naive usage', function () {
      var schema = orm.refresh();
      assert(typeof schema === 'object');
    });

    it('should work w/ a few models', function () {
      orm.identifyModel('User', {
        attributes: {}
      });
      var schema = orm.refresh();
      assert(typeof schema === 'object');
      console.log(schema);
    });
  });
});
