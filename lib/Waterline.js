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
  orm.refresh(); // TODO: consider removing this and pulling it into the ORM constructor-- we may already be doing this anyways?
  return orm;
}


// Exposes core constructors for clean usage throughout
// WL core, plugin authors, monkeypatching, etc.
Waterline.ORM      = require('./ORM');
Waterline.Model    = require('./Model');
Waterline.Database = require('./Database');
Waterline.Adapter  = require('./Adapter');

// Exposes errors
Waterline.WLError            = require('./WLError');
Waterline.WLUsageError       = require('./WLError/WLUsageError');
Waterline.WLValidationError  = require('./WLError/WLValidationError');

// Synonyms
Waterline.Error              = Waterline.WLError;
Waterline.UsageError         = Waterline.WLUsageError;
Waterline.ValidationError    = Waterline.WLValidationError;

module.exports = Waterline;
