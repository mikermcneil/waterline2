/**
 * Module dependencies
 */

var _ = require ('lodash');
var WaterlineSchema = require('waterline-schema');



/**
 * Run `waterline-schema` on this ORM instance to detect any
 * weird stuff and get a serialized ontology object.
 *
 * @return {Object}
 */

module.exports = function refresh () {

  // Build objects that are WL1.0-backwards-compatible to pass
  // in to `waterline-schema` and validate our ontology.
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

  return WaterlineSchema(modelsAsObj, databasesAsObj, defaults);
};
