/**
 * Module dependencies
 */

var _ = require ('lodash');
var WaterlineSchema = require('waterline-schema');


/**
 * #ORM.prototype.refresh()
 *
 * Normalize / validate the ontology.
 * Check datastore configuration, validate model schemas, etc.
 * Run `waterline-schema` on this ORM instance to detect any
 * weird stuff and get a serialized schema object.
 *
 * @return {Object}
 */

module.exports = function refresh () {

  // Get waterline-schema to fail silently, returning programmatically
  // understandable error objects, instead of try/catch
  try {

    // Mutates entities to be WL1.0-backwards-compatible.
    var modelsAsObj = _.reduce(this.models, function (memo, obj) {
      var obj2 = _.cloneDeep(obj);
      obj2.prototype = obj2;
      memo[obj.identity] = obj2;
      return memo;
    }, {});
    var datastoresAsObj = _.reduce(this.datastores, function (memo, obj) {
      var obj2 = _.cloneDeep(obj);
      obj2.prototype = obj2;
      memo[obj.identity] = obj2;
      return memo;
    }, {});
    var defaults = {};

    // We then pass these WL1.0 objects into `waterline-schema` to
    // get a schema and validate the ORM's state.
    this.WL1Schema = WaterlineSchema(modelsAsObj, datastoresAsObj, defaults);


    // log.skip(require('util').inspect(modelsAsObj, false, null));
  }
  catch(e) {
    // console.error('WLSCHEMA_ERROR:',e);
    // ...
    this.WL1Schema = {};
  }

  // Should we refresh models here??
  _.each(this.models, function (model) {
    model.refresh();
  });

  return this.WL1Schema;
};
