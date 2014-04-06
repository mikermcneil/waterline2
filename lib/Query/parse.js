/**
 * Default `parse` implementation for a Query.
 *
 * `parse` is called whenever records are to be returned
 * as an array, i.e. not a stream.
 *
 * @param  {Array{Record}} results
 * @return {Array{Record}}
 */
module.exports = function parse (results) {
  return results;
};
