/**
 * Module dependencies
 */

var assert = require('assert');
var Query = require('root-require')('./lib/Query');
var ORM = require('root-require')('./lib/ORM');



describe('Query', function () {
  describe('.prototype.pick()', function () {
    var q;
    var orm;

    before(function() {
      orm = new ORM();
      q = new Query({orm:orm});
    });

    it('should modify & normalize our Query\'s criteria', function () {
      var q0 = new Query({orm:orm});
      q0.pick({name: true});
      assert.deepEqual(q0.criteria.select, {'*': false, name: true});

      var q1 = new Query({orm:orm});
      q1.pick({age:true});
      assert.deepEqual(q1.criteria.select, {'*': false, age:true});

      var q2 = new Query({orm:orm});
      q2.pick({profession: true});
      assert.deepEqual(q2.criteria.select, {'*': false, profession: true});
    });

    it('should accumulate modifications to Query\'s criteria', function () {
      q = new Query({orm:orm});

      q.pick({name: true});
      assert.deepEqual(q.criteria.select, {'*': false, name: true});

      q.pick({age:true});
      assert.deepEqual(q.criteria.select, {'*': false, name: true, age:true});

      q.pick({profession: true});
      assert.deepEqual(q.criteria.select, {'*': false, name: true, age:true, profession: true});
    });

    it('should be chainable', function (){
      q = new Query({orm:orm});

      q.pick('name')
        .pick('age')
        .pick('profession');

      assert.deepEqual(q.criteria.select, {'*': false, name: true, age:true, profession: true});

    });

  });
});
