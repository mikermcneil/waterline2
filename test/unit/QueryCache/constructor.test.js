/**
 * Module dependencies
 */

var assert = require('assert');
var QueryCache = require('root-require')('./lib/Query/engine/QueryCache');
var ORM = require('root-require')('./lib/ORM');


describe('QueryCache', function () {
  describe('constructor', function () {
    var cache;

    it('should construct a QueryCache', function () {
      cache = new QueryCache({
        orm: new ORM()
      });
    });

    it('should refuse to construct a QueryCache if no valid `orm` option is passed in', function () {
      assert.throws(function () {
        cache = new QueryCache();
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
