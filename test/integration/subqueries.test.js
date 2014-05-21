/**
 * Test dependencies
 */

var assert = require('assert');
var _ = require('lodash');

// fixtures
var PeopleAndTheirCats = require('../fixtures/PeopleAndTheirCats');


describe('integration', function () {
  describe('query engine', function () {

    var orm = PeopleAndTheirCats();


    describe('subqueries', function () {

      it('should work with a 1.N model association', function (cb) {
        var q = orm.query({
          criteria: {
            from: 'person',
            where: {
              id: [1,2],
              petCat: {
                name: 'randy'
              }
            },
            select: {
              name: true,
              id: true,
              petCat: {
                select: {
                  name: true
                }
              }
            }
          }
        });
        // console.log(q);
        q.exec(function(err, results) {
          if (err) throw err;
          assert(q.heap.get('cat'));
          assert(q.heap.get('person'));
          // console.log('========>',q.heap);

          var catsNamedRandyInHeap = _.where(q.heap.get('cat'), {id: 1});
          assert.equal(catsNamedRandyInHeap.length, 1, 'expected exactly 1 cat in the heap named randy (id:1) but got '+catsNamedRandyInHeap.length);
          cb();
        });
      });



      it('should work with a N.1 collection association', function (cb) {
        var q = orm.query({
          criteria: {
            from: 'person',
            where: {
              id: [1,2],
              petOfCats: {
                name: { contains: 'dempsey' }
              }
            },
            select: {
              name: true,
              id: true,
              petOfCats: {
                select: {
                  name: true
                }
              }
            }
          }
        });

        // console.log(q);
        q.exec(function(err, results) {
          if (err) throw err;
          assert(q.heap.get('cat'));
          assert(q.heap.get('person'));
          var catsNamedDempseyInHeap = _.where(q.heap.get('cat'), {id: 3});
          assert.equal(catsNamedDempseyInHeap.length, 1, 'expected exactly one cat named "Dempsey the Cat" (id:3) but got '+catsNamedDempseyInHeap.length);
          // console.log(q.heap);
          cb();
        });
      });

    });

  });

});
