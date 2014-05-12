/**
 * Module dependencies
 */

var assert = require('assert');
var _ = require('lodash');
var Waterline = require('../../');


describe('Waterline', function () {
  describe('factory', function () {

    it ('should work', function () {
      assert.doesNotThrow(function () {
        Waterline();
      });
    });

    it('should construct a valid ORM with models, adapters, and databases', function () {
      var orm = Waterline();
      assert(Waterline.ORM.isORM(orm));
    });

    it('should allow ontology to be passed in as arrays', function () {
      var orm = Waterline({
        adapters: [],
        models: [],
        databases: []
      });
      assert(Waterline.ORM.isORM(orm));
    });

    it('should allow ontology to be passed in as arrays', function () {
      var orm = Waterline({
        adapters: [{identity: 'sails-mysql'}],
        models: [{identity: 'user'}],
        databases: [{identity: 'gregs Mysql db'}]
      });
      assert(Waterline.ORM.isORM(orm));
    });

    it('should allow ontology to be passed in as plain objects', function () {
      var orm = Waterline({
        adapters: {},
        models: {},
        databases: {}
      });
      assert(Waterline.ORM.isORM(orm));
    });

    it('should allow ontology to be passed in as plain objects', function () {
      var orm = Waterline({
        adapters: {
          'sails-mysql': {}
        },
        models: {
          user: {}
        },
        databases: {
          'gregs Mysql db': {}
        }
      });
      assert(Waterline.ORM.isORM(orm));

      assert.doesNotThrow(function () {
        assert(orm.models[0].identity === 'user');
        assert(orm.databases[0].identity === 'gregs Mysql db');
        assert(orm.adapters[0].identity === 'sails-mysql');
      });
    });

  });
});

