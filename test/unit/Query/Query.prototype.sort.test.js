/**
 * Module dependencies
 */

var assert = require('assert');
var Query = require('root-require')('./lib/Query');
var ORM = require('root-require')('./lib/ORM');



describe('Query', function () {
  describe('.prototype.sort()', function () {
    var q;
    var orm;

    before(function() {
      orm = new ORM();
      q = new Query({orm:orm});
    });

    it('should modify & normalize our Query\'s criteria', function () {
      var q0 = new Query({orm:orm});
      q0.sort({id: -1});
      assert.deepEqual(q0.criteria.sort, {id: -1});

      var q1 = new Query({orm:orm});
      q1.sort({name: 1, id: -1});
      assert.deepEqual(q1.criteria.sort, {name: 1, id: -1});

      var q2 = new Query({orm:orm});
      q2.sort('age ASC');
      assert.deepEqual(q2.criteria.sort, {age: 1});
    });

    it('should accumulate modifications to Query\'s criteria', function () {
      q = new Query({orm:orm});

      q.sort({id: -1});
      assert.deepEqual(q1.criteria.sort, {id: -1});

      q.sort({name: 1, id: -1});
      assert.deepEqual(q1.criteria.sort, {name: 1, id: -1});

      q.sort('age ASC');
      assert.deepEqual(q2.criteria.sort, {name:1, id: -1, age: 1});
    });

  });
});
