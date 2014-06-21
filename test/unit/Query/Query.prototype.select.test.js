/**
 * Module dependencies
 */

var assert = require('assert');
var Query = require('root-require')('./lib/Query');
var ORM = require('root-require')('./lib/ORM');



describe('Query', function () {
  describe('.prototype.select()', function () {
    var q;
    var orm;

    before(function() {
      orm = new ORM();
      q = new Query({orm:orm});
    });

    it('should modify & normalize our Query\'s criteria', function () {
      var q0 = new Query({orm:orm});
      q0.select({name: true});
      assert.deepEqual(q0.criteria.select, {'*': false, name: true});

      var q1 = new Query({orm:orm});
      q1.select({age:true});
      assert.deepEqual(q1.criteria.select, {'*': false, age:true});

      var q2 = new Query({orm:orm});
      q2.select({profession: true});
      assert.deepEqual(q2.criteria.select, {'*': false, profession: true});
    });

    it('should accumulate modifications to Query\'s criteria', function () {
      q = new Query({orm:orm});

      q.select({name: true});
      assert.deepEqual(q.criteria.select, {'*': false, name: true});

      q.select({age:true});
      assert.deepEqual(q.criteria.select, {'*': false, name: true, age:true});

      q.select({profession: true});
      assert.deepEqual(q.criteria.select, {'*': false, name: true, age:true, profession: true});
    });

    it('should be chainable', function (){
      q = new Query({orm:orm});

      q.select('name')
        .select('age')
        .select('profession');

      assert.deepEqual(q.criteria.select, {'*': false, name: true, age:true, profession: true});

    });

  });
});
