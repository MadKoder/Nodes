function classes(nodeSrc)
{
    var jsSrc = makeJsSrc(nodeSrc);
    eval(jsSrc);

    assertEqual(instance.varAttr, 1, "Instance var");
    assertEqual(instance.defAttr.get(), 11, "Instance def");
    assertEqual(varFromInstanceVar, 1, "Var from instance var");
    assertEqual(defFromInstanceVar.get(), 1, "Def from instance var");
    assertEqual(defFromInstanceDef.get(), 11, "Def from instance def");

    setVarAttr();
    assertEqual(instance.varAttr, 2, "Instance var after setVarAttr");
    assertEqual(instance.defAttr.get(), 12, "Instance def after setVarAttr");
    assertEqual(varFromInstanceVar, 1, "Var from instance var after setVarAttr");
    assertEqual(defFromInstanceVar.get(), 2, "Def from instance var after setVarAttr");
    assertEqual(defFromInstanceDef.get(), 12, "Def from instance def after setVarAttr");

    instance.inc(10);
    assertEqual(instance.varAttr, 12, "Instance var after instance.inc(10)");
    assertEqual(instance.defAttr.get(), 22, "Instance def after instance.inc(10)");
    assertEqual(varFromInstanceVar, 1, "Var from instance var after instance.inc(10)");
    assertEqual(defFromInstanceVar.get(), 12, "Def from instance var after instance.inc(10)");
    assertEqual(defFromInstanceDef.get(), 22, "Def from instance def after instance.inc(10)");

    setInstance();
    assertEqual(instance.varAttr, 3, "Instance var after setInstance");
    assertEqual(instance.defAttr.get(), 13, "Instance def after setInstance");
    assertEqual(varFromInstanceVar, 1, "Var from instance def after setInstance");
    // TODO Decide if we can def from fields of a var ref
    // Question : should such a def follow the reference at the moment of the declaration
    // or the node
    // assertEqual(defFromInstanceVar.get(), 3, "Def from instance var after setInstance");
    // assertEqual(defFromInstanceDef.get(), 13, "Def from instance def after setInstance");

    assertEqual(nestedInstance.varAttr, 1, "Nested instance var");
    assertEqual(nestedInstance.defAttr.get(), 11, "Nested instance def");
    assertEqual(compoundInstance.nested.varAttr, 1, "Nested in compound instance var");
    assertEqual(compoundInstance.nested.defAttr.get(), 11, "Nested in compound instance def");

    compoundInstance.inc(10);
    assertEqual(nestedInstance.varAttr, 11, "Nested instance var after inc");
    assertEqual(nestedInstance.defAttr.get(), 21, "Nested instance def after inc");
    assertEqual(compoundInstance.nested.varAttr, 11, "Nested in compound instance var after inc");
    assertEqual(compoundInstance.nested.defAttr.get(), 21, "Nested in compound instance def after inc");
}
