# Waterline 2.0

> rewrite

## Usage

```sh
$ node
```

```js
var Waterline = require('./');
```



## Instantiate ORM(s)

Simple:

```js
var orm1 = Waterline();

console.log(orm1);

//------[ORM]------
// • 0 model(s)
// • 0 database(s)
// • 0 adapter(s)
//-----------------
```




By specifying an object of arrays of definition objects:

```js
var orm2 = Waterline({
  models: [{ identity: 'parakeet'}]
});

console.log(orm2);

//------[ORM]------
// • 1 model(s)
// • 0 database(s)
// • 0 adapter(s)
//-----------------

```



By specifying an object of objects of definition objects:

```js
var orm3 = Waterline({
  models: {
    werewolf: {},
    parakeet: {
      attributes: {}
    },
    pustule: {},
    automobile: {}
  },
  databases: { myFooDb: {} },
  adapters: { 'wl-myfoo': {} }
});


console.log(orm3);

//------[ORM]------
// • 4 model(s)
// • 1 database(s)
// • 1 adapter(s)
//-----------------

// In this case, each set of definitions is converted into an array
// of instantiated Waterline entities, inferring the `identity` from the key name.
// i.e., orm3.models[0].identity === 'werewolf'

```


## Working with models, databases, adapters at runtime

When entities are **changed** at runtime, you should use the _methods_ below. Otherwise, you can change `yourOrm.models`, `yourOrm.adapters`, etc. directly, just be sure and call `yourOrm.refresh()` afterwards.

> **NOTE:**
>
> This does not do any adapter-level data migration- it simply cleans up any events, etc.  It could be eliminated as a necessary step in the future (and use getters and setters instead), but I think it's better to make this sort of thing explicit.

##### Get your models

```js

console.log(orm3.models);

/*
[ ------[Model <werewolf>]------
  { attributes: {} }
  ------------------------------,
  ------[Model <parakeet>]------
  { attributes: {} }
  ------------------------------,
  ------[Model <pustule>]------
  { attributes: {} }
  -----------------------------,
  ------[Model <automobile>]------
  { attributes: {} }
  -------------------------------- ]
  */


// Or get an individual model:
var Parakeet = orm3.model('parakeet');

// This is basically the same as doing:
// _.find(orm3.models, { identity: 'parakeet' });

console.log(Parakeet);
/*
------[Model <parakeet>]------
  { attributes: {} }
  ------------------------------
*/
```

##### Get your databases or adapters

```js
orm3.databases;
/*
[ ------[Database <myFooDb>]------
  { identity: 'myFooDb' }
  -------------------------------- ]
*/

var MyFooDb = orm.database('myFooDb');
```


```
orm3.adapters;

/*
[ ------[Adapter <wl-myfoo>]------
  { identity: 'wl-myfoo' }
  -------------------------------- ]
*/

// Or get an individual adapter:
var MyFooAdapter = orm.adapter('wl-myfoo');
```

##### Identify a new model, database, or adapter

Will override what's already there if something else exists w/ the same identity.

```js
orm3.identifyModel('pickle', {});
orm3.identifyDatabase('ram', {});
orm3.identifyAdapter('sails-memory', {});
```

##### "Forget" a model, database or adapter
```js
orm3.forgetModel('werewolf');
orm3.fogetDatabase('myFooDb');
orm3.forgetAdapter('wl-myfoo');
```


## Advanced

### Constructors

So needless to say, you can always instantiate an ORM and a model, then grab the model instance and get its `.constructor`.  Same thing for Database, Adapter, and the ORM constructor itself.  But Waterline also exposes these at the top level for you:

```js
new Waterline.Model();
new Waterline.Database();
new Waterline.Adapter();
new Waterline.ORM();
```

### Qualifier methods

Waterline also provides some static methods for checking whether some input is an instantiated model, database, etc.:

```js
Waterline.Model.isModel( someMysteriousThing );
Waterline.Database.isDatabase( someMysteriousThing );
Waterline.Adapter.isAdapter( someMysteriousThing );
Waterline.ORM.isORM( someMysteriousThing );
```

## Everything Else

See the source code.  Play around with it, have a good time you know


## Contributing

#### Short-term Roadmap

1. Finish the query engine so we can pull it into Waterline v0.x.x.
2. Build shim that will allow Waterline v0.x.x to use the query engine.
3. Build shim that will allow Waterline v0.x.x adapters to work transparently with WL2.
4. Finish robust transaction support so we can pull it into Waterline v0.x.x.

#### Broad Goals

+ Better support client-side usage and relevant requirements:
  + Lightweight
  + Fewer dependencies (but holy shit we have to keep lodash)
+ Conform to/establish a standard that can be used in other languages.
+ Improve nomenclature / overloaded terminology.
+ Lots of other things- TODO: expand this section

#### Timeline

We'll see how this goes.  Who knows?  Maybe early-mid 2015 or maybe never- depends.  But I wanted to jot down the ideas now rather than letting them fester.

## License

MIT
