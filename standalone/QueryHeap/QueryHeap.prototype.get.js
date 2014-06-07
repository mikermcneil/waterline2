/**
 * Module dependencies
 */

var util = require('util');
var _ = require('lodash');

var lookupRelationFrom = require('root-require')('standalone/lookup-relation-from');


/**
 * [get description]
 * @param  {[type]} src [description]
 * @return {[type]}     [description]
 */
module.exports = function get (src) {

  ///////////////////////////////////////////////////////
  // Normalize `src`:
  //
  // `src` may be specified as a string (identity of a model)
  // or an object (Model or Junction instance)
  var srcIdentity;
  var _heapdb;
  if (_.isString(src)) {
    srcIdentity = src;
    _heapdb = this._models;
  }
  else {
    if(src.constructor.name === 'Model') {
      _heapdb = this._models;
    }
    else {
      _heapdb = this._junctions;
    }
    srcIdentity = src.identity;
  }
  ///////////////////////////////////////////////////////

  return _heapdb[srcIdentity] || [];
};
