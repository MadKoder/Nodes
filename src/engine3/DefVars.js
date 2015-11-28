function makeVar(nodeGraph, library, prog, sourceToSinks, sinksListDeclarations) {
    var id = nodeGraph.id.name;     
    var expr = makeExpr(nodeGraph.val, library, {});
    prog.body = prog.body.concat(expr.instancesAst);
    
    var declaratorInit = expr.getAst();
    if(isId(nodeGraph.val)) {
        // If initial expression is a reference, clone its value
        // so any change to the var won't impact the referenced node
        // _.clone(expr.getAst(), true)
        declaratorInit = {
            "type": "CallExpression",
            "callee": {
                "type": "MemberExpression",
                "computed": false,
                "object": {
                    "type": "Identifier",
                    "name": "_"
                },
                "property": {
                    "type": "Identifier",
                    "name": "clone"
                }
            },
            "arguments": [
                expr.getAst(),
                {
                    "type": "Literal",
                    "value": true,
                    "raw": "true"
                }
            ]
        };
    }
    // if expr is reference : var id = _.clone(expr.getAst(), true);
    // else var id = expr.getAst();
    var varDeclaration = ast.varDeclaration(id, declaratorInit);
    prog.addStmnt(varDeclaration);

    // Setup the sink list of the var
    var sinkListVarName = "";
    if(id in sourceToSinks) {
        sinkListVarName = id + "$sinkList";
        var sinks = sourceToSinks[id];
        // It's an array made of the id of the leaf sinks
        // var id$sinkList = [_.map(sinks, ast.id)];
        var declaratorInit = {
            "type": "ArrayExpression",
            "elements": _.map(sinks, ast.id)
        };
        var varDeclaration = ast.varDeclaration(sinkListVarName, declaratorInit);
        // instantiation of the list is made at the end of the program so that
        // all references are valid
        sinksListDeclarations.push(varDeclaration);
    }
    // getter == id
    var getterAst = ast.id(id);
    library.nodes[id] = new Node(getterAst, expr.type, sinkListVarName);
}

function makeDef(nodeGraph, library, prog) {
    var id = nodeGraph.id.name;
    var expr = makeExpr(nodeGraph.val, library, {});                    
    prog.body = prog.body.concat(expr.instancesAst);
    
    // id = _def(function() {return expr.getAst(); });
    var varDeclaration = ast.varDeclaration(
        id,
        {
            "type": "CallExpression",
            "callee": {
                "type": "Identifier",
                "name": "__def"
            },
            "arguments": [
                {
                    "type": "FunctionExpression",
                    "params": [],
                    "body": {
                        "type": "BlockStatement",
                        "body": [
                            {
                                "type": "ReturnStatement",
                                "argument": expr.getAst()
                            }
                        ]
                    },
                }
            ]
        });
    prog.addStmnt(varDeclaration);
    // getter == id.get()
    var getterAst = {
        "type": "CallExpression",
        "callee": {
            "type": "MemberExpression",
            "computed": false,
            "object": {
                "type": "Identifier",
                "name": id
            },
            "property": {
                "type": "Identifier",
                "name": "get"
            }
        },
        "arguments": []
    };
    library.nodes[id] = new Node(getterAst, expr.type);
}
