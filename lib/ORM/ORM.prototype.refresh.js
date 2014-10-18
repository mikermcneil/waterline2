/**
 * Module dependencies
 */

var _ = require ('lodash');
var WaterlineSchema = require('waterline-schema');

var buildAR = require('../AssociationRule/instantiate-association-rule');



/**
 * #ORM.prototype.refresh()
 *
 * Normalize / validate the ontology.
 * Check datastore configuration, validate model schemas, etc.
 * Run `waterline-schema` on this ORM instance to detect any
 * weird stuff and get a serialized schema object.
 *
 * @chainable
 * @return {ORM}
 */

module.exports = function refresh () {

  var orm = this;

  // console.log('REFRESHING ORM');

  // Get waterline-schema to fail silently, returning programmatically
  // understandable error objects, instead of try/catch
  try {

    // Mutates entities to be WL1.0-backwards-compatible.
    var modelsAsObj = _.reduce(this.models, function (memo, obj) {
      var obj2 = _.cloneDeep(obj);
      obj2.prototype = obj2;
      memo[obj.identity] = obj2;
      return memo;
    }, {});
    var datastoresAsObj = _.reduce(this.datastores, function (memo, obj) {
      var obj2 = _.cloneDeep(obj);
      obj2.prototype = obj2;
      memo[obj.identity] = obj2;
      return memo;
    }, {});
    var defaults = {};

    // We then pass these WL1.0 objects into `waterline-schema` to
    // get a schema and validate the ORM's state.
    // this.WL1Schema = WaterlineSchema(modelsAsObj, datastoresAsObj, defaults);
    // console.log('---------------WLSCHEMA------------------\n',require('util').inspect(this.WL1Schema, false, null));
    // console.log('</WLSCHEMA>------------------------------------');


    // log.skip(require('util').inspect(modelsAsObj, false, null));
  }
  catch(e) {
    // console.error('WLSCHEMA_ERROR:',e);
    // ...
    // this.WL1Schema = {};
  }

  //
  // TODO: implement a more intelligent `ORM.prototype.refresh`
  // that uses a `while` or recursive strategy to untangle and refresh
  // everything on the fly rather than brute-forcing it (see below)
  // //

  // _(this.models).each(function (currentModel) {
  //   currentModel.refresh();
  // });


  // console.log('\n\n');
  // console.log('************************');
  // console.log('Refreshing all MODELS');
  // console.log('************************');

  // Refresh models
  _(this.models).each(function (model) {
    model.refresh();
  });

  // console.log('\n\n');
  // console.log('************************');
  // console.log('Building ARs on each model...');
  // console.log('************************');

  // After ALL models have been refreshed, go through
  // and replace each of their `associationRules` arrays,
  // with a set of instantiated ARs.
  _(this.models).each(function (model) {
    model.associationRules = [];
    _(model.associations).each(function (attrDef){
      var rule = buildAR(attrDef, model);
      if (rule) model.associationRules.push(rule);
    });
    // console.log('built %s association rules for model: %s', model.associationRules.length, model.identity);
  });

  // console.log('\n\n');
  // console.log('************************');
  // console.log('Refreshing ARs on each model...');
  // console.log('************************');

  // Now that all of the ARs for models have been created,
  // go through and call `refresh()` on each one.
  // (this will identify any necessary junctions w/ the ORM)
  _(this.models).each(function (model) {
    _(model.associationRules).each(function (rule) {
      rule.refresh();
    });
  });


  // console.log('\n\n');
  // console.log('************************');
  // console.log('Refreshing JUNCTIONS...');
  // console.log('************************');

  // Now, refresh all junctions
  _(this.junctions).each(function (junction) {
    junction.refresh();
  });

  // console.log('\n\n');
  // console.log('************************');
  // console.log('Building ARs on each junction...');
  // console.log('************************');

  // After ALL junctions have been refreshed, go through
  // and replace each of their `associationRules` arrays,
  // with a set of instantiated ARs.
  _(this.junctions).each(function (junction) {
    junction.associationRules = [];
    _(junction.associations).each(function (attrDef){
      var rule = buildAR(attrDef, junction);
      if (rule) junction.associationRules.push(rule);
    });
  });

  // console.log('\n\n');
  // console.log('************************');
  // console.log('Refreshing ARs on each junction...');
  // console.log('************************');

  // Now that all of the ARs for junctions have been created,
  // go through and call `refresh()` on each one.
  // (this will identify any necessary junctions w/ the ORM)
  _(this.junctions).each(function (junction) {
    _(junction.associationRules).each(function (rule) {
      rule.refresh();
    });
  });


  /////////////////////////////////////////////////////////////////
  // Refresh models ONE LAST TIME to build association rules for
  // virtual backreference associations.
  /////////////////////////////////////////////////////////////////

  // Refresh models
  _(this.models).each(function (model) {
    model.refresh();
  });

  // console.log('\n\n');
  // console.log('************************');
  // console.log('Building ARs on each model...');
  // console.log('************************');

  // After ALL models have been refreshed, go through
  // and replace each of their `associationRules` arrays,
  // with a set of instantiated ARs.
  _(this.models).each(function (model) {
    model.associationRules = [];
    _(model.associations).each(function (attrDef){
      var rule = buildAR(attrDef, model);
      if (rule) model.associationRules.push(rule);
    });
    // console.log('built %s association rules for model: %s', model.associationRules.length, model.identity);
  });

  // console.log('\n\n');
  // console.log('************************');
  // console.log('Refreshing ARs on each model...');
  // console.log('************************');

  // Now that all of the ARs for models have been created,
  // go through and call `refresh()` on each one.
  // (this will identify any necessary junctions w/ the ORM)
  _(this.models).each(function (model) {
    _(model.associationRules).each(function (rule) {
      rule.refresh();
    });
  });


  // console.log(orm.models);

  return this;
};

