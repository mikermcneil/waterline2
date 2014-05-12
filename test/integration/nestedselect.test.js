/**
 * Test dependencies
 */

var assert = require('assert');
var _ = require('lodash');


// fixtures
var PeopleAndTheirCats = require('../fixtures/PeopleAndTheirCats');

describe('integration', function () {
  describe('nested select query', function () {


    var orm = PeopleAndTheirCats();
    var Person = orm.model('person');

    it('should return all of the expected parent results', function (done) {


      Person.find({
        where: { id: [1,2] }
      })
      .exec(function (err, expected) {
        if (err) return done(err);

        // console.log('Expected:',expected,'\n*************~~~~~**************\n\n\n\n\n');

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

          // console.log('Vs:', persons);
          // console.log(q.cache);
          assert.equal(persons.length, expected.length, require('util').format('Unexpected number of top-level results (expected %d, got %d)', expected.length, persons.length));
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

      it('should return expected nested results', function (done) {
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

          // console.log('Vs:', persons);
          // console.log(q.cache);
          assert.equal(persons.length, expected.length, require('util').format('Unexpected number of top-level results (expected %d, got %d)', expected.length, persons.length));
          done();
        });
      });

    }); // </describe(nested select...where)>

  });  // </describe(nested select query)>



});
