/**
 * Module dependencies
 */

var ORM = require('./lib/ORM');



/**
 * Factory which instantiates an ORM instance, bootstraps
 * the ontology using provided options, refreshes the schema,
 * and then returns the ready-to-go ORM for use.
 *
 * @param  {Object} opts
 * @return {ORM}
 */

function Waterline (opts) {
  var orm = new ORM(opts);
  orm.refresh();
  return orm;
}


module.exports = Waterline;
