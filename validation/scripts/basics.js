function basics(nodeSrc)
{
    var jsSrc = makeJsSrc(nodeSrc);
    eval(jsSrc);

    assertEqual(litVar, 2, "Literal Var");
    assertEqual(litDef.get(), 3, "Literal Def");
    assertEqual(exprVar, 5, "Expression Var");
    assertEqual(exprDef.get(), 15 , "Expression Def");
    assertEqual(substractVar, 10 , "Substract var");
}
