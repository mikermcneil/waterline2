# Constructors

So needless to say, you can always instantiate an ORM and a model, then grab the model instance and get its `.constructor`.  Same thing for Datastore, Adapter, and the ORM constructor itself.  But Waterline also exposes these at the top level for you:

```js
new Waterline.Model();
new Waterline.Datastore();
new Waterline.Adapter();
new Waterline.ORM();
```

### `instanceof` methods

Waterline also provides some static methods for checking whether some input is an instantiated model, datastore, etc.:

```js
Waterline.Model.isModel( someMysteriousThing );
Waterline.Datastore.isDatastore( someMysteriousThing );
Waterline.Adapter.isAdapter( someMysteriousThing );
Waterline.ORM.isORM( someMysteriousThing );
```
