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

    // it('should exist and work w/ naive usage', function () {
    //   var ontology = orm.refresh();
    //   assert(typeof ontology === 'object');
    // });

    it('should work w/ a few models', function () {
      orm.identifyModel('User', {
        attributes: {}
      });
      var ontology = orm.refresh();
      assert(typeof ontology === 'object');
    });
  });
});
