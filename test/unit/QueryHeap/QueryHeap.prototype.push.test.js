/**
 * Module dependencies
 */

var assert = require('assert');
var util = require('util');
var ORM = require('root-require')('lib/ORM');
var QueryHeap = require('root-require')('standalone/QueryHeap');


describe('QueryHeap', function () {
  describe('.prototype.push()', function () {

    var heap;

    before(function (){
      heap = new QueryHeap({
        orm: new ORM({
          models: {

            canister: {
              attributes: {
                sku: { type: 'string' },
                madeOfMaterial: { model: 'material' }
              }
            },

            material: {
              attributes: {
                name: { type: 'string' },
                description: { type: 'string' },
                usedInCanisters: { collection: 'canister', via: 'madeOfMaterial' }
              }
            }

          }
        })
      });
    });

    it('should require the 1st argument (`bufferIdentity`)', function () {
      assert.throws(function () {
        heap.push();
      });
    });

    it('should require the 2nd argument (`newRecords`)', function () {
      heap.malloc('f00');
      assert.throws(function () {
        heap.push('f00');
      });
    });

    it('should not throw if the 2nd argument (`newRecords`) is an empty array', function () {
      assert.doesNotThrow(function () {
        heap.malloc('f01');
        heap.push('f01', []);
      });
    });

    it('should not throw if the 2nd argument (`newRecords`) is a stuffed array, as long as the buffer\'s options contain valid query modifiers', function () {
      assert.doesNotThrow(function () {
        heap.malloc('f10', {
          from: {entity: 'model', identity: 'canister'}
        });
        heap.push('f10', [{id:1},{id:2},{id:3}]);
      });
    });


    it('should be chainable (i.e. return `this`)', function () {
      heap.malloc('f11');
      var returnVal = heap.push('f11', []);
      assert.equal(returnVal, heap, 'expected return value to === the heap itself, instead got:', util.inspect(returnVal, false, null));
    });

    it('should throw if a buffer w/ the specified identity DOES NOT EXIST', function () {
      assert.throws(function () {
        heap.push('f100', []);
      });
    });

    it('should push the specified records onto the buffer\'s `records` array', function () {
      heap.malloc('f101', {
        from: {entity: 'model', identity: 'canister'}
      });
      assert.deepEqual(heap._buffers.f101.records,[]);

      heap.push('f101', []);
      assert.deepEqual(heap._buffers.f101.records,[]);

      heap.push('f101', [{name: 'jon'}]);
      assert.deepEqual(heap._buffers.f101.records,[{name: 'jon'}]);

      heap.push('f101', [{name: 'ned'}]);
      assert.deepEqual(heap._buffers.f101.records,[{name: 'jon'}, {name: 'ned'}]);

      heap.push('f101', [{name: 'arya'}, {name: 'sansa'}]);
      assert.deepEqual(heap._buffers.f101.records,[{name: 'jon'}, {name: 'ned'}, {name: 'arya'}, {name: 'sansa'}]);
    });

    it('should throw a WLError (code===E_INVALIDFROM) if the buffer has an invalid `FROM` clause', function () {
      assert.throws(function () {
        heap.malloc('f110');
        heap.push('f110', [{id:1},{id:2},{id:3}]);
      });
      assert.throws(function () {
        heap.malloc('f111', {});
        heap.push('f111', [{id:1},{id:2},{id:3}]);
      });
      assert.throws(function () {
        // still should fail b/c there is no `from` modifier
        heap.malloc('f1000', {where: {}, limit: 10000, skip: 9999});
        heap.push('f1000', [{id:1},{id:2},{id:3}]);
      });
    });

  });
});
