function classes(nodeSrc)
{
    var jsSrc = makeJsSrc(nodeSrc);
    eval(jsSrc);

    assertEqual(instance.varAttr, 1, "Instance var");
    assertEqual(instance.defAttr.get(), 11, "Instance def");
    assertEqual(varFromInstanceVar, 1, "Var from instance def");
    assertEqual(defFromInstanceVar.get(), 1, "Def from instance var");
    assertEqual(defFromInstanceDef.get(), 11, "Def from instance def");

    setVarAttr();
    assertEqual(instance.varAttr, 2, "Instance var after setVarAttr");
    assertEqual(instance.defAttr.get(), 12, "Instance def after setVarAttr");
    assertEqual(varFromInstanceVar, 1, "Var from instance def after setVarAttr");
    assertEqual(defFromInstanceVar.get(), 2, "Def from instance var after setVarAttr");
    assertEqual(defFromInstanceDef.get(), 12, "Def from instance def after setVarAttr");

    setInstance();
    assertEqual(instance.varAttr, 3, "Instance var after setInstance");
    assertEqual(instance.defAttr.get(), 13, "Instance def after setInstance");
    assertEqual(varFromInstanceVar, 1, "Var from instance def after setInstance");
    assertEqual(defFromInstanceVar.get(), 3, "Def from instance var after setInstance");
    assertEqual(defFromInstanceDef.get(), 13, "Def from instance def after setInstance");
}
