/**
 * Module dependencies
 */

var assert = require('assert');
var Query = require('root-require')('./lib/Query');
var ORM = require('root-require')('./lib/ORM');



describe('Query', function () {
  describe('.constructor', function () {
    var q;
    var orm;

    it('should construct a query if passed an ORM', function () {
      orm = new ORM();
      q = new Query({orm:orm});
    });

    it('should fail w/o an ORM instance', function () {
      assert.throws(function(){
        q = new Query();
      }, 'should have thrown if no ORM was provided');
    });

    it('should save worker as `this.worker` if fn was provided', function () {
      var someWorkerFn = function(cb){};
      q = new Query({orm:orm}, someWorkerFn);
      assert.equal(q.worker,someWorkerFn,
        'should have saved worker fn as `this.worker`');
    });

    it('should save & normalize criteria as `this.criteria` if provided', function () {
      var c = {foo:'bar'};
      q = new Query({
        orm: orm,
        criteria: c
      });
      assert(q.criteria,
        'should have this.criteria');
      assert.equal(q.criteria.where.foo, c.foo,
        'miscellaneous top-level criteria keys should get shoved into `where`');
    });
  });
});
