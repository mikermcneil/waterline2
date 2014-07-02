/**
 * Module dependencies
 */

var assert = require('assert');
var Query = require('root-require')('./lib/Query');
var ORM = require('root-require')('./lib/ORM');



describe('Query.prototype', function () {
  describe('.options()', function () {
    var q;
    var orm;

    before(function() {
      orm = new ORM();
      q = new Query({orm:orm});
    });

    it('should not freak out if no options are specified', function () {
      q.options();
    });

    it('should correctly modify our Query', function () {
      q.options({
        foo:'bar'
      });

      assert.equal(q.foo,'bar');
    });

    it('should be chainable', function () {
      q.options()
        .options({})
        .options({
          baz:'bane'
        });

      assert.equal(q.baz,'bane');
    });

  });
});
