/**
 * Module dependencies
 */

var assert = require('assert');
var util = require('util');
var ORM = require('root-require')('lib/ORM');
var QueryHeap = require('root-require')('standalone/QueryHeap');


describe('QueryHeap', function () {
  describe('.prototype.malloc()', function () {

    var heap = new QueryHeap({
      orm: new ORM()
    });

    it('should require the 1st argument (`bufferIdentity`)', function () {
      assert.throws(function () {
        heap.malloc();
      });
    });

    it('should not require the 2nd argument (`options`)', function () {
      assert.doesNotThrow(function () {
        heap.malloc('f00');
      });
    });

    it('should be chainable (i.e. return `this`)', function () {
      var returnVal = heap.malloc('f01');
      assert.equal(returnVal, heap, 'expected return value to === the heap itself, instead got:', util.inspect(returnVal, false, null));
    });

    it('should throw if a buffer w/ the specified identity already exists', function () {
      heap.malloc('f10');
      assert.throws(function () {
        heap.malloc('f10');
      });
    });

    it('should create an entry in `heap._buffers` which is an empty object, even if no options were passed in', function (){
      heap.malloc('f11');
      assert(typeof heap._buffers.f11 === 'object');
    });

    it('should create an entry in `heap._buffers` with the criteria modifiers that were passed in', function (){
      heap.malloc('f100', {
        from: {
          entity: 'model',
          identity: 'bigfoot'
        }
      });

      assert(typeof heap._buffers.f100 === 'object');
      assert(typeof heap._buffers.f100.from === 'object');
      assert(heap._buffers.f100.from.entity === 'model');
      assert(heap._buffers.f100.from.identity === 'bigfoot');
    });

    it('should NOT include unrecognized options in `heap._buffers`', function (){
      heap.malloc('f101', {
        from: {
          entity: 'model',
          identity: 'bigfoot'
        },
        anythingElse: {
          like:'this'
        }
      });

      // Recognized things should still exist
      assert(typeof heap._buffers.f101 === 'object');
      assert(typeof heap._buffers.f101.from === 'object');
      assert(heap._buffers.f101.from.entity === 'model');
      assert(heap._buffers.f101.from.identity === 'bigfoot');

      // But not the weird things
      assert(!heap._buffers.f101.anythingElse);
    });

    it('should default `from` to `undefined`', function (){
      heap.malloc('f110', {});
      assert.equal(heap._buffers.f110.from, undefined);
    });

    it('should default `sort` to `undefined`', function (){
      heap.malloc('f111', {});
      assert.equal(heap._buffers.f111.sort, undefined);
    });

    it('should default `skip` to `undefined`', function (){
      heap.malloc('f1000', {});
      assert.equal(heap._buffers.f1000.skip, undefined);
    });

    it('should default `limit` to `undefined`', function (){
      heap.malloc('f1001', {});
      assert.equal(heap._buffers.f1001.limit, undefined);
    });

    it('should default `records` to `[]`', function (){
      heap.malloc('f1010', {});
      assert.deepEqual(heap._buffers.f1010.records, []);
    });
  });
});
