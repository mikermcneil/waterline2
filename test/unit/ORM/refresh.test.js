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
      orm.identifyModel('Foo');
      orm.identifyModel('Bar', {});
      orm.identifyModel('Baz', { attributes: {} });
      orm.identifyModel({ identity: 'Bazket' });
      orm.identifyModel('Weaving');
      var schema = orm.refresh();
      assert(typeof schema === 'object');
      assert(typeof schema.foo === 'object');
    });

  });
});
