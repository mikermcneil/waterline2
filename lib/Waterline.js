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
Waterline.ORM       = require('./ORM');
Waterline.Relation  = require('./Relation');
Waterline.Model     = require('./Relation/Model');
Waterline.Datastore = require('./Datastore');
Waterline.Adapter   = require('./Adapter');
Waterline.Query     = require('./Query');
Waterline.Deferred  = require('root-require')('standalone/Deferred');

// Exposes errors
Waterline.WLError            = require('root-require')('standalone/WLError');
Waterline.WLUsageError       = require('root-require')('standalone/WLError/WLUsageError');
Waterline.WLValidationError  = require('root-require')('standalone/WLError/WLValidationError');

// Synonyms
Waterline.Error              = Waterline.WLError;
Waterline.UsageError         = Waterline.WLUsageError;
Waterline.ValidationError    = Waterline.WLValidationError;

// Case folding
Waterline.Orm                = Waterline.ORM;

module.exports = Waterline;
