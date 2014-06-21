var assert = require('assert');
var util = require('util');


// fixtures
var PeopleAndTheirLegacyData = require('root-require')('test/fixtures/PeopleAndTheirLegacyData');


describe('criteria.select.test.js (projections->the "select" clause)', function () {

  var orm = PeopleAndTheirLegacyData();


  describe('a simple Query', function () {

    var q = orm.model('chat').find({
      where: {id: [1,2]}
    });

    it('should return expected fields in each result from a simple, raw orm.query()', function (done) {

      q.exec(function(err, results) {
        if (err) return done(err);
        var iresults = util.inspect(results, false, null);

        assert(results.length === 2, 'Expected 2 results, but got: '+iresults);
        assert.equal(results[0].message, 'Hey Louise');
        assert.equal(results[0].id, 1);
        done();
      });
    });

  });


});
