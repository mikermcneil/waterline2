/**
 * Module dependencies
 */

var util = require('util');
var _ = require('lodash');
_.defaults = require('merge-defaults');


/**
 * Query Runner.
 *
 * The query runner traverses the given `operations` tree and runs
 * each one by deducing the appropriate adapter(s), database(s),
 * and method(s) from the given `orm` instance.
 *
 * The query runner generates a QueryCache.  As operations complete,
 * this function iteratively stores its results in the cache.  This
 * emits events which are typically listened to by a Query, informing
 * it that new data is available to push to its result RecordStream.
 *
 * @type {Function}
 * @param {Object} operations
 * @param {ORM} orm
 * @return {QueryCache}
 */

module.exports = function runner (operations, orm) {


};







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

  //     profile: {
  //       from: 'profile',
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

  //     pets: {
  //       from: 'pet',
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
