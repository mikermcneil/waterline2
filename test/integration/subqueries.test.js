/**
 * Test dependencies
 */

var SimpleORMFixture = require('../fixtures/SimpleORM.fixture');
var assert = require('assert');
var _ = require('lodash');


describe('integration', function () {
  describe('query engine', function () {

    var orm = SimpleORMFixture();


    describe('subqueries', function () {

      it('should work with a 1.N model association', function (cb) {
        var q = orm.query({
          operations: {
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
          assert(q.cache.get('cat'));
          assert(q.cache.get('person'));
          console.log('========>',q.cache);
          assert(_.where(q.cache.get('cat'), {name: 'Randy'}).length === 1);
          cb();
        });
      });



      it('should work with a N.1 collection association', function (cb) {
        var q = orm.query({
          operations: {
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
          assert(q.cache.get('cat'));
          assert(q.cache.get('person'));
          assert.equal(_.where(q.cache.get('cat'), {name: 'Dempsey the Cat'}).length, 1, 'expected exactly one cat named "Dempsey the Cat" but got '+_.where(q.cache.get('cat'), {name: 'Dempsey the Cat'}).length);
          // console.log(q.cache);
          cb();
        });
      });

    });

  });

});
