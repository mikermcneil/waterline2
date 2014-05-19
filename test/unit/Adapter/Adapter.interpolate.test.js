/**
 * Module dependencies
 */

var assert = require('assert');
var Adapter = require('root-require')('lib/Adapter');
var Deferred = require('root-require')('lib/Deferred');
var WLUsageError = require('root-require')('lib/WLUsageError');



describe('Adapter', function () {
  describe('.interpolate()', function () {

    it('should exist', function () {
      assert(typeof Adapter.interpolate === 'function');
    });

    describe('return value', function () {
      it('should be a function');
      it('should, when called with valid arguments, return a Deferred');
      it('should, when called with invalid usage, return a WLUsageError');
    });

  });
});
