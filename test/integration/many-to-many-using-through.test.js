/**
 * Test dependencies
 */

var assert = require('assert');
var _ = require('lodash');


// fixtures
var PeopleAndTheirChats = require('../fixtures/PeopleAndTheirChats');

describe('integration', function () {
  describe('many to many using the viaJunction AR and an app-level, `through` model as its adjoining relation', function () {

    var orm;
    var Person;
    var Chat;
    var Share;

    before(function () {
      orm = PeopleAndTheirChats();

      // Instantiate an app-level model, "Share",
      // to use as an adjoining relation.
      orm.model('share', {
        datastore: 'default',
        attributes: {
          personWhoShared: {
            model: 'person'
          },
          chatShared: {
            model: 'chat'
          }
        }
      });

      // Patch the associations in Person and Chat to allow for
      // a new, "through" association which uses `Share` to keep track
      // of which users sent which chats.  It also allows multiple users to
      // share the same chat, kind of like a retweet or a "share" on facebook.
      //
      // And, um.. let's leave the ethics of sharing a private chat with
      // the world out of this, yeah?  Don't try this at home. or whatever.
      Person = orm.model('person');
      Person.attributes.sharedChats = {
        association: {
          entity: 'model',
          identity: 'chat',
          plural: true,
          via: 'sharedBy',
          through: {
            entity: 'model',
            identity: 'share',
            via: 'personWhoShared',
            onto: 'chatShared'
          }
        }
      };

      Chat = orm.model('chat');
      Chat.attributes.sharedBy = {
        association: {
          entity: 'model',
          identity: 'person',
          plural: true,
          via: 'sharedChats',
          through: {
            entity: 'model',
            identity: 'share',
            via: 'chatShared',
            onto: 'personWhoShared'
          }
        }
      };


      // Then refresh the ORM
      orm.refresh();

      // Provide access to all three models in closure scope
      // for use below.
      Person = orm.model('person');
      Chat = orm.model('chat');
      Share = orm.model('share');
    });






    it('should return all of the expected parent results', function (done) {

      var chatFindQ =
      Chat.find({
        where: { id: [1,2] }
      })
      .exec(function (err, expected) {
        if (err) return done(err);

        // console.log('chatFindQ:',chatFindQ.heap);
        console.log('Expected:',expected,'\n*************~~~~~**************\n\n\n\n\n');

        var q =
        Chat.find({
          where: { id: [1,2] },
          select: {
            id: true,
            message: true,
            sharedBy: {
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

          // Ensure proper number of things came back
          assert.equal(q.heap.get('chat').length, 2);
          // Ensure proper number of nested things came back
          assert.equal(q.heap.get('person').length, 1, 'expected 1 person, got: '+q.heap.get('person').length);

          done();
        });

      });

    });




    describe('nested select...where', function () {

      var expectedChildResults;
      var expectedParentResults;

      before(function (done){
        Chat.find({
          where: { id: [1,2] }
        })
        .exec(function (err, _expected) {
          if (err) return done(err);
          expectedParentResults = _expected;
          done();
        });
      });

      it('should return expected number of top-level AND nested results', function (done) {
        var q =
        Chat.find({
          where: { id: [1,2] },
          select: {
            id: true,
            message: true,
            sharedBy: {
              select: {
                id: true,
                name: true
              },
              where: {
                name: 'Lynda' // psst.. there's no one named Lynda
              }
            }
          }
        })
        .exec(function (err, chats) {
          if (err) return done(err);

          // Ensure proper number of top-level results came back
          assert.equal(chats.length, expectedParentResults.length, require('util').format('Unexpected number of top-level results (expected %d, got %d)', expectedParentResults.length, chats.length));

          // Ensure proper number of nested things came back
          assert.equal(q.heap.get('person').length,0);
          done();
        });
      });

    }); // </describe(nested select...where)>

  });  // </describe(nested select query)>



});
