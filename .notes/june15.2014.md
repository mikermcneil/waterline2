

Find all the towns-
  for each one, populate the 25 most affluent inhabitants (current or former) that have at least 5 male friends.

```
{
  from: 'town',
  select {
    currentOrFormerInhabitants: {
      limit: 25,
      sort: {
        netWorth: -1
      },
      where: {
        age: { '>': 55 },
        friends: {
          count: { '<': 5 },
          whose: {
            gender: 'male'
          }
        }
      }
    }
  }
}
```

====================================================

(this time let's simplify it a bit)

Find all the towns-
  for each one, populate the 25 most affluent inhabitants (current or former)

Here's an example of the wrapped query for one particular batch of towns after it was expanded by the viaJunctor AR:

```
{
  from: 'town',
  select {
    currentOrFormerInhabitants: {
    {
      from: 'person',
      limit: 25,
      sort: {
        netWorth: -1
      },
      where: {
        &through_rentalapplication_0: {
          from: 'rentalapplication',
          count: { '>=': 1 },
          whose: {
            _town: [1,2,3,4,5]
          }
        }
      }
    }
  }
}
```


====================================================

## new ideas/thoughts

• associations are really just aggregations that return vector (instead of scalar) values
  • e.g. `[{id:1,name:'Russell'},{id:2,name:'Lianne'}]` instead of `3`

• use virtual fields to solve `viaJunctor`-type associations
  • the alternative is to allow for subsorting, but the syntax is weird and it is an exception just for this one case, rather than a feature which is reusable
  • so we should use virtual fields
  • which means we need virtual field support


• WHERE+WHOSE clauses are really aggregations.  Here's what I mean:
  • When we do the standard whose+min thing, what we're really saying is:
    `SELECT * FROM user WHERE (SELECT COUNT(*) FROM pigeon)>0`
  • So why not just be explicit about that?  It can still be made to be human readable,
    and even accept the original syntax if it's better.
  • ```
    {
      where: {
        age: { '>': 55 },
        name: { 'startsWith': 'Santa' },
        petReindeer: {
          from: 'reindeer',
          count: { '>': 1 },
          whose: {
            name: { 'startsWith': 'Rudolph' }
          }
        }
      }
    }
    ```

• make identity optional in FROM clause

• allow `entity` to refer to a URL:

```
from: {
  entity: 'url',
  method: 'get',
  path: '/foobar'
}
```

• allow `entity` to refer to an asynchronous fn

```
from: {
  entity: function (criteria,cb){
    cb();
  }
}
```
