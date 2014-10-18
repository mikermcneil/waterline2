# Querying

Waterline2 adds a lot of cool stuff.  I won't get to it all here.  But realize that you can still query things like you're used to:


###### Standard usage (node callback)
```js
User.find().exec(function (err, users){...})
```

###### Node callback as last argument

```js
User.find(function (err, users){...})
```

###### Promises
(but now you can plug in your own promise library)

```js
User.find()
.then(function (users){...})
.catch(function (err){...})
```

###### Switchbacks
(but now you can disable them or plug in your own EventEmitter)

```js
User.find().exec({
  success: function (users) {...}
  error: function (err) {...},
})
```


### Populates

As you probably know, Waterline supports populate queries (i.e. joins).

```js
// Look up User #6 and populate her files
User.findOne(6).populate('files').then(function (user6) {
  // user6.canAccess => [{...}, {...}, ...]
});
```


You can also filter/sort/paginate/project the results of each populated result set (on a per-parent-record-basis) by using the second argument to populate:

```js
// Find a list of all users between the ages of 45 and 55
// and populate their 5 most overdue book checkouts that took place
// at branch #37
User.find()
.where({
  age: {
    '>=': 45,
    '<=': 55
  }
})
.populate('checkouts', {
  where: { branch: 37 },
  limit: 5,
  sort: 'dueDate ASC'
})
.then(function (users) {
  // users.checkouts => [{...}, {...}, ...]
})
```


But in WL2, the normalized criteria syntax looks a little different than it used to for that type of query:

```js
{
  from: {entity: 'model', identity: 'user'},
  where: {},
  limit: undefined,
  skip: 0,
  sort: {},
  select: {
    '*': true,
    checkouts: {
      from: {entity: 'model', identity: 'librarycheckout'},
      select: { '*': true },
      where: { branch: 37 },
      limit: 5,
      skip: 0,
      sort: { dueDate: 1 }
    }
  }
}
```

And as you might be thinking, what that means is that now (at last!), populates can be infinitely nested.

A simple example:

```js
// Look up User #6 and populate her files
// (but now let's assume there is an intermediate model, i.e. "Permission")
User.findOne(6).populate('canAccess.files').then(function (user6) {
  // user6.canAccess => [{...}, {...}, ...]
  // user6.canAccess[0].files => [{...}, {...}, ...]
})
```



You can even filter/sort/paginate/project _nested_ populates, as deep as you like.  You cannot, (with _only this method_ at least) filter intermediate populates (i.e. if the Permission model had a `type` attribute, and we wanted to populate only those files associated via a `type:"read"` permission).

But we _can_ do it with WHERE subqueries.  Read on for more about that.




### WHERE Subqueries

With Waterline2, the ORM now supports WHERE subqueries.


```js
var now = new Date();

// Find all users with overdue library checkouts
User.find()
.where({
  checkouts: {
    dueDate:  { '<': now }
  }
})
.then(function (naughtyUsers){
  // naughtyUsers
})
```


These subqueries can be infinitely nested:

```js
var now = new Date();

// Find all users with overdue library checkouts
User.find()
.where({
  checkouts: {
    dueDate:  { '<': now }
  }
})
.then(function (naughtyUsers){
  // naughtyUsers
})
```


Here's a more complex example, which also uses `.populate()`:

```js
var now = new Date();

// Find the 5 most recent overdue library checkouts that contained
// a book titled "Robinson Crusoe"
LibraryCheckout.find()
limit(5)
.sort('createdAt DESC')
.where({
  dueDate: {'<': now },
  books: {
    title: 'Robinson Crusoe'
  }
})

// (also populate the user who checked out the books so we can
//  send them an email letting them know that their debt will be
//  forgiven if they go to our kid's robinson-crusoe-themed birthday
//  party next week)
.populate('cardholder')
.exec(...)
```


You can combine them with projections, populates.  Here's the fully expanded criteria object for the same query:


```js
{
  select: {
    '*': true,
    books: {

    }
  },
  where: {
    books: {
      whose: { title: 'Robinson Crusoe' },
      min: 1
    }
  },
  limit: 5,
  skip: 0,
  sort: {
    createdAt: -1
  }
}
```



> **NOTE:**
>
> Currently, the means by which parent records are qualified is fairly limited.
> (You really only have one qualifier operator: `min`)
> This syntax be extended over time to include more operators, but in the mean
> time, you can actually pass in a filter function instead.  Note that the filter
> function **must be synchronous** (it returns true to keep or false to reject.)
> To manipulate result sets at runtime depending on an _asynchronous_ operation,
> you must write a custom association rule (AR).
>
> ```js
> // Find users who checked out books whose titles include their first name
> // (Note that this is impossible with the vanilla syntax since there is currently
> // no declarative approach to address the result data from elsewhere in the query)
> User.find()
> .where({
>   checkouts: {
>     books: {
>       '&filter': function ourLittleCustomQualifier (someBook, itsCheckout, itsUser) {
>
>          // Note that if `itsUser.firstName` is `null`, the following would throw.
>          // Luckily, this method is wrapped in a try..catch inside Waterline core.
>          // If it throws, it's ok- the record will just be omitted.
>          return user.firstName.match()
>        }
>     }
>   }
> })
> ```
>
> (WARNING: The filter function approach discussed above not work yet-
>  will update this file when it does. Leaving this note here so I don't have
>  to document it again later.)



## xD/A Queries

When possible (for intra-datastore subqueries), WL2 will use an optimized approach to execute ORM `find`'s with as few queries as possible.

But one of the coolest things about Waterline, and a core philosophy of our team and contributors, is pure database agnosticism.  So to keep with the spirit of that perogative, _cross-datastore and cross-adapter associations/subqueries are supportedin Waterline 2_.

**HOWEVER** this comes at a cost.  The paging necessary to make this work across databases can be slow.  You should be careful and make reasonable decisions about where you house your data.

But the idea is that, when there's no other choice, it's pretty great to be able to rely on Waterline to take care of xD/A data manipulation/querying for you and have it all just work.  Plus, even though there will always be a lot more we could do to optimize the cursor, it's likely to be faster than anything you or I would write ourselves on a one-off basis (because how would you ever get the chance to spend enough time on it, yknow?)

