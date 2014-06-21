/**
 * Module dependencies
 */

var assert = require('assert');
var Query = require('root-require')('./lib/Query');
var ORM = require('root-require')('./lib/ORM');



describe('Query', function () {
  describe('.prototype.paginate()', function () {
    var q;
    var orm;

    before(function() {
      orm = new ORM();
      q = new Query({orm:orm});
    });

    it('should correctly modify our Query\'s criteria', function () {
      q.paginate(2, 30);
      assert.equal(q.criteria.skip, 60);
      assert.equal(q.criteria.limit, 30);
    });

    it('should be idempotent', function () {
      q.paginate(0, 83);
      assert.equal(q.criteria.skip, 0);
      assert.equal(q.criteria.limit, 83);

      q.paginate(1, 83);
      assert.equal(q.criteria.skip, 83);
      assert.equal(q.criteria.limit, 83);
    });

  });
});
