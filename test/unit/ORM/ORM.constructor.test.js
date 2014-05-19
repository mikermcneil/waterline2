/**
 * Module dependencies
 */

var assert = require('assert');
var ORM = require('../../../lib/ORM');



describe('ORM', function () {
  describe('.constructor', function () {
    var orm;

    it('should construct an ORM', function () {
      orm = new ORM();
    });

    it('should have models, and adapters, and databases', function () {
      assert(orm.adapters);
      assert(orm.databases);
      assert(orm.models);
    });
  });
});
