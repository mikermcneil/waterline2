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
      assert.equal(q1.criteria.select['*'], true);
      assert.equal(typeof q1.criteria.select.friends, 'object');

      var q2 = new Query({orm:orm});
      q2.populate('enemies');
      assert.equal(q2.criteria.select['*'], true);
      assert.equal(typeof q2.criteria.select.enemies, 'object');
    });

    it('should accumulate modifications to Query\'s criteria', function () {
      q = new Query({orm:orm});

      q.populate('mom');
      assert.deepEqual(q.criteria.select, {'*': true, name: false});
      assert.equal(q.criteria.select['*'], true);
      assert.equal(typeof q.criteria.select.mom, 'object');

      q.populate('friends');
      assert.equal(q.criteria.select['*'], true);
      assert.equal(typeof q.criteria.select.mom, 'object');
      assert.equal(typeof q.criteria.select.friends, 'object');

      q.populate('enemies');
      assert.equal(q.criteria.select['*'], true);
      assert.equal(typeof q.criteria.select.mom, 'object');
      assert.equal(typeof q.criteria.select.friends, 'object');
      assert.equal(typeof q.criteria.select.enemies, 'object');
    });

    it('should be chainable', function (){
      q = new Query({orm:orm});

      q.populate('mom')
        .populate('friends')
        .populate('enemies');

      q.populate('enemies');
      assert.equal(q.criteria.select['*'], true);
      assert.equal(typeof q.criteria.select.mom, 'object');
      assert.equal(typeof q.criteria.select.friends, 'object');
      assert.equal(typeof q.criteria.select.enemies, 'object');
    });

    it('should leave "*" alone if it is already set', function (){
      q = new Query({orm:orm});

      q.pick('id');

      q.populate('mom')
        .populate('friends')
        .populate('enemies');

      q.populate('enemies');
      assert.equal(q.criteria.select['*'], false);
      assert.equal(typeof q.criteria.select.mom, 'object');
      assert.equal(typeof q.criteria.select.friends, 'object');
      assert.equal(typeof q.criteria.select.enemies, 'object');
    });

    it('should support nested populates using "*.*..." syntax', function (){
      q = new Query({orm:orm});

      q
        // Lookup my mom
        .populate('mom')
        // Lookup my grandma (mom's mom)
        .populate('mom.mom')
        // Lookup my great grandma (mom's mom's mom)
        .populate('mom.mom.mom');

      assert.equal(typeof q.criteria.select.mom, 'object');
      assert.equal(typeof q.criteria.select.mom.select.mom, 'object');
      assert.equal(typeof q.criteria.select.mom.select.mom.select.mom, 'object');

      q
        // Lookup each of my friends
        .populate('friends')
        // Lookup each of my friends' friends
        .populate('friends.friends')
        // Lookup each of my friends' friends' friends
        .populate('friends.friends.friends');

      assert.equal(typeof q.criteria.select.friends, 'object');
      assert.equal(typeof q.criteria.select.friends.select.friends, 'object');
      assert.equal(typeof q.criteria.select.friends.select.friends.select.friends, 'object');

      q
        // Lookup each of my friends
        .populate('friends')
        // Lookup each of my friends' moms
        .populate('friends.mom')
        // Lookup each of my friends' enemies
        .populate('friends.enemies')
        // Lookup each of my friends' moms' enemies
        .populate('friends.mom.enemies');

      assert.equal(typeof q.criteria.select.friends, 'object');
      assert.equal(typeof q.criteria.select.friends.select.mom, 'object');
      assert.equal(typeof q.criteria.select.friends.select.enemies, 'object');
      assert.equal(typeof q.criteria.select.friends.select.mom.select.enemies, 'object');
    });

    it.skip('should supported traversal of a finite directed graph using "**"', function (){
      q = new Query({orm:orm});

      // Look up all my associations, and their associations, and so forth--
      // but only to a reasonable depth (don't infinitely recurse)
      q.populate('**');
      assert.equal(typeof q.criteria.select.mom, 'object');
      assert.equal(typeof q.criteria.select.friends, 'object');
      assert.equal(typeof q.criteria.select.enemies, 'object');

      // Look up all of my mom's associations, and their associations, and so forth--
      // but only to a reasonable depth (don't infinitely recurse)
      q.populate('mom.**');
      assert.equal(typeof q.criteria.select.mom, 'object');
      assert.equal(typeof q.criteria.select.mom.select.mom, 'object');
      assert.equal(typeof q.criteria.select.mom.select.friends, 'object');
      assert.equal(typeof q.criteria.select.mom.select.enemies, 'object');

      // Look up all of my enemies' moms' associations, and their associations,
      // and so forth-- but only to a reasonable depth (don't infinitely recurse)
      q.populate('enemies.mom.**');
      assert.equal(typeof q.criteria.select.enemies.select.mom.select.mom, 'object');
      assert.equal(typeof q.criteria.select.enemies.select.mom.select.friends, 'object');
      assert.equal(typeof q.criteria.select.enemies.select.mom.select.enemies, 'object');
    });

    it.skip('should support indefinite traversal of graph', function (){
      q = new Query({orm:orm});

      // Look up my mom, and her mom, and so forth, until the provided `halt`
      // function returns true (umm eve-us australopithecus?)
      q.populate('mom...', {}, function halt (nextRecord){
        return !nextRecord;
      });
      assert.equal(typeof q.criteria.select.mom, 'object');
      assert.equal(typeof q.criteria.select.mom.halt, 'function');

      // Look up my dad, his mom, and her mom, and so forth, until the
      // provided `halt` function returns true
      q.populate('dad.mom...', {}, function halt (nextRecord){
        return !nextRecord;
      });
      assert.equal(typeof q.criteria.select.mom, 'object');
      assert.equal(typeof q.criteria.select.mom.halt, 'function');
    });

  });
});
