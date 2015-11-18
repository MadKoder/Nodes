
function getSignalConnectionsId(signalId) {
    return "__" + signalId + "$Connections";
}

function makeChainedConnection(connectionGraph, library, prog) {
    // TODO check links existence and type
    var signalConnectionsId = getSignalConnectionsId(connectionGraph.signal.name);
    var links = connectionGraph.links;
    var argumentAst;
    // Only one link : it's a slot, adds directly to connections its id
    if(links.length == 1) {
        argumentAst = {
            "type": "Identifier",
            "name": links[0].name
        };
    } else {
        // Makes chain call : function(x) {slot(genN(genN-1(... gen0(x))));}
        // link[0](x)
        var callAst = ast.callExpression(links[0].name, [ast.identifier("x")]);
        var src = escodegen.generate(callAst);
        for(var i = 1; i < links.length; i++) {
            // links[i](links[i-1](...))
            callAst = ast.callExpression(links[i].name, [callAst]);
            var src = escodegen.generate(callAst);
        }
        // To use an expression as a statement, it must be wrapped in an expression statement;
        var exprStatement = {
            "type": "ExpressionStatement",
            "expression": callAst
        };
        argumentAst = ast.functionExpression(null, ["x"], [exprStatement]);
    }
    var src = escodegen.generate(argumentAst);
    var connectionAst = {
        "type": "ExpressionStatement",
        "expression": {
            "type": "CallExpression",
            "callee": {
                "type": "MemberExpression",
                "computed": false,
                "object": {
                    "type": "Identifier",
                    "name": signalConnectionsId
                },
                "property": {
                    "type": "Identifier",
                    "name": "push"
                }
            },
            "arguments": [argumentAst]
        }
    }
    prog.addStmnt(connectionAst);    
}

function makeSignalDef(signalGraph, library, prog) {
    // TODO check slot type
    var id = signalGraph.id.name;
    var connectionsId = getSignalConnectionsId(id);
    // var connectionsId = [];
    var connectionsAst = ast.varDeclaration(
        connectionsId,
        {
            "type": "ArrayExpression",
            "elements": []
        }
    );
    prog.addStmnt(connectionsAst);

    var argsParamsAst = [];
    // If the signal has a type, makes args/params ast
    // For the moment, the name is just "x"
    // TODO another name ?
    if(signalGraph.signalType != null)
    {
        argsParamsAst = [
            {
                "type": "Identifier",
                "name": "x"
            }
        ]
    }

    var iterationBodyAst = {
        "type": "BlockStatement",
        "body": [
            {
                "type": "ExpressionStatement",
                "expression": {
                    "type": "CallExpression",
                    "callee": {
                        "type": "MemberExpression",
                        "computed": true,
                        "object": {
                            "type": "Identifier",
                            "name": connectionsId
                        },
                        "property": {
                            "type": "Identifier",
                            "name": "i"
                        }
                    },
                    "arguments": argsParamsAst
                }
            }
        ]
    };

    var functionAst =
    {
        "type": "FunctionDeclaration",
        "id": {
            "type": "Identifier",
            "name": id
        },
        "params": argsParamsAst,
        "defaults": [],
        "body": {
            "type": "BlockStatement",
            "body": [
                ast.arrayIteration("i", connectionsId, iterationBodyAst)
            ]
        },
        "generator": false,
        "expression": false
    }
    prog.addStmnt(functionAst);        
}
