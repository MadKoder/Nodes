function objects(nodeSrc)
{
    eval(makeJsSrc(nodeSrc));

    assertEqual(litObj.objDef.get(), 10, "Object def");
    assertEqual(litObj.objDefFromSelf.get(), 20, "Object def from self");
    assertEqual(litObj.objVar, 20, "Object var");
    assertEqual(litObj.objVarFromSelf, 40, "Object var from self");
    
    assertEqual(defFromObjDef.get(), 20, "Def from object def");
    assertEqual(defFromObjDefFromSelf.get(), 20, "Def from object def from self");
    assertEqual(defFromObjVar.get(), 20, "Def from object var");
    assertEqual(varFromObjDef, 10, "Var from object def");
    assertEqual(varFromObjVar, 30, "Var from object var");

    tick();

    assertEqual(litObj.objDef.get(), 110, "Object def after tick");
    assertEqual(litObj.objDefFromSelf.get(), 120, "Object def from self after tick");
    assertEqual(litObj.objVar, 100, "Object var after tick");
    assertEqual(litObj.objVarFromSelf, 40, "Object var from self after tick");
    
    assertEqual(defFromObjDef.get(), 120, "Def from object def after tick");
    assertEqual(defFromObjDefFromSelf.get(), 120, "Def from object def from self after tick");
    assertEqual(defFromObjVar.get(), 100, "Def from object var after tick");
    assertEqual(varFromObjDef, 10, "Var from object def after tick");
    assertEqual(varFromObjVar, 30, "Var from object var after tick");
}
