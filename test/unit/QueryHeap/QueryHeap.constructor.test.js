/**
 * Module dependencies
 */

var assert = require('assert');
var ORM = require('root-require')('lib/ORM');
var QueryHeap = require('root-require')('lib/Query/engine/QueryHeap');


describe('QueryHeap', function () {
  describe('.constructor', function () {
    var heap;

    it('should construct a QueryHeap', function () {
      heap = new QueryHeap({
        orm: new ORM()
      });
    });

    it('should refuse to construct a QueryHeap if no valid `orm` option is passed in', function () {
      assert.throws(function () {
        heap = new QueryHeap();
      });
    });

    it('should have non-enumerable property: `orm`', function () {
      assert(!heap.propertyIsEnumerable('orm'));
    });

    it('should have non-enumerable property: `_models`', function () {
      assert(!heap.propertyIsEnumerable('_models'));
    });

    it('should have a `get()` method', function () {
      assert(typeof heap.get === 'function');
    });

    it('should have a `push()` method', function () {
      assert(typeof heap.push === 'function');
    });

    it('should have a `wipe()` method', function () {
      assert(typeof heap.wipe === 'function');
    });


  });
});
