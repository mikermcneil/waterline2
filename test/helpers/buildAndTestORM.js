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


  // Expose ORM
  return orm;
};



