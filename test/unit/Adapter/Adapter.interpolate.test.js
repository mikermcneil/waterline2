/**
 * Module dependencies
 */

var assert = require('assert');
var Adapter = require('root-require')('lib/Adapter');
var Deferred = require('root-require')('lib/Deferred');
var WLUsageError = require('root-require')('lib/WLError/WLUsageError');



describe('Adapter', function() {
  describe('.interpolate()', function() {

    it('should exist', function() {
      assert(typeof Adapter.interpolate === 'function');
    });

    describe('its return value (bridge fn)', function() {

      var someEntity;
      before(function buildSomeEntity() {
        someEntity = {
          fooBridge: Adapter.interpolate({
            method: 'foo',
            usage: [{
              label: 'callback',
              type: 'function',
              optional: true
            }],
            adapterUsage: ['Database', 'Model', 'callback']
          }),

          getAdapter: function() {
            return {
              foo: function(cb) { cb(); }
            };
          }
        };
      });

      it('should be a function', function() {
        assert(typeof someEntity.fooBridge === 'function');
      });

      describe('when it (bridge fn) is called with invalid usage', function() {
        it('should throw a WLUsageError', function() {
          try { someEntity.fooBridge(3); }
          catch (e) {
            assert(typeof e === 'object');
            assert(e instanceof WLUsageError);
            return;
          }
          throw new Error('Expected invalid usage passed to the bridge function to throw a WLUsageError');
        });
      });

      describe('when it (bridge fn) is called with valid usage', function() {

        it('should return a Deferred', function() {
          var fooBridge_returns = someEntity.fooBridge();
          assert(typeof fooBridge_returns === 'object');
          assert(fooBridge_returns instanceof Deferred);
        });

        it('should implement `columnName` schema transformation in arguments to adapter method');
        it('should implement `tableName` schema transformation in arguments to adapter method');
        it('should run `compatibilityShim` to transform the adapter method\'s arguments');
      });


      it('should have the same context as the caller (in this case, `someEntity`)', function(done) {
        // Only way to really test this right now is to see if calling `.exec()` works
        // (because that means the bridge fn was able to access the `getAdapter()` method)
        var fooBridge_returns = someEntity.fooBridge();
        fooBridge_returns.exec(done);
      });
    });

  });


});
