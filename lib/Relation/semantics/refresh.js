/**
 * Module dependencies
 */

var _ = require('lodash');

var WLUsageError = require('root-require')('standalone/WLError/WLUsageError');


/**
 * Relation.prototype.refresh()
 *
 * Refresh this relation's datastore, adapter, associations and related
 * metadata (i.e. keys/junctions/associated relations) as well as any other
 * future configuration.  Should be run on participating relations whenever
 * the ontology changes.
 *
 * @chainable
 * @return {Relation}
 *
 * @api private
 */

module.exports = function refresh () {
  // console.log('\n\n********\n\nREFRESHING',this.identity);//, 'and its attributes:',this.attributes);

  // Closure access to `orm`,`identity`,etc. for use below
  var orm = this.orm;
  var identity = this.identity;
  var self = this;

  // Ensure ORM is known -- cannot refresh() without it.
  if (!orm) {
    throw new WLUsageError(util.format('Relation "%s" is not attached to an ORM', identity));
  }

  // Locate the adapter and datastore for this relation.
  var adapter = this.getAdapter();
  var datastore = this.getDatastore();

  // Default the `schema` flag based on the adapter's configuration
  if (adapter) {
    this.schema = this.schema||datastore.schema||adapter.schema||false;
  }

  // Determine this model's primary key, default to `id`
  this.primaryKey = this.primaryKey||'id';

  // TODO:
  // deprecate the `primaryKey` attribute option and replace it with a
  // top-level model property (`primaryKey`).
  // This is fine to do since, for most adapters, only one attribute can
  // be the primary key anyway.  And we can support any future multi-PK
  // stuff by allowing `somemodel.primaryKey` to be either a string (for
  // a single PK attribute) or an array of strings (for multiple pk attrs)

  // Normalize the definition of this relation and each of its attributes:
  // `tableName`+`cid`+`identity` --> `cid`
  this.cid = this.cid||this.tableName||this.identity;
  // console.log('ATTRS:',this.attributes,'\n---------*********----------');
  this.attributes = _.reduce(this.attributes, function (memo, attrDef, attrName) {

    // WL1-compatibility:
    // Tolerate non-object attribute definitions
    // (in WL1, some attributes on junctions are undefined)
    // For now, just ignore these undefined attribute definitions:
    if (!_.isObject(attrDef)) {
      return memo;
    }


    // console.log('--------------------\nNORMALIZING ATTRDEF for "'+attrName+'":::::',attrDef);
    // console.log('fieldName ==> ', attrDef.fieldName);
    // `columnName`+`fieldName`+attrName --> `fieldName`

    // Ensure a fieldName is known or inferred
    // (unless this is a collection association)
    if (!(attrDef.association && attrDef.association.collection)) {
      attrDef.fieldName = attrDef.fieldName||attrDef.columnName||attrName;
    }

    // console.log('AFTER::::::',attrDef,'\n--------------------');
    // `model` --> `association: { plural: false, entity: 'model', identity: '...' }`
    if (attrDef.model) {
      attrDef.association = _.defaultsDeep(attrDef.association||{}, {
        entity: 'model',
        identity: attrDef.model,
        plural: false
      });
    }
    // `collection` --> `association: { plural: true, entity: 'model', identity: '...' }`
    else if (attrDef.collection) {

      attrDef.association = attrDef.association||{};

      // Support string syntax for `through`
      if (_.isString(attrDef.through)) {
        // console.log('Expanded `through` (%s) in %s.%s',attrDef.through, identity, attrName);
        attrDef.association.through = {
          entity: 'model',
          identity: attrDef.through
        };
        delete attrDef.through;
      }

      attrDef.association = _.defaultsDeep(attrDef.association, {
        entity: 'model',
        identity: attrDef.collection,
        plural: true
      });

      // Take a second pass:
      attrDef.association = _.defaultsDeep(attrDef.association, {

        // `via`
        //
        // The name of the foreign key attribute on the other relation
        // referenced by this association.
        //
        // This option is only relevant for certain ARs (i.e. if this
        // association is persisted via backreference to a foreign key
        // attribute stored on another relation) But we have to normalize
        // it either way, since we don't know which AR this association
        // will use yet.
        via: attrDef.via,


        // `through`
        //
        // Metadata the junction table used in this association.
        //
        // These options are only relevant for certain ARs (i.e. if this
        // association will manage a junction) But we have to normalize
        // them either way, since we don't know which AR this association
        // will use yet.
        through: {

          // May be overridden to be `model`
          entity: 'junction',

          // `through.identity` and `through.datastore` will be determined
          // when the relevant AR is refreshed (since we don't necessarily
          // have the relevant models and/or junctions yet.)
        }

      });
    }


    // Remove top-level `collection`, `model`, `dominant, and `via` properties
    // to make sure there is exactly ONE authoritative method of accessing this
    // metadata across core: the `attrDef.association` sub-object
    delete attrDef.model;
    delete attrDef.collection;
    delete attrDef.via;
    delete attrDef.dominant;

    // Save the normalized definition and continue.
    memo[attrName] = attrDef;
    return memo;
  },{});

  // Locate an array of associations for this relation by examining each attribute.
  this.associations = _.reduce(this.attributes, function (memo, attrDef, attrName) {

    // Ignore primitive attributes
    // (TODO: consider..? maybe there's a use case for not doing this? e.g. mongo embeds?)
    if (!attrDef.association) return memo;

    // Save as an association (after tagging w/ the attrName)
    else {
      attrDef.name = attrName;
      memo.push(attrDef);
      return memo;
    }
  }, []);

  // NOTE:
  // None of the above takes care of determining the default,
  // built-in association rule to use, which must be calculated
  // after ALL of the relations have been refreshed.
  //
  // See the definition of `ORM.prototype.refresh()` for that.

  return this;
};

