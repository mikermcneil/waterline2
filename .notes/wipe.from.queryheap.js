

//
// The following is no longer used:
// (Sat June 7, 2014)
//


/**
 * [wipe description]
 * @param  {[type]} src [description]
 * @return {[type]}     [description]
 */
QueryHeap.prototype.wipe = function (src) {

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

  _heapdb[srcIdentity] = [];
  return this;
};

