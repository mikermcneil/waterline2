
## Making Some ORM(s)

Simple:

```js
var orm1 = Waterline();

console.log(orm1);

//------[ORM]------
// • 0 model(s)
// • 0 datastore(s)
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
// • 0 datastore(s)
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
  datastores: { myFooDb: {} },
  adapters: { 'wl-myfoo': {} }
});


console.log(orm3);

//------[ORM]------
// • 4 model(s)
// • 1 datastore(s)
// • 1 adapter(s)
//-----------------

// In this case, each set of definitions is converted into an array
// of instantiated Waterline entities, inferring the `identity` from the key name.
// i.e., orm3.models[0].identity === 'werewolf'

```


## Working with models, datastores, adapters at runtime

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

##### Get your datastores or adapters

```js
orm3.datastores;
/*
[ ------[Datastore <myFooDb>]------
  { identity: 'myFooDb' }
  -------------------------------- ]
*/

var MyFooDb = orm.datastore('myFooDb');
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

##### Identify a new model, datastore, or adapter

Will override what's already there if something else exists w/ the same identity.

```js
orm3.identifyModel('pickle', {});
orm3.identifyDatastore('ram', {});
orm3.identifyAdapter('sails-memory', {});
```

##### "Forget" a model, datastore or adapter
```js
orm3.forgetModel('werewolf');
orm3.fogetDatastore('myFooDb');
orm3.forgetAdapter('wl-myfoo');
```
