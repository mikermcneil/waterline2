/**
 * Test dependencies
 */

var assert = require('assert');
var _ = require('lodash');



describe('integration', function () {
  describe('query engine', function () {

    // Load fixtures
    var orm = require('../fixtures/PeopleAndTheirChats')();

    describe('virtual-query-fields', function () {

      // WHERE
      // ----------------------------------------------------------------------------
      it('should return expected results with virtual fields in WHERE', function (done) {
        orm.model('person').find({
          where: {
            '&foo': 'some scalar value'
          }
        })
        .exec(function (err,results){
          if (err) return done(err);
          assert.equal(results.length, 0, 'Because "&foo" is not a real attribute, expected 0 results, but got '+results.length);
          done();
        });
      });

      it('should return expected results with virtual fields in WHERE, even if other valid WHERE expressions exist', function (done) {
        orm.model('person').find({
          where: {
            or: [{
              '&foo': 'some scalar value'
            },
            {
              id: [2,3]
            }]
          }
        })
        .exec(function (err,results){
          if (err) return done(err);
          assert.equal(results.length, 2, 'Because "&foo" is not a real attribute, but an OR clause exists looking for ids in [2,3], expected 2 results, but got '+results.length);
          done();
        });
      });


      // SELECT
      // ----------------------------------------------------------------------------
      it('should return expected results with virtual fields in SELECT', function (done) {
        orm.model('person').find({
          select: {
            '&foo': true
          }
        })
        .exec(function (err,results){
          if (err) return done(err);

          // Because "&foo" is not a real attribute, setting it to a truthy OR a falsy value
          // should have no effect on the baseline results.
          assert.equal(results.length, 3, 'Expected 3 results, but got '+results.length);
          done();
        });
      });

      it('should return expected results with virtual fields in SELECT, even if other valid SELECT expressions exist', function (done) {
        orm.model('person').find({
          select: {
            '&foo': true,
            id: true,
            '*': false
          }
        })
        .exec(function (err,results){
          if (err) return done(err);

          // Because "&foo" is not a real attribute, setting it to a truthy OR a falsy value
          // should have no effect on the baseline results.
          assert.equal(results.length, 3, 'Expected 3 results, but got '+results.length);
          var EXPECTING = [{id:1}, {id:2}, {id:3}];
          assert.deepEqual(results, EXPECTING, 'Expected projections '+_inspect(EXPECTING)+', but got '+_inspect(results));
          done();
        });
      });


      // SORT
      // ----------------------------------------------------------------------------
      it('should return expected results with virtual fields in SORT', function (done) {
        orm.model('person').find({
          sort: {
            '&foo': 1
          }
        })
        .exec(function (err,results){
          if (err) return done(err);

          // Because "&foo" is not a real attribute, setting it to 1 or -1 or 0
          // should have no effect on the ordering of the baseline results.
          assert.equal(results.length, 3, 'Expected 3 results, but got '+results.length);
          assert.deepEqual(_.pluck(results, 'id'), [1,2,3], 'Expected order [1,2,3], but got '+_inspect(_.pluck(results,'id')));
          done();
        });
      });

      it('should return expected results with virtual fields in SORT, even if other valid sort expressions are present', function (done) {
        orm.model('person').find({
          sort: {
            '&foo': 1,
            name: 1
          }
        })
        .exec(function (err,results){
          if (err) return done(err);

          // Because "&foo" is not a real attribute, setting it to 1 or -1 or 0
          // should have no effect on the ordering of the baseline results.
          assert.equal(results.length, 3, 'Expected 3 results, but got '+results.length);
          var EXPECTING = [2,3,1];
          assert.deepEqual(_.pluck(results, 'id'), EXPECTING, 'Expected order '+_inspect(EXPECTING)+', but got '+_inspect(_.pluck(results,'id')));
          done();
        });
      });


    }); // </virtual-query-fields>
  }); // </query engine>
}); // </integration>




// console.log(q);
//   q.exec(function(err, results) {
//     if (err) throw err;
//     assert(q.heap.getAllFrom('cat', Cat.primaryKey));
//     assert(q.heap.getAllFrom('person', Person.primaryKey));
//     // console.log('========>',q.heap);

//     var catsNamedRandyInHeap = _.where(q.heap.getAllFrom('cat', Cat.primaryKey), {id: 1});
//     assert.equal(catsNamedRandyInHeap.length, 1, 'expected exactly 1 cat in the heap named randy (id:1) but got '+catsNamedRandyInHeap.length);
//     cb();
//   });
// });



/**
 * For convenience-- fully expand a complex object/array/scalar/anything
 * into a pretty string.
 *
 * @param  {[type]} someValue [description]
 * @return {[type]}           [description]
 */
function _inspect(someValue) {
  return require('util').inspect(someValue, false, null);
}
