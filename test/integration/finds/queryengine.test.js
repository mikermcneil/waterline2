var assert = require('assert');


// fixtures
var PeopleAndTheirCats = require('root-require')('test/fixtures/PeopleAndTheirCats');


describe('query engine', function () {

  var orm = PeopleAndTheirCats();


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
        criteria: {
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

        assert(q.heap.get('cat'));
        assert(q.heap.get('person'));
        cb();
      });
    });


    it('should work with a 1.N model association', function (cb) {

      var q = orm.query({
        criteria: {
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
        assert(q.heap.get('cat'));
        assert(q.heap.get('person'));
        cb();
      });
    });

    it('should work with a N.1 collection association', function (cb) {

      var q = orm.query({
        criteria: {
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
        assert(q.heap.get('cat'));
        assert(q.heap.get('person'));
        // console.log('Results:\n', results);
        cb();
      });
    });

  });



});







return;

////////////////////////////////////////////////////////////////////////
///
/// ||    TODO: turn these into proper tests later-
/// \/    (currently i'm just running them in the node repl)
////////////////////////////////////////////////////////////////////////


// Test 1:
//
var orm = PeopleAndTheirCats();
var q = orm.model('person').find({
  where: {
    petCat: { whose: {id: 1} }
  },
  select: {
    id: true,
    name: true,
    email: true,
    petCat: {
      id: true
    }
  }
});
q.log();

// setTimeout(function () {
//   q.heap;
// });




// Test 2:
//

var orm = PeopleAndTheirCats();
var q = orm.model('person').find({
  where: {
    petOfCats: { whose: {id: 1} }
  },
  select: {
    id: true,
    name: true,
    email: true,
    petOfCats: {}
  }
});
q.log();


// Test 3:
//

var orm = PeopleAndTheirCats();
var q = orm.model('person').find({
  where: {
    petOfCats: { whose: {name: 'randy' } }
  },
  select: {
    id: true,
    name: true,
    email: true,
    petCat: {
      select: {
        id: true,
        name: true
      }
    },
    petOfCats: {
      select: {
        id: true,
        name: true
      }
    }
  }
});
q.log();





// Test 4:
//

var orm = PeopleAndTheirCats();
var q = orm.model('person').find({
  where: {
    petOfCats: { whose: {name: ['randy', 'fluffy'] } }
  },
  select: {
    id: true,
    name: true,
    email: true,
    petCat: {
      select: {
        id: true,
        name: true
      }
    },
    petOfCats: {
      select: {
        id: true,
        name: true
      }
    }
  }
});
q.log();




// Test 5:
//
// expected-> []

var orm = PeopleAndTheirCats();
var q = orm.model('person').find({
  where: {
    petOfCats: { whose: {name: ['randy', 'fluffy'] } },
    petCat: {
      whose: {
        name: 'danger'
      }
    }
  },
  select: {
    id: true,
    name: true,
    email: true,
    petCat: {
      select: {
        id: true,
        name: true
      }
    },
    petOfCats: {
      select: {
        id: true,
        name: true
      }
    }
  }
});
q.log();



// Test 6:
//
// expected-> []

var orm = PeopleAndTheirCats();
var q = orm.model('person').find({
  where: {
    petOfCats: { whose: {name: ['fluffy'] } },
    petCat: {
      whose: {
        name: 'fluffy'
      }
    }
  },
  select: {
    id: true,
    name: true,
    email: true,
    petCat: {
      select: {
        id: true,
        name: true
      }
    },
    petOfCats: {
      select: {
        id: true,
        name: true
      }
    }
  }
});
q.log();



// Test 7:
//
// expected -> [3] (person w/ id===3)

var orm = PeopleAndTheirCats();
var q = orm.model('person').find({
  where: {
    petOfCats: { whose: {name: {contains: 'bailey'} } },
    petCat: {
      whose: {
        name: 'fluffy'
      }
    }
  },
  select: {
    id: true,
    name: true,
    email: true,
    petCat: {
      select: {
        id: true,
        name: true
      }
    },
    petOfCats: {
      select: {
        id: true,
        name: true
      }
    }
  }
});
q.log();
