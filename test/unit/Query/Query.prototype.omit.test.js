/**
 * Module dependencies
 */

var assert = require('assert');
var Query = require('root-require')('./lib/Query');
var ORM = require('root-require')('./lib/ORM');



describe('Query.prototype', function () {
  describe('.omit()', function () {
    var q;
    var orm;

    before(function() {
      orm = new ORM();
      q = new Query({orm:orm});
    });

    it('should modify & normalize our Query\'s criteria', function () {
      var q0 = new Query({orm:orm});
      q0.omit('name');
      assert.deepEqual(q0.criteria.select, {'*': true, name: false});

      var q1 = new Query({orm:orm});
      q1.omit('age');
      assert.deepEqual(q1.criteria.select, {'*': true, age: false});

      var q2 = new Query({orm:orm});
      q2.omit('profession');
      assert.deepEqual(q2.criteria.select, {'*': true, profession: false});
    });

    it('should accumulate modifications to Query\'s criteria', function () {
      q = new Query({orm:orm});

      q.omit('name');
      assert.deepEqual(q.criteria.select, {'*': true, name: false});

      q.omit('age');
      assert.deepEqual(q.criteria.select, {'*': true, name: false, age:false});

      q.omit('profession');
      assert.deepEqual(q.criteria.select, {'*': true, name: false, age:false, profession: false});
    });

    it('should be chainable', function (){
      q = new Query({orm:orm});

      q.omit('name')
        .omit('age')
        .omit('profession');

      assert.deepEqual(q.criteria.select, {'*': true, name: false, age:false, profession: false});

    });

  });
});
