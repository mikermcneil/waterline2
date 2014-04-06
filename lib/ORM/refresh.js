/**
 * Module dependencies
 */

var _ = require ('lodash');
var WaterlineSchema = require('waterline-schema');



/**
 * Run `waterline-schema` on this ORM instance to detect any
 * weird stuff and get a serialized schema object.
 *
 * @return {Object}
 */

module.exports = function refresh () {

  // Builds ontological definitions that are WL1.0-backwards-compatible.
  var modelsAsObj = _.reduce(this.models, function (memo, obj) {
    var obj2 = _.cloneDeep(obj);
    obj2.prototype = obj2;
    memo[obj.identity] = obj2;
    return memo;
  }, {});
  var databasesAsObj = _.reduce(this.databases, function (memo, obj) {
    var obj2 = _.cloneDeep(obj);
    obj2.prototype = obj2;
    memo[obj.identity] = obj2;
    return memo;
  }, {});
  var defaults = {};

  // We then pass these WL1.0 objects into `waterline-schema` to
  // get a schema and validate the ORM's state.
  return WaterlineSchema(modelsAsObj, databasesAsObj, defaults);
};
