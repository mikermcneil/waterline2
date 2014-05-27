/**
 * Test dependencies
 */

var assert = require('assert');
var _ = require('lodash');


// fixtures
var PeopleAndTheirChats = require('../fixtures/PeopleAndTheirChats');

describe('integration', function () {
  describe.skip('nested select with a many to many association rule using the junction strategy', function () {


    var orm = PeopleAndTheirChats();
    var Person = orm.model('person');
    var Chat = orm.model('chat');

    it('should return all of the expected parent results', function (done) {

      Chat.find({
        where: { id: [1,2] }
      })
      .exec(function (err, expected) {
        if (err) return done(err);

        console.log('Expected:',expected,'\n*************~~~~~**************\n\n\n\n\n');

        var q =
        Chat.find({
          where: { id: [1,2] },
          select: {
            id: true,
            message: true,
            recipients: {
              select: {
                id: true,
                name: true
              }
            }
          }
        })
        .exec(function (err, chats) {
          if (err) return done(err);

          console.log('Vs:');
          console.log(q.heap);
          assert.equal(chats.length, expected.length, require('util').format('Unexpected number of top-level results (expected %d, got %d)', expected.length, chats.length));

          // Ensure proper number of nested things came back
          assert.equal(q.heap.get('chat').length, 1);

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
          // (numEars=3 should not match ANY)
          assert.equal(q.heap.get('cat').length,0);
          done();
        });
      });

    }); // </describe(nested select...where)>

  });  // </describe(nested select query)>



});