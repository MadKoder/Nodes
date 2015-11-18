
function makeGenDef(genGraph, library, prog) {
    // TODO check types
    var localLibrary = makeLocalLibrary(library);
    var paramsGraph = genGraph.params;
    fillLocalLibraryWithParams(localLibrary, paramsGraph);

    var statementAst = makeStatement(genGraph.statement, localLibrary, {});
    // If statement is not already a block, put it into a block
    if(genGraph.statement.type != "StatementBlock") {
        statementAst =  {
            "type": "BlockStatement",
            "body": [statementAst]
        };
    }
    var paramsAst = _.map(paramsGraph, function(param) {
        return {
            "type": "Identifier",
            "name": param.id.name
        }
    });

    var genAst = {
        "type": "FunctionDeclaration",
        "id": {
            "type": "Identifier",
            "name": genGraph.id.name
        },
        "params":paramsAst,
        "defaults": [],
        "body": statementAst,
        "generator": false,
        "expression": false
    };

    prog.addStmnt(genAst);    
}
