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
        orm: (new ORM({
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
            },

            stark: {
              attributes: {
                name: { type: 'string' }
              }
            }

          }
        }))

        // We refresh the ORM here so `primaryKey` will be calculated
        // (and maybe other important things?)
        .refresh()
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
        from: {entity: 'model', identity: 'stark'}
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





    // IMPORTANT:
    // QueryHeap buffers do not respect secondary `unique` attributes/indices--
    // just the primary key. It is up to the caller to honor other constraints.
    it('should ignore duplicates (using the primary key)', function () {
      heap.malloc('f1000A', {from: {entity: 'model', identity: 'stark'}});
      assert.deepEqual(heap._buffers.f1000A.records,[]);

      heap.push('f1000A', [{id:1, name: 'robb'},{id:2, name: 'sansa'},{id:3, name: 'jon'}]);
      assert.deepEqual(heap._buffers.f1000A.records,[{id:1, name: 'robb'},{id:2, name: 'sansa'},{id:3, name: 'jon'}]);

      heap.push('f1000A', [{id:1, name: 'robb'},{id:2, name: 'sansa'},{id:3, name: 'jon'}]);
      assert.deepEqual(heap._buffers.f1000A.records,[{id:1, name: 'robb'},{id:2, name: 'sansa'},{id:3, name: 'jon'}]);

      heap.push('f1000A', [{id:1, name: 'robb'},{id:2, name: 'sansa'},{id:3, name: 'jon'}, {id: 4, name: 'bran'}]);
      assert.deepEqual(heap._buffers.f1000A.records,[{id:1, name: 'robb'},{id:2, name: 'sansa'},{id:3, name: 'jon'}, {id: 4, name: 'bran'}]);

    });




    //
    // Criteria modifiers
    //

    it('should reorder records according to the buffer\'s `sort` modifier', function (){
      heap.malloc('f1001', {
        from: {entity: 'model', identity: 'stark'},
        sort: {
          name: 1
        }
      });
      assert.deepEqual(heap._buffers.f1001.records,[]);

      heap.push('f1001', []);
      assert.deepEqual(heap._buffers.f1001.records,[]);

      heap.push('f1001', [{name: 'ned'}]);
      assert.deepEqual(heap._buffers.f1001.records,[{name: 'ned'}]);

      heap.push('f1001', [{name: 'jon'}]);
      assert.deepEqual(heap._buffers.f1001.records,[{name: 'jon'}, {name: 'ned'}]);


      heap.push('f1001', [{name: 'arya'}, {name: 'sansa'}]);
      assert.deepEqual(heap._buffers.f1001.records,[{name: 'arya'}, {name: 'jon'}, {name: 'ned'}, {name: 'sansa'}]);
    });

    it('should sort records appropriately (in order of keys) when multiple sort attributes are applied', function (){
      heap.malloc('f1010', {
        from: {entity: 'model', identity: 'stark'},
        sort: {
          name: 1,
          age: 1
        }
      });
      assert.deepEqual(heap._buffers.f1010.records,[]);

      heap.push('f1010', []);
      assert.deepEqual(heap._buffers.f1010.records,[]);

      //
      // Wow.
      // In retrospect, I guess using `age` was kind of a mistake. Whatever.
      // http://towerofthehand.com/reference/compendiums/appendix_ages.html
      //

      heap.push('f1010', [{name: 'ned', age: 32}]);
      assert.deepEqual(heap._buffers.f1010.records,[{name: 'ned', age: 32}]);

      heap.push('f1010', [{name: 'jon', age: 16}]);
      assert.deepEqual(heap._buffers.f1010.records,[{name: 'jon', age: 16}, {name: 'ned', age: 32}]);

      heap.push('f1010', [{name: 'arya', age: 11}, {name: 'sansa', age: 13}]);
      assert.deepEqual(heap._buffers.f1010.records,[{name: 'arya', age: 11}, {name: 'jon', age: 16}, {name: 'ned', age: 32}, {name: 'sansa', age: 13}]);

      heap.malloc('f1011', {
        from: {entity: 'model', identity: 'stark'},
        sort: {
          age: 1,
          name: 1
        }
      });
      assert.deepEqual(heap._buffers.f1011.records,[]);

      heap.push('f1011', []);
      assert.deepEqual(heap._buffers.f1011.records,[]);

      heap.push('f1011', [{name: 'ned', age: 32}]);
      assert.deepEqual(heap._buffers.f1011.records,[{name: 'ned', age: 32}]);

      heap.push('f1011', [{name: 'jon', age: 16}]);
      assert.deepEqual(heap._buffers.f1011.records,[{name: 'jon', age: 16}, {name: 'ned', age: 32}]);

      heap.push('f1011', [{name: 'arya', age: 11}, {name: 'sansa', age: 13}]);
      assert.deepEqual(heap._buffers.f1011.records,[{name: 'arya', age: 11}, {name: 'sansa', age: 13}, {name: 'jon', age: 16}, {name: 'ned', age: 32}]);
    });

    it('should limit+sort records appropriately', function (){

      heap.malloc('f1100', {
        from: {entity: 'model', identity: 'stark'},
        sort: {
          age: 1,
          name: 1
        },
        limit: 2
      });
      assert.deepEqual(heap._buffers.f1100.records,[]);

      heap.push('f1100', []);
      assert.deepEqual(heap._buffers.f1100.records,[]);

      heap.push('f1100', [{name: 'ned', age: 32}]);
      assert.deepEqual(heap._buffers.f1100.records,[{name: 'ned', age: 32}]);

      heap.push('f1100', [{name: 'jon', age: 16}]);
      assert.deepEqual(heap._buffers.f1100.records,[{name: 'jon', age: 16}, {name: 'ned', age: 32}]);

      heap.push('f1100', [{name: 'arya', age: 11}, {name: 'sansa', age: 13}]);
      assert.deepEqual(heap._buffers.f1100.records,[{name: 'arya', age: 11}, {name: 'sansa', age: 13}]);

      heap.push('f1100', [{name: 'bran', age: 9}]);
      assert.deepEqual(heap._buffers.f1100.records,[{name: 'bran', age: 9}, {name: 'arya', age: 11}]);

      heap.push('f1100', [{name: 'rickon', age: 4}]);
      assert.deepEqual(heap._buffers.f1100.records,[{name: 'rickon', age: 4}, {name: 'bran', age: 9}]);

      heap.push('f1100', [{name: 'robb', age: 17}]);
      assert.deepEqual(heap._buffers.f1100.records,[{name: 'rickon', age: 4}, {name: 'bran', age: 9}]);
    });



    it('should limit+skip+sort records appropriately', function (){

      //
      // NOTE:
      // Currently, the results w/ `skip` look ALMOST exactly like the results
      // without it.  The only difference is that the heap will contain `skip+limit`
      // records, instead of `limit` records.
      //
      // Eventually `heap.get()` should probably implement `skip`
      // (and potentially even `where`, but that depends)
      //

      heap.malloc('f1101', {
        from: {entity: 'model', identity: 'stark'},
        sort: {
          age: 1,
          name: 1
        },
        limit: 2,
        skip: 2
      });
      assert.deepEqual(heap._buffers.f1101.records,[]);

      heap.push('f1101', []);
      assert.deepEqual(heap._buffers.f1101.records,[]);

      heap.push('f1101', [{name: 'ned', age: 32}]);
      assert.deepEqual(heap._buffers.f1101.records,[{name: 'ned', age: 32}]);

      heap.push('f1101', [{name: 'jon', age: 16}]);
      assert.deepEqual(heap._buffers.f1101.records,[{name: 'jon', age: 16}, {name: 'ned', age: 32}]);

      heap.push('f1101', [{name: 'arya', age: 11}, {name: 'sansa', age: 13}]);
      assert.deepEqual(heap._buffers.f1101.records,[{name: 'arya', age: 11}, {name: 'sansa', age: 13}, {name: 'jon', age: 16}, {name: 'ned', age: 32}]);

      heap.push('f1101', [{name: 'robb', age: 17}]);
      assert.deepEqual(heap._buffers.f1101.records,[{name: 'arya', age: 11}, {name: 'sansa', age: 13}, {name: 'jon', age: 16}, {name: 'robb', age: 17}]);

      heap.push('f1101', [{name: 'bran', age: 9}]);
      assert.deepEqual(heap._buffers.f1101.records,[{name: 'bran', age: 9}, {name: 'arya', age: 11}, {name: 'sansa', age: 13}, {name: 'jon', age: 16}]);

      heap.push('f1101', [{name: 'rickon', age: 4}]);
      assert.deepEqual(heap._buffers.f1101.records,[{name: 'rickon', age: 4}, {name: 'bran', age: 9}, {name: 'arya', age: 11}, {name: 'sansa', age: 13}]);

    });



  });
});
