
/////////////////
//////     //////
////// (1) //////
//////     //////
/////////////////

```js
User.find().populate('pets')
```



/////////////////
//////     //////
////// (2) //////
//////     //////
/////////////////

```js
{
  from: 'user',
  select: {
    cats: {
      from: 'pet',
      select: {
        id: true
      },
      where: {
        species: 'feline'
      }
    }
  }
}
```



/////////////////
//////     //////
////// (3) //////
//////     //////
/////////////////

Now, we can't do an "absolute" criteria transformation.
Why?  Because the criteria will change depending on the context.
That is, the transformation relies on a free variable that can't be known
until actual results from previous queries are available.

E.g., here is the desired output, expressed in lisp:
(note the free variables, `X` and `Y`)

```lisp
.(
  .(from 'user')
  .(select
    .(cats
      .(from 'someuserpetjunction')
      .(where X)
      .(select
        .(pet
          .(from 'pet')
          .(where
            (whereUnion Y .(species 'feline'))
          )
          .(select .)
        )
      )
    )
  )
)
```

So then the goal of an association rule should be to modify the criteria in
some particular way, without needing to know the free variable's (X) value.


Fortunately, this can be concisely expressed in JavaScript using closure scope:

```js
function associationRule(subcriteria) {
  return function (parentPrimaryKeyValue) {
    var transformedSubcriteria = {};
    transformedSubcriteria
      from: 'petownership',
      owner: parentPrimaryKeyValue,
      select: {
        from: 'pet'
      }
    };

    return c;
  }
}
```



So our association rule takes a subcriteria like:

```js
{
  from: 'pets',
  select: {
    id: true
  }
}
```


And converts it to a function which, when called with the value of the free variable (X),
will return our final, properly-configured criteria object.  This will vary between batches
of records, and is generic enough to work.



One last thing-- the free variable can "take up" as much of the subcriteria as we like.
For instance, take the relevant subcriteria of the starting point criteria in the example
above (we'll do it in Lisp this time):


```lisp
.(
  .(from 'user')
  .(select
    .(cats
      .(from 'pet')
      .(where
        .(species 'feline')
      )
    )
  )
)
```


The most powerful way to transform this criteria is with an opaque, imperative function,
as we described before.  This allows for any imaginable transformation, and it can even
be asynchronous, allowing for additional network or disk lookups (or even something like
a machine learning algorithm) to run.


But this involves _writing_ that function, which is annoying.

So what if we replace even more of the criteria with free variables?

In the example below, instead of **just** X and Y, we also now have `F`, `W`, `L`, `Sk`, `Se`, and `So`:

```lisp
.(
  .(from F)
  .(where (whereUnion X W))
  .(limit L)
  .(skip Sk)
  .(sort So)
  .(select
    (selectUnion Se
      .(pet
        .(from 'pet')
        .(where
          (whereUnion Y .(species 'feline'))
        )
      )
    )
  )
)
```


This is more or less the "strategy" concept we've been searching for, and it's a lot like
an association rule "preset".

We'll stop this discussion here, since these preset strategies are not crucial for the first phase of
development, but it is an interesting thing to reflect on towards the goal of completely declarative,
implementation-agnostic data retrieval algorithms.

