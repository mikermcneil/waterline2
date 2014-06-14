/**
 * Module dependencies
 */

var assert = require('assert');
var util = require('util');
var ORM = require('root-require')('lib/ORM');
var QueryHeap = require('root-require')('standalone/QueryHeap');


describe('QueryHeap', function () {
  describe('.prototype.rehydrate()', function () {

    var heap;

    before(function (){
      heap = new QueryHeap({
        orm: (new ORM({
          models: {

            stark: {
              attributes: {
                name: {
                  type: 'string'
                }
              }
            }

          }
        }))

        // We refresh the ORM here so `primaryKey` will be calculated
        // (and maybe other important things?)
        .refresh()
      });

      heap
      // Allocate buffer
      .malloc('f000', {
        from: {
          entity: 'model',
          identity: 'stark'
        },
        sort: {
          age: 1,
          name: 1
        },
        limit: 2,
        skip: 2
      })
      // Populate buffer w/ some data
      .push('f000', [{
        name: 'ned',
        age: 32
      }, {
        name: 'rickon',
        age: 4
      }, {
        name: 'robb',
        age: 17
      }, {
        name: 'jon',
        age: 16
      }, {
        name: 'bran',
        age: 9
      }, {
        name: 'arya',
        age: 11
      }, {
        name: 'sansa',
        age: 13
      }]);

      // Sanity check- this stuff is all testsed in `QueryHeap.prototype.push.test.js`
      assert.deepEqual(heap._buffers.f000.records,[{name: 'rickon', age: 4}, {name: 'bran', age: 9}, {name: 'arya', age: 11}, {name: 'sansa', age: 13}]);
    });



    it('should require the 1st argument (`bufferIdentity`)', function () {
      assert.throws(function () {
        heap.push();
      });
    });


    it('should require the 2nd argument (`records`)', function () {
      heap.malloc('f001');
      assert.throws(function () {
        heap.rehydrate('f001');
      });
    });

    it('should not throw if the 2nd argument (`records`) is an empty array', function () {
      assert.doesNotThrow(function () {
        heap.malloc('f010');
        heap.rehydrate('f010', []);
      });
    });

  });
});
