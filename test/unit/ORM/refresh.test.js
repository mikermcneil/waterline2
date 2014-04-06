/**
 * Module dependencies
 */

var assert = require('assert');
var ORM = require('../../../lib/ORM');



describe('ORM', function () {
  describe('refresh', function () {

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

      var schema = orm.refresh();
      assert(typeof schema === 'object');
      assert(typeof schema.foo === 'object');
      assert(typeof schema.bar === 'object');
      assert(typeof schema.baz === 'object');
      assert(typeof schema.bazket === 'object');
      assert(typeof schema.weaving === 'object');
    });

    it('should work when databases and adapters are added', function () {

      var schema;

      orm.identifyDatabase('some mysql somewhere');
      schema = orm.refresh();
      assert(typeof schema === 'object');
      assert(typeof schema.foo === 'object');
      assert(typeof schema.bar === 'object');
      assert(typeof schema.baz === 'object');
      assert(typeof schema.bazket === 'object');
      assert(typeof schema.weaving === 'object');

      orm.identifyAdapter('sails-mysql');
      schema = orm.refresh();
      assert(typeof schema === 'object');
      assert(typeof schema.foo === 'object');
      assert(typeof schema.bar === 'object');
      assert(typeof schema.baz === 'object');
      assert(typeof schema.bazket === 'object');
      assert(typeof schema.weaving === 'object');
    });

    it('shouldn\'t leak between ORM instances', function () {
      var orm1 = new ORM();
      orm1.identifyModel('redBIrD');
      var schema1 = orm1.refresh();
      assert(typeof schema1 === 'object');
      assert(typeof schema1.redbird === 'object');

      var orm2 = new ORM();
      orm2.identifyModel('BLarhf');
      var schema2 = orm2.refresh();

      assert(typeof schema2 === 'object');
      assert(typeof schema2.blarhf === 'object');
      assert(!schema2.redbird);

      // Ensure that none of the previous tests impacted
      // these completely separate ORM instances:
      assert(!schema1.foo);
      assert(!schema1.bar);
      assert(!schema1.baz);
      assert(!schema1.bazket);
      assert(!schema1.weaving);

      assert(!schema2.foo);
      assert(!schema2.bar);
      assert(!schema2.baz);
      assert(!schema2.bazket);
      assert(!schema2.weaving);
    });

    it('shouldn\'t blow up with ONLY databases', function () {
      orm = new ORM();
      orm.identifyDatabase('some mysql somewhere');
      orm.identifyDatabase('some postgresql somewhere', {});
      orm.identifyDatabase({identity: 'some folder somewhere'});

      var schema = orm.refresh();
      assert(typeof schema === 'object');
    });

    it('shouldn\'t blow up with ONLY adapters', function () {
      orm = new ORM();
      orm.identifyDatabase('sails-mysql');
      orm.identifyDatabase('sails-disk', {});
      orm.identifyDatabase({ identity: 'sails-postgresql' });

      var schema = orm.refresh();
      assert(typeof schema === 'object');
    });

  });
});
