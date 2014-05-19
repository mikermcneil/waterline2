/**
 * Module dependencies
 */

var assert = require('assert');
var QueryHeap = require('root-require')('./lib/Query/engine/QueryCache');
var ORM = require('root-require')('./lib/ORM');


describe('QueryHeap', function () {
  describe('.constructor', function () {
    var cache;

    it('should construct a QueryHeap', function () {
      cache = new QueryHeap({
        orm: new ORM()
      });
    });

    it('should refuse to construct a QueryHeap if no valid `orm` option is passed in', function () {
      assert.throws(function () {
        cache = new QueryHeap();
      });
    });

    it('should have non-enumerable property: `orm`', function () {
      assert(!cache.propertyIsEnumerable('orm'));
    });

    it('should have non-enumerable property: `_models`', function () {
      assert(!cache.propertyIsEnumerable('_models'));
    });

    it('should have a `get()` method', function () {
      assert(typeof cache.get === 'function');
    });

    it('should have a `push()` method', function () {
      assert(typeof cache.push === 'function');
    });

    it('should have a `wipe()` method', function () {
      assert(typeof cache.wipe === 'function');
    });


  });
});
