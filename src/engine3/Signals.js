
function getSignalConnectionsId(signalId) {
    return "__" + signalId + "$Connections";
}

function makeChainedConnection(connectionGraph, library, prog) {
    // TODO check links existence and type
    var signalConnectionsId = getSignalConnectionsId(connectionGraph.signal.name);
    var slotId = connectionGraph.links[0].name;
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
            "arguments": [
                {
                    "type": "Identifier",
                    "name": slotId
                }
            ]
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
