/**
 * Module dependencies
 */

var assert = require('assert');
var _ = require('lodash');
var Waterline = require('root-require')('./');


/**
 * buildAndTestORM()
 *
 * Helper factory that uses the provided ontolgoy definition
 * to instantiate, test, and return an ORM instance.
 *
 * @param  {Object} ontology    [ontology definition]
 * @param  {String} fixtureName [e.g. PeopleAndTheirCats - just for prettier test output]
 * @return {ORM}
 */

module.exports = function buildAndTestORM (ontology, fixtureName) {

  // Build ORM using provided ontology.
  var orm = Waterline(ontology);

  // The following self-tests this fixture.
  // (if this is mocha, runs some quick sanity checks)
  if (typeof describe !== 'undefined') {


    /**
     * Tests
     */
    describe('fixtures', function () {
      describe(require('util').format('Waterline(%s)',fixtureName), function () {
        it('should return a sane, valid ORM instance', function () {
          assert(Waterline.ORM.isORM(orm));
        });

        it('should return a properly configured ontology in that ORM instance', function () {
          assert( Waterline.Adapter.isAdapter (_.find(orm.adapters, { identity: 'wl-pretend' })), 'adapter is missing or invalid' );
          assert( Waterline.Database.isDatabase (_.find(orm.databases, { identity: 'default' })), 'database is missing or invalid' );
          assert( Waterline.Model.isModel   (_.find(orm.models, { identity: 'user' })), 'model is missing or invalid' );
        });
      });
    });
  }


  // Expose ORM
  return orm;
};



