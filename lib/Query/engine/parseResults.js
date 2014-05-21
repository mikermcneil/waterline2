
/**
 * `parseResults()`
 *
 * TODO: since this method works w/ arrays, it can be
 * can be called on an array of results, a single result
 * (pass in [recordData]), or a stream of results (build a transform
 * stream which calls `parseResults()` with arrays of record data, or if
 * data events contain only single records, wrap them e.g. [recordData])
 *
 * Parses the results from a Query; but CURRENTLY only called when
 * records are to be returned as an array, i.e. not a stream.
 *
 * This default implementation may be overridden by passing
 * your own `parseResults` function in the Query constructor's
 * `opts` argument.
 *
 * @param  {RecordCollection} results
 * @return {RecordCollection}
 * @api private
 */
module.exports = function _ParseQueryResults (results) {
  return results;
};
