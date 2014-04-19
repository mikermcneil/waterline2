
/**
 * `parse()`
 *
 * Parses the results of a Query; but only called when
 * records are to be returned as an array, i.e. not a stream.
 *
 * This default implementation may be overridden by passing
 * your own `parse` function in the Query constructor's
 * `opts` argument.
 *
 * @param  {RecordCollection} results
 * @return {RecordCollection}
 * @api private
 */
module.exports = function _ParseQueryResults (results) {
  return results;
};
