var SimpleORMFixture = require('../fixtures/SimpleORM.fixture');


var orm = SimpleORMFixture();

var q = orm.query({
  operations: {
    where: {
      id: [1,2]
    },
    select: {
      // name: true,
      // id: true
    }
  }
});

var r = q.exec(function(err, results) {
  if (err) return console.error(err);
  else {
    console.log('Searched:',q);
    console.log('Results:\n', results);
  }
});
