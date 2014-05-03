
// Note about columnName etc. in Query Engine:
//
// We don't have to worry about custom columnNames
// and tableNames here, because we're using standard
// Waterline query syntax to talk to the adapter,
// which normalizes everything.
// Additionally, the `keys` object in the operations
// tree has already been normalized with the correct
// primary key and/or foreign keys for each model.
//


////////////////////////////////////////////////////////////////

// `hasOne` Subqueries
//

// User.find()
// .where({
//   age: { '>': 40 },
//   pet: { age: 8 }
// })
// .limit(5);
//

// 1. Find a batch of men over 40 (disregard limit)
// 2. Find the dog who are 8 years old and belong to the men.
// 3. For each man, check that its dog is exactly 8.  If not, dump the man.
// 4. Since there is no sort, we don't have to run through every man--
//    We just look at the total of men we have, and if it exceeds the limit,
//    we're done.  Also, if we grab a batch of men, and we don't get the expected
//    batch size, we must have run out and we're done.
//    Otherwise dump the dogs, any extra men, and goto (1) w/ the next batch of men.
// 5. Integrate.



// `hasMany` Subqueries
// (see https://github.com/balderdashy/waterline/issues/176)

// User.find()
// .where({
//   age: { '>': 40 },
//   pets: {
//     atLeast: 2,
//     where: { age: 8 }
//   }
// })
// .limit(5)
// .sort('income DESC');
//

// 1. Find a batch of men over 40 (disregard limit)
// 2a. Find a batch of dogs who are 8 years old and belong to any of the men.
// 2b. For each man, keep track of how many of the dogs we've seen are owned by him.
// 2c. Until we try and grab a batch of these dogs and come up with fewer than expected,
//     OR all of our men have been verified to have at least 2 dogs, we must continue to
//     bring in more dogs (goto 2a.)
// 3. Since we are sorting, we also HAVE to run through every man-- we aren't done
//    until we try to grab a batch of men and we get fewer than the expected batch size.
//    But until then, we dump the extra men and goto (1) w/ the next batch of men.
//    If, as we go along, we exceed our limit of men, we will try and replace the men
//    we're holding onto with our new men, but only if they have higher income (following our sort criteria).
//    (If were enforcing a `skip` modifier for User, we would ignore the first
// 5. Integrate.






  // example impl in pseudocode
  // u = User.find(limit L, where W)
  // du = DogUser.find(where du[i][DogUser.parK] in u[i][User.pk] and du[i][DogUser.chiK] in d[i][Dog.pk] )
  // d = Dog.find(where W1 and d[i][Dog.fk] in u[i][User.pk] )
  // integrate

  // find parent records
  // -> find each batch of join records
  //   ->


    // var criteria = {};
    // var isWhereNested = getIsSubObject(operation,'where');
    // var isSelectNested = getIsSubObject(operation, 'select');


    // // TODO: handle WHERE subqueries (i.e. `.whose()`)
    // if (isWhereNested) {
    //   return onDone(new WLUsageError({reason:'Not implemented yet.'}));
    // }

    // // Handle populates
    // else if (isSelectNested) {

    //   async.each(Object.keys(operation.select), function eachSubselect (key, next) {

    //     // Normalize subselect
    //     // TODO: use the schema to be smarter about this
    //     var subselect = operation.select[key];
    //     if (!subselect) return next();
    //     else if (typeof subselect !== 'object') {
    //       subselect = { limit: DEFAULT_LIMIT };
    //     }

    //     // Recursive step:
    //     if (getIsSubObject(subselect, 'select')) {
    //       // TODO: figure out how this works instead of guessing
    //       return runOperation(subselect, cache, next);
    //     }
    //     // Base case:
    //     else {

    //       // If `db` of child is equal to our `db`,
    //       // we should call the native .join() method.
    //       if (operation.select.db === subselect.db) {
    //         // TODO
    //         return next(new WLUsageError({record: 'Native .join() support not implemented.'}));
    //       }
    //       else {

    //         // As long as no `sort` was supplied, we can do things the traditional way.
    //         if ( !subselect.sort ) {
    //           if ( subselect.through ) {

    //             // Take a guess as to which would be more efficient:
    //             // (a) batching through all child records
    //             // (b) sending a new child query for each parent record (usually it's this one)

    //             // TODO: handle M..N associations
    //             return next(new WLUsageError({record: 'M.N support not implemented.'}));
    //           }
    //           else {
    //             return orm.models[subselect.from].find({
    //               where: subselect.where,
    //               limit: subselect.limit,
    //               skip: subselect.skip
    //             }).exec(function gotIntermediateResults (err, results) {

    //               // Append results to cache
    //               cache[operation.model] = (cache[operation.model] || []).concat(results);
    //               return next(err);
    //             });
    //           }
    //         }

    //         // But if a `sort` WAS specified, a simple find won't be enough
    //         // since our WHERE criteria is a free variable. (these queries are being batched)
    //         // We can't rely on the database to sort things for us, since each query we're
    //         // making is not inclusive.
    //         else {

    //           // If we're using `sort` on a subselect, the results can not be streamed,
    //           // since we don't know the proper order yet.
    //           // (NOTE: this flag is merely advisory, and can be used to emit a warning
    //           // to the user.  Streaming usage should still work- it just won't be
    //           // ACTUALLY streaming- all the records will be held in memory.)
    //           query.streamable = false;

    //           // async.until... theseResults.length < BATCH_SIZE
    //           // do: {
    //           //   limit: BATCH_SIZE,
    //           //   skip: page,
    //           //   where: parentFilter + childWhere
    //           // }
    //           // page++;

    //           // TODO: batch queries
    //           return next(new WLUsageError({record: 'populate..sort not implemented.'}));
    //         }
    //       }
    //     }
    //   }, onDone); // </async.each>
    // }

    // // If this is a flat query, we can just run it and be done with it.
    // else {
    //   return orm.models[operation.from].find(criteria).exec(function gotResults (err, results) {
    //     if (err) return onDone(err);

    //     // Append results to cache
    //     cache[operation.model] = (cache[operation.model] || []).concat(results);
    //     return onDone();
    //   });
    // }




// Stub impl for reference:

// function parseOperation (operation) {

//   // Possible keys:
//   // operation.from;
//   // operation.keys;
//   // operation.select;
//   // operation.where;
//   // operation.skip;
//   // operation.sort;
//   // operation.through;



//   _.each(obj, function (val, key) {

//   });
// }


  // Example:

  // Below,we stub an expanded operations tree for the query:
  // User.find().populate('pets').populate('profile')....;
  //
  // As:
  // operations = {
  //   select: {
  //     name: true,
  //     age: true,
  //     profile: true,
  //     pets: true
  //   },
  //   where: {
  //     age: { '>': 40 }
  //   },
  //   limit: 30,
  //   sort: { name: 1 }  // name ASC
  // };

  // Which, after folding in the schema, IOs (intermediate ops),
  // and other physical layer impl data, becomes:
  // operations = {
  //   from: 'user',
  //   db: 'mikes_mysql',
  //   keys: {
  //     primary: 'id'
  //   },
  //   where: {
  //     age: { '>': 40 }
  //   },
  //   limit: 30,
  //   sort: { name: 1 },  // name ASC

  //   select: {
  //     name: true,
  //     age: true,
  //
  //     profile: {
  //       from: 'profile',
  //       db: 'mikes_mysql',
  //       keys: {
  //         primary: 'id',
  //         child: 'user_id'
  //       },
  //       select: {
  //         email: true,
  //         avatarUrl: true,
  //         accessToken: true
  //       },
  //       limit: 1
  //     },
  //
  //     pets: {
  //       from: 'pet',
  //       db: 'mikes_mysql',
  //       keys: {
  //         primary: 'id'
  //       },
  //       through: {
  //         from: 'pet_user',
  //         keys: {
  //           primary: 'id',
  //           user: 'user_id',
  //           pet: 'pet_id'
  //         }
  //       },
  //       select: {
  //         name: true
  //       },
  //       limit: 30
  //     }
  //   }
  // };

  // More or less equivalent to something like this:
  //
  // SELECT * FROM
  // ((SELECT * FROM user WHERE age > 40 LIMIT 30)) AS users
  // LEFT OUTER JOIN profile
  // ON users.id=profile.user_id
  // LEFT OUTER JOIN (SELECT * FROM pet_user INNER JOIN pet ON pet_user.pet_id=pet.id) AS pets
  // ON users.id=pets.user_id














// Take the following w/ a grain of salt-- I didn't finish:

// // Thoughts:
// // We can use relational algebra to rejigger some of the naughtier
// // queries.

// // For instance, take this subquery that finds folks in their forties
// // that have a pet which is exactly 8 years old:
// User.find()
// .where({
//   age: { '>': 40 },
//   pet: { age: 8 }
// })
// .limit(5);


// // Its operation set looks something like this:
// var fiveMiddleAgedUsersWithAnEightYearOldDog = [{
//   operation: 'find',
//   from: 'user',
//   select: { '*': true },
//   limit: 5,
//   where: {
//     age: { '>': 40 },
//     pet: {
//       operation: 'find',
//       from: 'pet',
//       where: { age: 8 },
//       select: 'id'
//     }
//   }
// }];


// // But as it turns out, this is basically the same thing as
// // finding Pets who are age 8, and populating all of their
// // owners who are over the age of 40 (populate...where)
// // Consider this query:
// Pet.find({ age: 8 })
// .populate('owner', {
//   age: { '>': 40 }
// });


// // And here's the operations set that would be generated
// // for this populate..where example.
// var allEightYearOldDogsAndTheirMiddleAgedOwners = [{
//   as: 1,
//   operation: 'find',
//   from: 'pet',
//   where: { age: 8 },
//   select: {
//     '*': true,
//     owner: {
//       operation: 'find',
//       from: 'user',
//       where: {
//         age: { '>': 40 },
//         pet: {
//           operation: 'stream',
//           source: '1',
//           batchSize: 30,
//           select: 'id'
//         }
//       }
//     }
//   }
// }];



// // The result set would look a little different, but
// // the data therein is a superset of the data we're looking
// // for in our subquery.

// // Here's how we could modify the operations set to make it
// // identical to our subquery example above.  Notice that we
// // don't explicitly handle the `limit: 5`-- that's because
// // the integrator will take care of it implicitly.
// // We do, however, change the `select` modifier in the
// // top-level `Pet.find` operation to remove the '*', since
// // we only need the `owner` key.
// var allEightYearOldDogsAndTheirMiddleAgedOwners = [{
//   as: 1,
//   operation: 'find',
//   from: 'pet',
//   where: { age: 8 },
//   select: {
//     owner: {
//       operation: 'find',
//       from: 'user',
//       where: {
//         age: { '>': 40 },
//         pet: '{{1}}.id'
//       }
//     }
//   }
// }];
