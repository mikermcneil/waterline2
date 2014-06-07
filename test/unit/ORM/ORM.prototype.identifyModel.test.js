/**
 * Module dependencies
 */

var assert = require('assert');
var ORM = require('../../../lib/ORM');



describe('ORM', function () {
  describe('.prototype.identifyModel()', function () {

    var orm;
    before(function () {
      orm = new ORM();
    });

    it('should exist and work w/ naive usage', function () {
      orm.identifyModel('pumpkin');
    });

    it('should be case insensitive and allow for flexible identity declaration', function () {
      orm.identifyModel('Foo');
      orm.identifyModel('Bar', {});
      orm.identifyModel('Baz', { attributes: {} });
      orm.identifyModel({ identity: 'bazket' });
      orm.identifyModel({ identity: 'Bazket' });
      orm.identifyModel('Weaving');

      orm.refresh();

      assert(typeof orm.model('foo') === 'object');
      assert(typeof orm.model('bar') === 'object');
      assert(typeof orm.model('baz') === 'object');
      assert(typeof orm.model('bazket') === 'object');
      assert(typeof orm.model('weaving') === 'object');
    });

    it('should still work when datastores and/or adapters are added', function () {

      orm.identifyDatastore('some mysql somewhere');
      orm.refresh();

      assert(typeof orm.model('foo') === 'object');
      assert(typeof orm.model('bar') === 'object');
      assert(typeof orm.model('baz') === 'object');
      assert(typeof orm.model('bazket') === 'object');
      assert(typeof orm.model('weaving') === 'object');

      orm.identifyAdapter('sails-mysql');
      orm.refresh();

      assert(typeof orm.model('foo') === 'object');
      assert(typeof orm.model('bar') === 'object');
      assert(typeof orm.model('baz') === 'object');
      assert(typeof orm.model('bazket') === 'object');
      assert(typeof orm.model('weaving') === 'object');
    });

    it('shouldn\'t leak between ORM instances', function () {
      var orm1 = new ORM();
      orm1.identifyModel('redBIrD');
      orm1.refresh();
      assert(typeof orm1 === 'object');
      assert(typeof orm1.model('redbird') === 'object');

      var orm2 = new ORM();
      orm2.identifyModel('BLarhf');
      orm2.refresh();

      assert(typeof orm2 === 'object');
      assert(typeof orm2.model('blarhf') === 'object');
      assert(!orm2.model('redbird'));

      // Ensure that none of the previous tests impacted
      // these completely separate ORM instances:
      assert(!orm1.model('foo'));
      assert(!orm1.model('bar'));
      assert(!orm1.model('baz'));
      assert(!orm1.model('bazket'));
      assert(!orm1.model('weaving'));

      assert(!orm2.model('foo'));
      assert(!orm2.model('bar'));
      assert(!orm2.model('baz'));
      assert(!orm2.model('bazket'));
      assert(!orm2.model('weaving'));
    });


    it('shouldn\'t identify duplicate relations', function () {
      orm = new ORM();
      orm.model('product', {});
      orm.model('store', {});
      orm.model('company', {});
      orm.model('product', {});
      assert(orm.models.length === 3, 'shouldn\'t identify duplicate models');

      orm.junction('product_user', {});
      orm.junction('store_user', {});
      orm.junction('company_user', {});
      orm.junction('product_user', {});
      assert(orm.junctions.length === 3, 'shouldn\'t identify duplicate junctions');
    });

  });
});
