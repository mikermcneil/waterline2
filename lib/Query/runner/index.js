/**
 * Module dependencies
 */

var queryEngine = require('./engine');


/**
 * Wrapper function- to be included on Query prototype.
 * @param  {Function} cb [description]
 * @return {Query}
 */

module.exports = function (cb) {
  this.on('runner_error', cb);
  this.on('runner_finished', cb);
  queryEngine(this.operations, this);
  return this;
};

