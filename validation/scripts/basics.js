function makeJsSrc(nodeSrc) {
    var canonicalStr = syntax.convert(nodeSrc);
    var codeGraph = parser.parse(canonicalStr);
    var prog = compileGraph(codeGraph, library);
    var src = escodegen.generate(prog);
    return src;
}

function basics(nodeSrc)
{
    eval(makeJsSrc(nodeSrc));
    assertEqual(litVar, 2, "Literal Var");
    assertEqual(litDef.get(), 3, "Literal Def");
    assertEqual(exprVar, 5, "Expression Var");
    assertEqual(exprDef.get(), 15 , "Expression Def");
}
