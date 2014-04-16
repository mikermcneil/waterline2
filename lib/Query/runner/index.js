/**
 * Module dependencies
 */
var QueryCache = require('./QueryCache');
var queryEngine = require('./engine');


/**
 * Wrapper function- to be included on Query prototype.
 * @param  {Function} cb [description]
 * @return {Query}
 */

module.exports = function (cb) {

  // Construct the query cache and expose it on `this`
  this._cache = new QueryCache();

  this.on('runner_error', cb);
  this.on('runner_finished', cb);
  queryEngine(this._opts, this, this._orm);
  return this;
};

