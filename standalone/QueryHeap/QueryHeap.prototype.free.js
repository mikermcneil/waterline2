/**
 * @param  {String} bufferIdentity
 * @return {Array}
 */
module.exports = function free (bufferIdentity) {
  delete this._buffers[bufferIdentity];
};
