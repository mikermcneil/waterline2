/**
 * Waterline()
 *
 * Factory which instantiates an ORM instance, bootstraps
 * the ontology using provided options, refreshes the schema,
 * and then returns the ready-to-go ORM for use.
 *
 * @param  {Object} opts
 * @return {ORM}
 */

function Waterline (opts) {
  var orm = new Waterline.ORM(opts);
  orm.refresh();
  return orm;
}


// Exposes core constructors for clean usage throughout
// WL core, plugin authors, monkeypatching, etc.
Waterline.ORM      = require('./lib/ORM');
Waterline.Model    = require('./lib/Model');
Waterline.Database = require('./lib/Database');
Waterline.Adapter  = require('./lib/Adapter');


module.exports = Waterline;
