/**
 * Module dependencies
 */

var assert = require('assert');
var _ = require('lodash');
var Waterline = require('root-require')('./');


describe('integration', function () {
  describe('ORM setup', function () {

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


      // Schema is valid:
      assert( Waterline.ORM.isORM(orm) );
      assert( Waterline.Adapter.isAdapter   (_.find(orm.adapters, { identity: 'wl-pretend' })), 'adapter is missing or invalid' );
      assert( Waterline.Database.isDatabase (_.find(orm.databases, { identity: 'default' })), 'database is missing or invalid' );
      assert( Waterline.Model.isModel       (_.find(orm.models, { identity: 'user' })), 'model is missing or invalid' );
    });



    it('should not fail w/ programmatic usage', function () {

      var orm = Waterline();
      orm.identifyModel('User', {
        database: 'default',
        attributes: {}
      });
      orm.identifyDatabase('default', {
        adapter: 'wl-pretend'
      });
      orm.identifyAdapter('wl-pretend', {
        find: function (criteria, cb) { cb('not a real adapter'); }
      });

      // Schema is valid:
      assert( Waterline.ORM.isORM(orm) );
      assert( Waterline.Adapter.isAdapter   (_.find(orm.adapters, { identity: 'wl-pretend' })), 'adapter is missing or invalid' );
      assert( Waterline.Database.isDatabase (_.find(orm.databases, { identity: 'default' })), 'database is missing or invalid' );
      assert( Waterline.Model.isModel       (_.find(orm.models, { identity: 'user' })), 'model is missing or invalid' );
    });

  });
});


