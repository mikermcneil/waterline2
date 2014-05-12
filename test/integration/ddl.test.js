/**
 * Module dependencies
 */

var assert = require('assert');
var _ = require('lodash');
var Waterline = require('../../');



// fixtures
var SimpleORM = require('../fixtures/PeopleAndTheirCats/orm.fixture');


describe('integration', function () {

  // DDL (data definition language- i.e. schema CRUD)
  describe('DDL', function () {

    var orm, db, model;

    before(function () {
      orm = SimpleORM();
      db = _(orm.databases).first();
      model = _(orm.models).first();
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
      it('should not fail when using promise syntax', function (done) {
        model.describe()
        .then(function (results) {
          done();
        })
        .error(done);
      });
      it('should send back a valid schema description', function (done) {
        db.describe('user', function (err, schema) {
          if (err) return done(err);
          assert(typeof schema === 'object');
          assert(typeof schema.attributes === 'object');
          return done();
        });
      });
    });

    describe('model.describe()', function () {
      it('should exist', function () {
        assert(typeof model.describe === 'function');
      });
      it('should not fail when using callback syntax', function (done) {
        model.describe(done);
      });
      it('should not fail when using .exec() syntax', function (done) {
        model.describe().exec(done);
      });
      it('should not fail when using promise syntax', function (done) {
        model.describe().then(function (results) {
          done();
        })
        .error(done);
      });
      it('should send back a valid schema description', function (done) {
        model.describe(function (err, schema) {
          if (err) return done(err);
          assert(typeof schema === 'object');
          assert(typeof schema.attributes === 'object');
          return done();
        });
      });
    });

  });
});


