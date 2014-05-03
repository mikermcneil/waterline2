

module.exports = function () {


  /**
   *
   * @param  {Function} cb
   * @api private
   */

  return function queryWorkerFn (cb) {

    // TODO: bring criteria/operations normalization over from wl1.0
    // if ( !criteria.where && !criteria.limit && !criteria.select) {
    //   criteria.where = criteria;
    // }

    // Fill in the `select` using our model's schema.
    // (todo: do this later- on exec- so that chainable syntax can build operations iteratively)
    var model = self.orm.model(self.operations.from);
    var defaultSelect = _.mapValues(model.attributes, function() {
      return true;
    });
    if (Object.keys(self.operations.select).length === 0) {
      self.operations.select = defaultSelect;
    }
    // console.log('find():select:',criteria.select);



    // Don't use the query runner/engine + integrator
    // if `raw` is turned on:
    if (self._opts.raw) {
      if (!adapterWorker) return cb(null, []);
      else return adapterWorker(whenWorkerFinished);
    } else {
      return self.run(function(err) {
        if (err) return whenWorkerFinished(err);

        // TODO: figure out how to get the modelIdentity

        // No WL2.0 integrator yet, so for now
        // we stub our results using data from
        // the cache:

        // var results = self.cache.get('foo');
        return whenWorkerFinished(err, self.cache);
      });
    }

    /**
     * [whenWorkerFinished description]
     * @param  {[type]} err     [description]
     * @param  {[type]} results [description]
     * @return {[type]}         [description]
     */
    function whenWorkerFinished (err, results) {
      // console.log('finished adapter worker', arguments);
      // TODO: intercept or something and run parse at that time
      // self.stream().buffer(function parseBufferedRecords (err, records) {
      //   if (err) return cb(err);
      //   else return cb(null, opts.parse(records));
      // });
      cb(err, results);
    }
  };


};


