
//
// NOTE:
// This stuff was taken out of the query engine.
// It can probably be removed completely in favor of preprocessing
// the operations tree to treat N<->M (via'ed) and N-->M (vialess)
// associations as just another nested `select` clause.
//


// else if ( assoc.type === 'N<->M' || assoc.type === 'N-->M') {

              // // Determine Junction (i.e. join table) and its keys
              // Junction = assoc.junction;
              // var fkToParent = assoc.foreignKeys[srcModel.identity];
              // var fkToChild = assoc.foreignKeys[otherModel.identity];
              // var junctionPk = assoc.keeper.primaryKey;

              // // Build junction operation
              // var junctionOp = {select: {}, where: {}};
              // junctionOp.select[junctionPk] = true;
              // junctionOp.select[fkToChild] = true;
              // junctionOp.select[fkToParent] = true;
              // junctionOp.where[fkToParent] = _.pluck(filteredBatchResults, primaryKey);

              // // TODO: Instead of inlining logic for running the junction
              // // operation, we could maintain our own copy of the operation
              // // tree and rebuild it to include junctions.
              // //
              // // TODO: We could include the ability for a suboperation to
              // // pass back a `prune` option (e.g. { trim: [23,29,91] }), or
              // // just modify the cache for the parent directly, for use w/
              // // subqueries, where we don't know whether a parent record
              // // should be included in the result set until one or more child
              // // operations has been run.

              // // Run junction operation (in batches)
              // var pageNo;
              // var intermediateResults;
              // async.doUntil(function (next_junction_batch) {

              //   // Increment the page number (or start off on page 0)
              //   pageNo = typeof pageNo === 'undefined' ? 0 : pageNo+1;

              //   // Find a batch of intermediate results
              //   Junction.find({
              //     from: Junction.identity,
              //     where: junctionOp.where,
              //     select: junctionOp.select,
              //     limit: BATCH_SIZE,
              //     skip: BATCH_SIZE * pageNo
              //   })
              //   .options({raw: true})
              //   .exec(function (err, _intermediateResults) {
              //     if (err) return next_junction_batch(err);

              //     // Expose `intermediateResults` for use in `until` predicate below.
              //     intermediateResults = _intermediateResults;

              //     // Now build subop
              //     // (user isn't aware of the Junction step,
              //     // so the operation syntax isn't either)
              //     _.merge(subop, subselect);

              //     subop.where[primaryKey] = _.pluck(intermediateResults, fkToChild);

              //     // Now take the recursive step and run the suboperation.
              //     doRecursiveStep(subop, next_junction_batch);
              //     return;
              //   });
              // }, function until (){
              //   // Keep batching until the batch returns fewer
              //   // than BATCH_SIZE results.
              //   if (intermediateResults.length < BATCH_SIZE) {
              //     return true;
              //   }
              //   else return false;
              // }, function afterwards(err) {
              //   return next_subop(err);
              // });

            // }
