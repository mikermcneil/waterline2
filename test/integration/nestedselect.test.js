/**
 * Test dependencies
 */

var SimpleORMFixture = require('../fixtures/SimpleORM.fixture');
var assert = require('assert');
var _ = require('lodash');



describe('integration', function () {
  describe('nested select query', function () {

    var orm = SimpleORMFixture();

    it('should return all of the expected parent results', function (done) {

      var Person = orm.model('person');

      Person.find({
        where: { id: [1,2] }
      })
      .exec(function (err, expected) {
        if (err) return done(err);

        // console.log('Expected:',expected,'\n------------------------\n');

        Person.find({
          where: { id: [1,2] },
          select: {
            id: true,
            name: true,
            email: true,
            petCat: {
              id: true,
              name: true
            }
          }
        })
        .exec(function (err, persons) {
          if (err) return done(err);

          // console.log('Vs:', persons);

          assert.equal(persons.length, expected.length, require('util').format('Unexpected number of top-level results (expected %d, got %d)', expected.length, persons.length));
          done();
        });

      });


    });

  });
});
