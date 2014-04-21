var SimpleORMFixture = require('../fixtures/SimpleORM.fixture');
var assert = require('assert');
var _ = require('lodash');



describe('query engine', function () {

  var orm = SimpleORMFixture();


  describe('subqueries', function () {

    it('should work with a 1.N model association', function (cb) {
      orm.query({
        operations: {
          from: 'person',
          where: {
            id: [1,2],
            petCat: {
              name: 'randy'
            }
          },
          select: {
            name: true,
            id: true,
            petCat: {
              select: {
                name: true
              }
            }
          }
        }
      }).exec(function(err, results) {
        if (err) throw err;
        assert(results.get('cat'));
        assert(results.get('person'));
        assert(_.where(results.get('cat'), {name: 'Randy'}).length === 1);
        console.log(results);
        cb();
      });
    });



    it('should work with a N.1 collection association');

  });

});
