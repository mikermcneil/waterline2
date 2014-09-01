# Some research on query language implementations

+ http://en.wikipedia.org/wiki/XQuery
+ http://en.wikipedia.org/wiki/JSONiq
+ http://en.wikipedia.org/wiki/FLWOR




For the lowest level of our query operators, we should study [jSONiq](http://en.wikipedia.org/wiki/JSONiq#Examples).


### FLWOR

```

*** FLWOR ***



F(or)
L(et)
W(here)
O(rder By)
R(eturn)
```


### FUCD

Now take what we just looked at and contrast it with:

```
*** FUCD ***

F(ind)
U(pdate)
C(reate)
D(estroy)
```

> (as in, if you tried to do _everything_ wth only find, update, create, and destroy, you'd be FUCD)



### Map/Reduce

[FLWOR's power](http://www.nonstopibiza.com/news_images/1252682465.jpg) is that it allows for map/reduce operations, where FUCD doesn't.  

**Tuple Templating (Map)**

FLWOR decouples the source data streams from the query results.  By expecting queries to return their desired tuple output format, the language begets inherent intentionful-ness of the output API (whereas in SQL, the actual format of what you get is wishy-washy-- what matters is the records you were able to access)

This allows a query author to perscribe the output format of the query and avoid marshalling it in his own code.  And even better yet, this approach allows an XPath/JSONiq runtime to optimize on a per-adapter basis based on logical cues (since projections can be implicitly discovered)

**Custom Aggregates and Aggregate Clauses (Reduce)**
FLWOR makes aggregations more flexible and simplifies the implementation of intermediately complex aggregation functions.  However, while FUCD is perhaps more pedestrian, it is concise and simple for non-technical folks to understand.

With `FOR`, `LET`, and `RETURN`, FLWOR gives us pretty much everything we need to build pretty much any referentially transparent function.
