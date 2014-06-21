/**
 * Module dependencies
 */

var assert = require('assert');
var Waterline = require('root-require')('./');




describe('recognizes-association-rules', function () {

  describe('hasFK', function () {
    var orm;
    before(function () {
      orm = Waterline().model('Stark', {
        attributes: {
          petWolf: { model: 'Direwolf' },
          favoriteWolves: { collection: 'direwolf', via: 'favoriteWolfOf' }
        }
      }).model('Direwolf', {
        attributes: {
          humanOwner: { model: 'Stark' },
          favoriteWolfOf: { model: 'stark' }
        }
      }).refresh();
    });

    it('should be built automatically when `model` assoc is present w/ no accompanying collection..via', function () {
      assert.equal(
        orm.model('direwolf').getAssociationRule('humanOwner').identity,
        'hasFK'
      );
      assert.equal(
        orm.model('stark').getAssociationRule('petWolf').identity,
        'hasFK'
      );
    });
    it('should be built automatically when `model` assoc points at a collection..via assoc', function () {
      assert.equal(
        orm.model('direwolf').getAssociationRule('humanOwner').identity,
        'hasFK'
      );
    });
  });



});
