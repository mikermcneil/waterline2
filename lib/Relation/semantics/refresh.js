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
  // console.log('REFRESHING',this.identity, 'and its attributes:',this.attributes);

  // Closure access to `orm`,`identity`,etc. for use below
  var orm = this.orm;
  var identity = this.identity;
  var self = this;

  // Normalize the definition of this relation and each of its attributes:
  // `tableName`+`cid`+`identity` --> `cid`
  this.cid = this.cid||this.tableName||this.identity;
  this.attributes = _.mapValues(this.attributes, function (attrDef, attrName) {
    // `columnName`+`fieldName`+attrName --> `fieldName`
    attrDef.fieldName = attrDef.fieldName||attrDef.columnName||attrName;
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
      attrDef.association = _.defaultsDeep(attrDef.association||{}, {
        entity: 'model',
        identity: attrDef.collection,
        plural: true,
        via: attrDef.via
      });
    }

    // Remove top-level `collection`, `model`, and `via` properties
    // to enforce one method of accessing this information across core:
    // inside the `.association` sub-object.
    delete attrDef.model;
    delete attrDef.collection;
    delete attrDef.via;

    return attrDef;
  });

  // Default the `schema` flag based on the adapter's configuration
  var adapter = this.getAdapter();
  var datastore = this.getDatastore();
  if (adapter) {
    this.schema = this.schema||datastore.schema||adapter.schema||false;
  }


  // Ensure ORM is known -- cannot refresh() without it.
  if (!orm) {
    throw new WLUsageError(util.format('Relation "%s" is not attached to an ORM', identity));
  }

  // TODO: get actual primary key, etc. from waterline-schema
  // (already using it in `ORM.prototype.refresh()`)
  // TODO: if defaulting to `id`, we need to make sure the attribute actually exists
  this.primaryKey = this.primaryKey||'id';

  // console.log('Refreshed `this.primaryKey` FOR '+this.identity);

  // For each association, locate its configured rule if one exists.
  // Otherwise, default to built-in conventions.  Either way, refresh
  // the AssociationRule before moving on.
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

