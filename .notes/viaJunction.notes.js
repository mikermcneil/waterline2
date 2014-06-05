

    // // Since `refresh()` is called multiple times, don't emit an error
    // // if the model does not exist (at least for now) since it may just
    // // be that it hasn't been identified yet.
    // if (!throughModel) {
    //   // TODO:
    //   // re-evaluate this-- would be nice from a developer UX perspective
    //   // to find out there's a schema issue before query-time.
    //   // (need to merge this stuff back into a branched version of `waterline-schema`)

    //   // e.g.:
    //   // orm.error('Specified `through` references a model which does not currently exist.');
    //   return;
    // }

    // Define `adjoiningRelation` and `getFKToParent()` methods to provide
    // transparent access to the `through` model (as if it were a junction)
    // to the other AR methods defined below.
    // this.getJunction = function () {
    //   return throughModel;
    // };
    // this.attrDef.association.through.via = function () {
    //   return _.find(throughModel.attributes, function (_junctionAttrDef, _junctionAttrName){
    //     if (
    //       _junctionAttrDef.association &&
    //       _junctionAttrDef.association.plural === false &&
    //       _junctionAttrDef.association.identity === parent.identity &&
    //       _junctionAttrDef.association.entity === parent.entity &&
    //       _junctionAttrDef.association.via === attrName
    //     ) {
    //       return _junctionAttrName;
    //     }
    //   });
    // };
    // this.getFKToChild = function () {
    //   return _.find(throughModel.attributes, function (_junctionAttrDef, _junctionAttrName){
    //     if (
    //       _junctionAttrDef.association &&
    //       _junctionAttrDef.association.plural === false &&
    //       _junctionAttrDef.association.identity === _junctionAttrDef.association.identity &&
    //       _junctionAttrDef.association.entity === _junctionAttrDef.association.entity &&
    //       ( attrDef.association.via?
    //         _junctionAttrDef.association.via === attrDef.association.via : true)
    //     ) {
    //       return _junctionAttrName;
    //     }
    //   });
    // };


    // -------------------------------------------
    // ... todo: remove this stuff ...
    // --------||---------------------------------
    // --------\/---------------------------------
    // var junction = orm.junction(attrDef.association.through.identity);
    if (!this.adjoiningRelation) throw 'err..';
    // console.log('(=_=)/*  :: ',this.adjoiningRelation);
    // --------^^---------------------------------


    // Define `getJunction()` and `getFKToParent()` methods to provide
    // simple access to the junction within the other AR methods defined below.
    // this.getJunction = function () {
    //   return orm.junction(junctionIdent);
    // };
    // this.attrDef.association.through.via = function () {
    //   return _.find(orm.junction(junctionIdent).attributes, function (_junctionAttrDef, _junctionAttrName){
    //     if (
    //       _junctionAttrDef.association &&
    //       _junctionAttrDef.association.plural === false &&
    //       _junctionAttrDef.association.identity === parent.identity &&
    //       _junctionAttrDef.association.entity === parent.entity &&
    //       _junctionAttrDef.association.via === attrName
    //     ) {
    //       return _junctionAttrName;
    //     }
    //   });
    // };
    // this.getFKToChild = function () {
    //   return _.find(orm.junction(junctionIdent).attributes, function (_junctionAttrDef, _junctionAttrName){
    //     if (
    //       _junctionAttrDef.association &&
    //       _junctionAttrDef.association.plural === false &&
    //       _junctionAttrDef.association.identity === _junctionAttrDef.association.identity &&
    //       _junctionAttrDef.association.entity === _junctionAttrDef.association.entity &&
    //       ( attrDef.association.via?
    //         _junctionAttrDef.association.via === attrDef.association.via : true)
    //     ) {
    //       return _junctionAttrName;
    //     }
    //   });
    // };
