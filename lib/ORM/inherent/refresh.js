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

  // Refresh models
  _.each(this.models, function (model) {
    model.refresh();
  });


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

    // console.log(require('util').inspect(modelsAsObj, false, null));

    // We then pass these WL1.0 objects into `waterline-schema` to
    // get a schema and validate the ORM's state.
    return WaterlineSchema(modelsAsObj, datastoresAsObj, defaults);
  }
  catch(e) {
    // ...
    return {};
  }

};
