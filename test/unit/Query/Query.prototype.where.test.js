/**
 * Module dependencies
 */

var assert = require('assert');
var Query = require('root-require')('./lib/Query');
var ORM = require('root-require')('./lib/ORM');



describe('Query', function () {
  describe('.prototype.where()', function () {
    var q;
    var orm;

    before(function() {
      orm = new ORM();
      q = new Query({orm:orm});
    });

    it('should modify & normalize our Query\'s criteria', function () {
      var q0 = new Query({orm:orm});
      q0.where({name: 'ned'});
      assert.deepEqual(q0.criteria.where, {name: 'ned'});

      var q1 = new Query({orm:orm});
      q1.where({age:{'>':25}});
      assert.deepEqual(q1.criteria.where, {age:{'>':25}});

      var q2 = new Query({orm:orm});
      q2.where({profession: 'lord'});
      assert.deepEqual(q2.criteria.where, {profession: 'lord'});
    });

    it('should accumulate modifications to Query\'s criteria', function () {
      q = new Query({orm:orm});

      q.where({name: 'ned'});
      assert.deepEqual(q1.criteria.where, {name: 'ned'});

      q.where({age:{'>':25}});
      assert.deepEqual(q1.criteria.where, {name: 'ned', age:{'>':25}});

      q.where({profession: 'lord'});
      assert.deepEqual(q2.criteria.where, {name: 'ned', age:{'>':25}, profession: 'lord'});
    });

  });
});
