/**
 * Module dependencies
 */

var assert = require('assert');
var _ = require('lodash');
var Waterline = require('../../');

// helpers
var isORM = require('../helpers/isORM');
var isAdapter = require('../helpers/isAdapter');
var isDatabase = require('../helpers/isDatabase');
var isModel = require('../helpers/isModel');


describe('integration', function () {
  describe('DDL (setting up the database)', function () {

    it('should not fail w/ normal, declarative usage', function () {

      var orm = Waterline({
        models: {
          user: {
            database: 'default',
            attributes: {}
          }
        },
        databases: {
          default: {
            adapter: 'wl-pretend'
          }
        },
        adapters: {
          'wl-pretend': {
            find: function (criteria, cb) { cb('not a real adapter'); }
          }
        }
      });
      assert(isORM(orm));
    });

  });
});


