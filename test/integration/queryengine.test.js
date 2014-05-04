var SimpleORMFixture = require('../fixtures/SimpleORM.fixture');
var assert = require('assert');



describe('query engine', function () {

  var orm = SimpleORMFixture();


  describe('a simple Query', function () {

    var q = orm.query({
      operations: {
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

    it('should be usable directly via orm.query()', function (cb) {

      q.exec(function(err, results) {
        if (err) throw err;
        // console.log('Searched:',q);
        // console.log('Results:\n', results);
        cb();
      });
    });

  });




  describe('a Query with nested selects', function () {

    it('should be usable directly via orm.query()', function (cb) {
      var q = orm.query({
        operations: {
          from: 'person',
          where: {
            id: [1,2]
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
      });

      // Execute the query immediately- any other .exec()s
      // won't cause it to run again- just make it possible
      // to check out the output.
      q.exec();

      q.exec(function(err, results) {
        if (err) throw err;
        // console.log('Searched:',q);
        // console.log('Results:\n', results);

        assert(q.cache.get('cat'));
        assert(q.cache.get('person'));
        cb();
      });
    });


    it('should work with a 1.N model association', function (cb) {

      var q = orm.query({
        operations: {
          from: 'person',
          where: {
            id: [1,2]
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
        assert(q.cache.get('cat'));
        assert(q.cache.get('person'));
        cb();
      });
    });

    it('should work with a N.1 collection association', function (cb) {

      var q = orm.query({
        operations: {
          from: 'person',
          where: {
            id: [1,2]
          },
          select: {
            name: true,
            id: true,
            petOfCats: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }).exec(function(err, results) {
        if (err) throw err;
        assert(q.cache.get('cat'));
        assert(q.cache.get('person'));
        // console.log('Results:\n', results);
        cb();
      });
    });

  });



});
