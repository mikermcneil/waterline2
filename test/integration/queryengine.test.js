var SimpleORMFixture = require('../fixtures/SimpleORM.fixture');


describe('query engine', function () {

  var orm = SimpleORMFixture();

  describe('a Query', function () {

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
        else {
          cb();
          // console.log('Searched:',q);
          // console.log('Results:\n', results);
        }
      });
    });

  });


});
