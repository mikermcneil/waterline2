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
          petWolf: { model: 'Direwolf' }
        }
      }).model('Direwolf', {
        attributes: {
          humanOwner: { model: 'Stark' }
        }
      }).refresh();
    });

    it('should be built automatically when `model` is present w/ no accompanying collection..via', function () {
      assert.equal(
        orm.model('direwolf').getAssociationRule('humanOwner').identity,
        'hasFK'
      );
      assert.equal(
        orm.model('stark').getAssociationRule('petWolf').identity,
        'hasFK'
      );
    });
  });


});
