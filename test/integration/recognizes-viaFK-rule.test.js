/**
 * Module dependencies
 */

var assert = require('assert');
var Waterline = require('root-require')('./');




describe('recognizes-association-rules', function () {

  describe('viaFK', function () {
    var orm;
    before(function () {
      orm = Waterline().model('Stark', {
        attributes: {
          petWolves: { collection: 'direwolf', via: 'humanOwner' }
        }
      }).model('Direwolf', {
        attributes: {
          humanOwner: { model: 'stark' }
        }
      }).refresh();
    });


    it('should be built automatically when `collection` is present w/ a `via` that points to a foreign `model` assoc.', function () {
      assert.equal(
        orm.model('stark').getAssociationRule('petWolves').identity,
        'viaFK'
      );
    });
  });


});
