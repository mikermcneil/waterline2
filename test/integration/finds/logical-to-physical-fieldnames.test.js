var assert = require('assert');
var util = require('util');


// fixtures
var PeopleAndTheirLegacyData = require('root-require')('test/fixtures/PeopleAndTheirLegacyData');


describe('custom field names', function () {

  var orm = PeopleAndTheirLegacyData();


  describe('a simple Query', function () {

    var q = orm.query({
      criteria: {
        from: 'person',
        where: {
          id: [1,2]
        },
        select: {
          name: true,
          id: true
        }
      }
    });

    it('should return expected results with a simple, raw orm.query()', function (done) {

      q.exec(function(err, results) {
        if (err) return done(err);

        var iresults = util.inspect(results, false, null);


        // console.log('Searched:',q);
        // console.log('Results:\n', results);
        assert(results.length === 2, 'Expected 2 results, but got: '+iresults);
        assert(results[0].name && !results[0]._legacy_name, '`fieldName` may not have been automatically mapped in adapter results.  Expected there to be a "name" property, not "_legacy_name": '+iresults);
        assert(results[0].email && !results[0]._legacy_email, '`fieldName` may not have been automatically mapped in adapter results.  Expected there to be a "email" property, not "_legacy_email": '+iresults);
        assert(results[0].id && !results[0]._legacy_id, '`fieldName` may not have been automatically mapped in adapter results.  Expected there to be a "id" property, not "_legacy_id": '+iresults);
        done();
      });
    });

  });


});
