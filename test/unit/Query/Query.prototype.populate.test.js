/**
 * Module dependencies
 */

var assert = require('assert');
var Query = require('root-require')('./lib/Query');
var ORM = require('root-require')('./lib/ORM');



describe('Query', function () {
  describe('.prototype.populate()', function () {
    var q;
    var orm;

    before(function() {
      orm = new ORM();
      q = new Query({orm:orm});
    });

    it('should modify & normalize our Query\'s criteria', function () {
      var q0 = new Query({orm:orm});
      q0.populate('mom');
      assert.equal(q0.criteria.select['*'], true);
      assert.equal(typeof q0.criteria.select.mom, 'object');

      var q1 = new Query({orm:orm});
      q1.populate('friends');
      assert.equal(q0.criteria.select['*'], true);
      assert.equal(typeof q0.criteria.select.friends, 'object');

      var q2 = new Query({orm:orm});
      q2.populate('enemies');
      assert.equal(q0.criteria.select['*'], true);
      assert.equal(typeof q0.criteria.select.enemies, 'object');
    });

    it('should accumulate modifications to Query\'s criteria', function () {
      q = new Query({orm:orm});

      q.populate('mom');
      assert.deepEqual(q.criteria.select, {'*': true, name: false});
      assert.equal(q0.criteria.select['*'], true);
      assert.equal(typeof q0.criteria.select.mom, 'object');

      q.populate('friends');
      assert.equal(q0.criteria.select['*'], true);
      assert.equal(typeof q0.criteria.select.mom, 'object');
      assert.equal(typeof q0.criteria.select.friends, 'object');

      q.populate('enemies');
      assert.equal(q0.criteria.select['*'], true);
      assert.equal(typeof q0.criteria.select.mom, 'object');
      assert.equal(typeof q0.criteria.select.friends, 'object');
      assert.equal(typeof q0.criteria.select.enemies, 'object');
    });

    it('should be chainable', function (){
      q = new Query({orm:orm});

      q.populate('mom')
        .populate('friends')
        .populate('enemies');

      q.populate('enemies');
      assert.equal(q0.criteria.select['*'], true);
      assert.equal(typeof q0.criteria.select.mom, 'object');
      assert.equal(typeof q0.criteria.select.friends, 'object');
      assert.equal(typeof q0.criteria.select.enemies, 'object');
    });

    it('should leave "*" alone if it is already set', function (){
      q = new Query({orm:orm});

      q.pick('id');

      q.populate('mom')
        .populate('friends')
        .populate('enemies');

      q.populate('enemies');
      assert.equal(q0.criteria.select['*'], false);
      assert.equal(typeof q0.criteria.select.mom, 'object');
      assert.equal(typeof q0.criteria.select.friends, 'object');
      assert.equal(typeof q0.criteria.select.enemies, 'object');
    });

  });
});
