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

    it.skip('should correctly modify our Query', function () {
      TODO
    });

  });
});
