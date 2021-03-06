/**
 * Test dependencies
 */

var assert = require('assert');
var _ = require('lodash');


// fixtures
var PeopleAndTheirCats = require('root-require')('test/fixtures/PeopleAndTheirCats');

describe('integration', function () {
  describe('nested select query', function () {


    var orm = PeopleAndTheirCats();
    var Person = orm.model('person');
    var Cat = orm.model('cat');

    it('should return all of the expected parent results', function (done) {


      var expectQ =
      Person.find({
        where: { id: [1,2] }
      })
      .exec(function (err, expected) {
        if (err) return done(err);

        // console.log('Expected:',expected,'\nheap:',expectQ.heap,'\n*************~~~~~**************\n\n\n\n\n');

        var q =
        Person.find({
          where: { id: [1,2] },
          select: {
            id: true,
            name: true,
            email: true,
            petCat: {
              select: {
                id: true,
                name: true
              }
            }
          }
        })
        .exec(function (err, persons) {
          if (err) return done(err);

          // console.log('Vs:');
          // console.log('Vs:', persons);
          // console.log(q.heap);
          assert.equal(persons.length, expected.length, require('util').format('Unexpected number of top-level results (expected %d, got %d)', expected.length, persons.length));

          // Ensure proper number of nested things came back
          // (numEars=3 should not match ANY)
          assert.equal(q.heap.getAllFrom('cat', Cat.primaryKey).length, 1);

          done();
        });

      });

    });




    describe('nested select...where', function () {

      var expected;

      before(function (done){
        Person.find({
          where: { id: [1,2] }
        })
        .exec(function (err, _expected) {
          if (err) return done(err);
          expected = _expected;
          done();
        });
      });

      it('should return expected number of top-level AND nested results', function (done) {
        var q =
        Person.find({
          where: { id: [1,2] },
          select: {
            id: true,
            name: true,
            email: true,
            petCat: {
              select: {
                id: true,
                name: true
              },
              where: {
                numEars: 3
              }
            }
          }
        })
        .exec(function (err, persons) {
          if (err) return done(err);

          // Ensure proper number of top-level results came back
          assert.equal(persons.length, expected.length, require('util').format('Unexpected number of top-level results (expected %d, got %d)', expected.length, persons.length));

          // Ensure proper number of nested things came back
          // (numEars=3 should NOT match ANY)
          // console.log('heap:',q.heap);
          assert.equal(q.heap.get('cat').length,0,'Too many child results! (specifically, too many cats)');
          done();
        });
      });

    }); // </describe(nested select...where)>

  });  // </describe(nested select query)>



});
