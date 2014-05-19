
/**
 * `parse()`
 *
 * TODO: since this method work w/ arrays, it can be
 * can be called on an array of results, a single result
 * (pass in [recordData]), or a stream of results (build a transform
 * stream which calls `parse()` with arrays of record data, or if
 * data events contain only single records, wrap them e.g. [recordData])
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
