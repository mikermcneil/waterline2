/**
 * Module dependencies
 */

var assert = require('assert');
var ORM = require('../../../lib/ORM');



describe('ORM', function () {
  describe('.prototype.forget*()', function () {

    var orm;
    before(function () {
      orm = new ORM();
    });

    it('should exist and work w/ naive usage', function () {
      orm.identifyModel('pumpkin');
      assert(orm.models.length === 1);
      orm.forgetModel('pumpkin');
      assert(orm.models.length === 0);
    });

    it('should be case insensitive and allow for flexible identity declaration', function () {
      orm.identifyModel('Foo');
      orm.identifyModel('Bar', {});
      orm.identifyModel('Baz', { attributes: {} });
      orm.identifyModel({ identity: 'bazket' });
      orm.identifyModel({ identity: 'Bazket' });
      orm.identifyModel('Weaving');

      assert(orm.models.length === 5);
      assert(typeof orm.model('foo') === 'object');
      assert(typeof orm.model('bar') === 'object');
      assert(typeof orm.model('baz') === 'object');
      assert(typeof orm.model('bazket') === 'object');
      assert(typeof orm.model('weaving') === 'object');

      orm.forgetModel('foo');
      orm.forgetModel('bar');
      orm.forgetModel('baz');
      orm.forgetModel('bazket');
      orm.forgetModel('weaving');

      assert(orm.models.length === 0);

    });


    it('shouldn\'t leak between ORM instances', function () {

      // Create the test models in our original ORM again
      orm.identifyModel('Foo');
      orm.identifyModel('Bar', {});
      orm.identifyModel('Baz', { attributes: {} });
      orm.identifyModel({ identity: 'bazket' });
      orm.identifyModel({ identity: 'Bazket' });
      orm.identifyModel('Weaving');

      // Now create a couple of new ORMs to make sure we
      // don't umm.. "spring any leaks", or whatever.
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

      // Now "forget" those models from our new ORMs to make sure they still exist
      // in the original ORM.
      orm1.forgetModel('foo');
      orm1.forgetModel('bar');
      orm1.forgetModel('baz');
      orm1.forgetModel('bazket');
      orm1.forgetModel('weaving');

      orm2.forgetModel('foo');
      orm2.forgetModel('bar');
      orm2.forgetModel('baz');
      orm2.forgetModel('bazket');
      orm2.forgetModel('weaving');

      assert(orm.model('foo'));
      assert(orm.model('bar'));
      assert(orm.model('baz'));
      assert(orm.model('bazket'));
      assert(orm.model('weaving'));
    });



  });
});
