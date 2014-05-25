  // `update` contains a set of values for an update query.
  if (typeof opts.update === 'undefined') {
    opts.update = _.pick(opts, keysNotIn($$.CRITERIA_MODS, $$.PREDICATE_MODS) );
  }



  // In the context above, "values" are 2-tuples specifying an attribute on the LHS
  // and a desired value on the RHS.
  // (see http://en.wikipedia.org/wiki/Tuple & http://en.wikipedia.org/wiki/Attribute%E2%80%93value_pair)
  //
  // Note that while similar 2-tuples often exist in the WHERE clause of a
  // criteria object, those values have a different meaning.   Rather than
  // indicating a desired transformation of values on the subset of records involved,
  // they indicate a filter (e.g. find user's named "foo"-> {name: 'foo'})
