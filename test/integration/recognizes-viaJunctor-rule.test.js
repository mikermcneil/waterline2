/**
 * Module dependencies
 */

var assert = require('assert');
var Waterline = require('root-require')('./');




describe('recognizes-association-rules', function () {

  describe('viaJunctor', function () {
    var orm;
    before(function () {
      orm = Waterline().model('Stark', {
        attributes: {

          favoriteWolves: { collection: 'direwolf' },
          raisedWolves: { collection: 'direwolf', via: 'raisedByHumans' }

        }
      }).model('Direwolf', {
        attributes: {

          favoriteHumans: { collection: 'stark' },
          raisedByHumans: { collection: 'direwolf', via: 'raisedWolves' }

        }
      }).refresh();

      //
      // Note that `favoriteWolves` and `favoriteHumans` are disjoint sets,
      // whereas `raisedWolves` and `raisedByHumans` are the same set.
      //
    });


    it('should be built automatically when `collection` is present w/o a `via`', function () {
      assert.equal(
        orm.model('stark').getAssociationRule('favoriteWolves').identity,
        'viaJunctor'
      );
      assert.equal(
        orm.model('direwolf').getAssociationRule('favoriteHumans').identity,
        'viaJunctor'
      );
    });

    it('should be built automatically when `collection`+`via` is present', function () {
      assert.equal(
        orm.model('stark').getAssociationRule('raisedWolves').identity,
        'viaJunctor'
      );
      assert.equal(
        orm.model('direwolf').getAssociationRule('raisedByHumans').identity,
        'viaJunctor'
      );
    });

  });


});
