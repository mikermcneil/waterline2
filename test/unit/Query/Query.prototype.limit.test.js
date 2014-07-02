/**
 * Module dependencies
 */

var assert = require('assert');
var Query = require('root-require')('./lib/Query');
var ORM = require('root-require')('./lib/ORM');



describe('Query.prototype', function () {
  describe('.limit()', function () {
    var q;
    var orm;

    before(function() {
      orm = new ORM();
      q = new Query({orm:orm});
    });

    it('should correctly modify our Query\'s criteria', function () {
      q.limit(105);
      assert.equal(q.criteria.limit, 105);
    });

    it('should be idempotent', function () {
      q.limit(83);
      assert.equal(q.criteria.limit, 83);
    });

  });
});
