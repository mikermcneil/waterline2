/**
 * Module dependencies
 */

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
     * Module dependencies
     */
    var assert = require('assert');
    var _ = require('lodash');
    var rootrequire = require('root-require');

    var isORM = rootrequire('./test/helpers/isORM');
    var isAdapter = rootrequire('./test/helpers/isAdapter');
    var isDatabase = rootrequire('./test/helpers/isDatabase');
    var isModel = rootrequire('./test/helpers/isModel');


    /**
     * Tests
     */
    describe('fixtures', function () {
      describe(require('util').format('Waterline(%s)',fixtureName), function () {
        it('should return a sane, valid ORM instance', function () {
          assert(isORM(orm));
        });

        it('should return a properly configured ontology in that ORM instance', function () {
          assert( isAdapter (_.find(orm.adapters, { identity: 'wl-pretend' })), 'adapter is missing or invalid' );
          assert( isDatabase(_.find(orm.databases, { identity: 'default' })), 'database is missing or invalid' );
          assert( isModel   (_.find(orm.models, { identity: 'user' })), 'model is missing or invalid' );
        });
      });
    });
  }


  // Expose ORM
  return orm;
};



