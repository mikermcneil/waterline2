/**
 * Module dependencies
 */

var assert = require('assert');
var Query = require('root-require')('./lib/Query');
var ORM = require('root-require')('./lib/ORM');



describe('Query', function () {
  describe('.prototype.skip()', function () {
    var q;
    var orm;

    before(function() {
      orm = new ORM();
      q = new Query({orm:orm});
    });

    it('should correctly modify our Query\'s criteria', function () {
      q.skip(105);
      assert.equal(q.criteria.skip, 105);
    });

    it('should be idempotent', function () {
      q.skip(83);
      assert.equal(q.criteria.skip, 83);
    });

  });
});
