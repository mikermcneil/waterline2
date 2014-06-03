


















































// // Extremely stupid logger used only during development:
// //<dumblog>
// var log = {};
// log.debug = function (){ console.log.apply(console, Array.prototype.slice.call(arguments)); };
// log.skip = function (){};
// //</dumblog>


//////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////
// FROM ASSOCIATION / CHILD FILTER SECTION          ||
/////////////////////////////////////////////////// \/ ///////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////



          // TODO: finish this

          // var foreignKey;
          // var inValues;

          // if (assoc.type === '1-->N') {

          //   // Pluck the foreign key values from the original batch results
          //   // then strip records where a foreign key is undefined.
          //   inValues = _.pluck(filteredBatchResults, assoc.foreignKeys[subcriteria.from]);
          //   inValues = pruneUndefined(inValues);

          //   // Get subcriteria primary key
          //   var subcriteriaPrimaryKey = otherRelation.primaryKey;

          //   // In a 1.N, foreign key is on parent model.
          //   subcriteria.where[primaryKey] = inValues;

          //   // Apply flat select..where filters to subcriteria
          //   subcriteria.where = _.merge(subcriteria.where, flattenClause(joins[attrName].where));

          //   // Now take the recursive step and run the subcriteria.
          //   doRecursiveStep(subcriteria, function  memfilter(subResults) {

          //     var childPK = otherRelation.primaryKey;
          //     var parentFK = assoc.foreignKeys[otherRelation.identity];
          //     var subquery = subqueries[attrName];

          //     // Eliminate unnecessary subResults:
          //     var subResultsWhose;
          //     if (subquery && subquery.whose) {
          //       log.skip('subResultsWhose criteria', subquery.whose);
          //       subResultsWhose = WLTransform(subResults, {where: subquery.whose}).results;
          //     }
          //     else subResultsWhose = subResults;

          //     // Find the parent results linked to these subResults
          //     // (since in a 1-->N, the parent result holds the foreign key)
          //     var childPKs = _.pluck(subResultsWhose, childPK);
          //     log.skip('subResultsWhose', subResultsWhose);
          //     log.skip('filteredBatchResults (%s)', src.identity, _.pluck(filteredBatchResults, primaryKey));
          //     log.skip('childPKs in subResultsWhose (%s)', otherRelation.identity, childPKs);
          //     log.skip('using FK on (%s):', primaryKey, parentFK);
          //     var linkedParentResults = _.where(filteredBatchResults, function (parentResult) {
          //       return _.contains(childPKs, parentResult[parentFK]);
          //     });
          //     log.skip('()-()-()-()-()-()-() linkedParentResults:',linkedParentResults);

          //     // Now that we have the linked parent results from this batch, we can
          //     // use them to look up ALL of the possible child results:
          //     subResults = _.where(subResults, function (subResult) {
          //       return _.contains(_.pluck(linkedParentResults, parentFK), subResult[childPK]);
          //     });

          //     // TODO: (optimization)
          //     // On the other hand, if the query does NOT have a nested select on
          //     // this attribute, we only need to keep the child records found as
          //     // part of the subquery (`subResultWhose`) instead of the entire set
          //     // of all associated child records (`subResults`)

          //     return subResults;
          //   }, next_association);
          //   return;
          // }

          // else if ( assoc.type === 'N<->1' ) {

          //   // Build up a set of pk values from parent model
          //   // to use as the criteria for the child query.
          //   inValues = _.pluck(filteredBatchResults, primaryKey);
          //   inValues = pruneUndefined(inValues);

          //   log.skip('assoc::',assoc);
          //   log.skip('looking up %s in assoc\'s foreign keys:',src.identity, assoc.foreignKeys);
          //   log.skip('filteredBatchResults',filteredBatchResults);
          //   log.skip('plucked "%s" to get invalues:: %s',assoc.foreignKeys[src.identity], inValues);

          //   // N.1 :: Foreign key is on child model.
          //   // Have subcriteria find child records where:
          //   // child[fk] =IN= parents[pk]
          //   subcriteria.where[assoc.foreignKeys[src.identity]] = inValues;

          //   // Apply flat select..where filters to subcriteria
          //   subcriteria.where = _.merge(subcriteria.where, flattenClause(joins[attrName].where));

          //   // TODO: (optimization)
          //   // Compute union w/ other WHERE clause from the subselect
          //   // (i.e. { select: { pets: { where: {name: 'fluffy'} } } })
          //   // (will narrow down search for child records w/i the adapter)
          //   // var inMemoryFilter = criteriaUnion(subWhose, subSelectWhere);

          //   // Now take the recursive step and run the subcriteria.
          //   doRecursiveStep(subcriteria, function memfilter (subResults) {

          //     var childPK = otherRelation.primaryKey;
          //     var childFK = assoc.foreignKeys[src.identity];
          //     var subquery = subqueries[attrName];

          //     // Eliminate unnecessary subResults:
          //     var subResultsWhose;
          //     if (subquery && subquery.whose) {
          //       log.skip('subResultsWhose criteria', subquery.whose);
          //       subResultsWhose = WLTransform(subResults, {where: subquery.whose}).results;
          //     }
          //     else subResultsWhose = subResults;

          //     log.skip('subresults:', subResults);//_.pluck(subResults, otherRelation.primaryKey));
          //     log.skip('subResultsWhose', subResultsWhose);
          //     log.skip('filteredBatchResults (%s)', src.identity, _.pluck(filteredBatchResults, primaryKey));

          //     // Extract a set of foreign key values out of those subquery-"whose"-filtered
          //     // subresults (`fkValuesOfChildRecords`).  Now we have an array of foreign keys
          //     // we can use to match other child records which might belong to this batch of
          //     // parent results.
          //     //
          //     var fkValuesOfChildRecords = _.pluck(subResultsWhose, childFK);
          //     subResults = _.where(subResults, function (subResult) {
          //       return _.contains(fkValuesOfChildRecords, subResult[childFK]);
          //     });

          //     log.skip('final filtered subresults (%s.%s)', src.identity, attrName, _.pluck(subResults, otherRelation.primaryKey));

          //     // TODO: (optimization)
          //     // On the other hand, if the query does NOT have a nested select on
          //     // this attribute, we only need to keep the child records found as
          //     // part of the subquery (`subResultWhose`) instead of the entire set
          //     // of all associated child records (`subResults`)
          //     return subResults;
          //   }, next_association);
          //   return;
          // }

          // else if ( assoc.type === 'N<->M' || assoc.type === 'N-->M') {

          //   // Use the association rule to get the criteria to use in
          //   // the recursive step, as well as the function for filtering
          //   // each of its result batches.
          //   var rule = src.getAssociationRule(attrName);
          //   var subCriteria = rule.getChildCriteria(filteredBatchResults, subselect, query);
          //   var futureFilter = rule.getChildFilter(filteredBatchResults, subselect, query);

          //   // Take the recursive step
          //   return doRecursiveStep(subCriteria, futureFilter, next_association);
          // }
          // else {
          //   // wtf?
          //   return next_association(new WLUsageError('Unrecognized association definition in model schema, or invalid nested "select" in query syntax (i.e. populates/joins/projections)'));
          // }




//////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////
// FROM PARENT FILTER (i.e. backfilter) SECTION     ||
////////////////////////////////////////////////////\/////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////





                // Precalculate the plucked primary key values for each resulting "other model"
                // var subcriteriaResultIds = _.pluck(subcriteriaResults, otherRelation.primaryKey);
                // log.skip('WLTransform ',subcriteriaResults,'on ',subquery);
                // log.skip('filtered subcriteria (%s.%s) results', src.identity, attrName, filteredSubcriteriaResults);

                // // Apply min, max, and whose:
                // var backfilteredBatchResults;
                // log.skip('???',assoc.type, filteredBatchResults);
                // if (assoc.type === '1-->N') {
                //   log.skip('???',assoc.type, filteredBatchResults);
                //   log.skip('subquery.whose', subquery.whose);
                //   backfilteredBatchResults = _.where(filteredBatchResults, function (parentResult) {
                //     var parentFKValue = parentResult[assoc.foreignKeys[subcriteria.from]];
                //     var subcriteriaPKs = _.pluck(filteredSubcriteriaResults, otherRelation.primaryKey);
                //     log.skip('parentFKValue:',parentFKValue);
                //     log.skip('subcriteriaPKs:',subcriteriaPKs);
                //     return _.contains(subcriteriaPKs, parentFKValue);
                //   });
                //   log.skip('backfiltered parent results (1-->N)', backfilteredBatchResults);
                // }
                // else if ( assoc.type === 'N<->1' ) {
                //   log.skip('ACTUALLLY PERFORMING BACKFILTER ON N<->1 (%s.%s)', src.identity, attrName);
                //   // backfilteredBatchResults = WLTransform(filteredBatchResults, {where: subquery.whose}).results;
                //   backfilteredBatchResults = _.where(filteredBatchResults, function (parentResult) {
                //     var parentPKValue = parentResult[src.primaryKey];
                //     var subcriteriaFKs = _.pluck(filteredSubcriteriaResults, assoc.foreignKeys[src.identity]);
                //     return _.contains(subcriteriaFKs, parentPKValue);
                //   });
                //   log.skip('backfiltered parent results', backfilteredBatchResults);
                //   // var backfilterCriteria = {};
                //   // backfilteredBatchResults = WLTransform(filteredBatchResults, backfilterCriteria).results;

                //   log.skip(assoc.foreignKeys[subcriteria.from]);
                // }
                // else if ( assoc.type === 'N<->M' || assoc.type === 'N-->1' ) {
                //   // TODO
                //   // .....?????
                //   // Potentially need to have another, different sort of futureFilter here...

                // }


                // Experimental:
                // Don't push results to local query heap- instead, intersect them with
                // the main batch of results (`filteredBatchResults`).
                // log.skip('Reduced filteredBatchResults from:', _.pluck(filteredBatchResults, src.primaryKey));

                // log.skip('to:', _.pluck(filteredBatchResults, src.primaryKey));
                // log.skip('using:', _.pluck(backfilteredBatchResults, src.primaryKey));
                // log.skip('-----***~~~~~~*****~~~~******~~~~------');
                //
                // The push to the local query heap won't happen until all joins have been explored.
                //

                // Push our results to the `localHeap`.
                // log.skip('from', subcriteria.from);
                // log.skip('-- OK! --');
                // log.skip('(Ran subquery.)');
                // log.skip('pushed %d "%s"s to the local query heap', backfilteredBatchResults.length, src.identity);
                // // localHeap.push(src.identity, backfilteredBatchResults);
                // log.skip('--  /  --');
                // log.skip('pushed:\n',backfilteredBatchResults,' to subcriteria\'s ('+subcriteria.from+') local QC as "'+src.identity+'" `toOmit`:', localHeap);
