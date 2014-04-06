/**
 * Default `parse` implementation for a Query.
 *
 * `parse` is called whenever records are to be returned
 * as an array, i.e. not a stream.
 *
 * @param  {RecordCollection} results
 * @return {RecordCollection}
 */
module.exports = function parse (results) {
  return results;
};
