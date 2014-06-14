/**
 * Module dependencies
 */

var assert = require('assert');
var util = require('util');
var ORM = require('root-require')('lib/ORM');
var QueryHeap = require('root-require')('standalone/QueryHeap');


describe('QueryHeap', function () {
  describe('.prototype.get()', function () {

    var heap;

    before(function (){
      heap = new QueryHeap({
        orm: new ORM()
      });
    });

    it('should require the 1st argument (`bufferIdentity`)', function () {
      assert.throws(function () {
        heap.get();
      });
    });

    it(', if a buffer w/ the specified identity exists, should return its `records`', function () {
      // (to set this up, we make a buffer and mock a couple of records in there)
      heap.malloc('f00');
      heap._buffers.f00.records.push({id:1}, {id:2});
      assert.deepEqual(heap.get('f00'), [{id:1}, {id:2}]);
    });

    it(', if NO buffer w/ the specified identity exists, should return `[]`', function () {
      assert.deepEqual(heap.get('bobsaget'), []);
    });
  });
});
