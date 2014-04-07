/**
 * Module dependencies
 */

var assert = require('assert');
var _ = require('lodash');
var Waterline = require('../../');



// fixtures
var SimpleORM = require('../fixtures/SimpleORM');


describe('integration', function () {

  // DDL (data definition language- i.e. schema CRUD)
  describe('DDL', function () {

    var orm, db;

    before(function () {
      orm = SimpleORM();
      db = _(orm.databases).first();
    });

    describe('db.describe()', function () {
      it('should exist', function () {
        assert(typeof db.describe === 'function');
      });
      it('should not fail when using callback syntax', function (done) {
        db.describe('user', done);
      });
      it('should not fail when using .exec() syntax', function (done) {
        db.describe('user').exec(done);
      });
      // // it('should not fail when using promise syntax', function (done) {
      // //   db.describe()
      // //   .then(function (results) {
      // //     done();
      // //   })
      // //   .error(done);
      // // });
      it('should send back a valid schema description', function (done) {
        db.describe('user', function (err, schema) {
          if (err) return done(err);
          assert(typeof schema === 'object');

          // TODO: test that schema is in proper format

          return done();
        });
      });
    });

  });
});


