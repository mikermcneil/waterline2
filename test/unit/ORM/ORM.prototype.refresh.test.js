/**
 * Module dependencies
 */

var assert = require('assert');
var ORM = require('../../../lib/ORM');



describe('ORM', function () {
  describe('.prototype.refresh()', function () {

    var orm;
    before(function () {
      orm = new ORM();
    });

    it('should exist and work w/ naive usage', function () {
      var schema = orm.refresh();
      assert(typeof schema === 'object');
    });

    it('should work after adding a few models, and the schema should make sense', function () {
      orm.identifyModel('Foo');
      orm.identifyModel('Bar', {});
      orm.identifyModel('Baz', { attributes: {} });
      orm.identifyModel({ identity: 'Bazket' });
      orm.identifyModel('Weaving');

      var wl1Schema = orm.refresh();
      assert(typeof wl1Schema === 'object');
      assert(typeof wl1Schema.foo === 'object');
      assert(typeof wl1Schema.bar === 'object');
      assert(typeof wl1Schema.baz === 'object');
      assert(typeof wl1Schema.bazket === 'object');
      assert(typeof wl1Schema.weaving === 'object');
    });

    it('should work when datastores and adapters are added', function () {

      var wl1Schema;

      orm.identifyDatastore('some mysql somewhere');
      wl1Schema = orm.refresh();
      assert(typeof wl1Schema === 'object');
      assert(typeof wl1Schema.foo === 'object');
      assert(typeof wl1Schema.bar === 'object');
      assert(typeof wl1Schema.baz === 'object');
      assert(typeof wl1Schema.bazket === 'object');
      assert(typeof wl1Schema.weaving === 'object');

      orm.identifyAdapter('sails-mysql');
      wl1Schema = orm.refresh();
      assert(typeof wl1Schema === 'object');
      assert(typeof wl1Schema.foo === 'object');
      assert(typeof wl1Schema.bar === 'object');
      assert(typeof wl1Schema.baz === 'object');
      assert(typeof wl1Schema.bazket === 'object');
      assert(typeof wl1Schema.weaving === 'object');
    });

    it('shouldn\'t leak between ORM instances', function () {
      var orm1 = new ORM();
      orm1.identifyModel('redBIrD');
      var wl1Schema0 = orm1.refresh();
      assert(typeof wl1Schema0 === 'object');
      assert(typeof wl1Schema0.redbird === 'object');

      var orm2 = new ORM();
      orm2.identifyModel('BLarhf');
      var wl1Schema2 = orm2.refresh();

      assert(typeof wl1Schema2 === 'object');
      assert(typeof wl1Schema2.blarhf === 'object');
      assert(!wl1Schema2.redbird);

      // Ensure that none of the previous tests impacted
      // these completely separate ORM instances:
      assert(!wl1Schema0.foo);
      assert(!wl1Schema0.bar);
      assert(!wl1Schema0.baz);
      assert(!wl1Schema0.bazket);
      assert(!wl1Schema0.weaving);

      assert(!wl1Schema2.foo);
      assert(!wl1Schema2.bar);
      assert(!wl1Schema2.baz);
      assert(!wl1Schema2.bazket);
      assert(!wl1Schema2.weaving);
    });

    it('shouldn\'t blow up with ONLY datastores', function () {
      orm = new ORM();
      orm.identifyDatastore('some mysql somewhere');
      orm.identifyDatastore('some postgresql somewhere', {});
      orm.identifyDatastore({identity: 'some folder somewhere'});

      var schema = orm.refresh();
      assert(typeof schema === 'object');
    });

    it('shouldn\'t blow up with ONLY adapters', function () {
      orm = new ORM();
      orm.identifyDatastore('sails-mysql');
      orm.identifyDatastore('sails-disk', {});
      orm.identifyDatastore({ identity: 'sails-postgresql' });

      var schema = orm.refresh();
      assert(typeof schema === 'object');
    });

  });
});
