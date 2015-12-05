function makeThisDeclaration(id, defValAst) {
    return {
        "type": "ExpressionStatement",
        "expression": {
            "type": "AssignmentExpression",
            "operator": "=",
            "left": {
                "type": "MemberExpression",
                "computed": false,
                "object": {
                    "type": "ThisExpression"
                },
                "property": {
                    "type": "Identifier",
                    "name": id
                }
            },
            "right": defValAst
        }
    };
}

function makeDefInNode(defGraph, library){
    var id = defGraph.id.name;

    var expr = makeExpr(defGraph.val, library, {});
    
    // id = __def(function() {return expr.getAst(); });
    var defValAst = getDefInitAst(expr);
    
    var defDeclarationAst = makeThisDeclaration(id, defValAst);

    return {
        ast : defDeclarationAst,
        type : expr.type,
        getGetterAst : function(objectAst) {
            // objectAst.id.get()
            return {
                "type": "CallExpression",
                "callee": {
                    "type": "MemberExpression",
                    "computed": false,
                    "object": ast.memberExpression(objectAst, id),
                    "property": {
                        "type": "Identifier",
                        "name": "get"
                    }
                },
                "arguments": []
            };
        }
    };
}

function makeVarInNode(varGraph, library) {
    var id = varGraph.id.name;     
    var expr = makeExpr(varGraph.val, library, {});
    // TODO
    // prog.body = prog.body.concat(expr.instancesAst);
    
    var declaratorInit = expr.getAst();
    if(isId(varGraph.val)) {
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
    var varDeclarationAst = makeThisDeclaration(id, declaratorInit);

    return {
        ast : varDeclarationAst,
        type : expr.type,
        getGetterAst : function(objectAst) {
            // objectAst.id
            return ast.memberExpression(objectAst, id);
        }
    };
}

function makeNodeDef(nodeGraph, library, prog, sourceToSinks) {
    var id = nodeGraph.id.name;

    var bodyAst = [thatAst];
    
    // Adds class definition
    var attribs = {};
    var typeId = "__" + id + "$Type";
    library.classes[typeId] = function(typeArgs) {
        return {
            attribs : attribs
        };
    };

    var localLibrary = makeLocalLibrary(library);

    // Adds self node getter in local node library
    // self.getter = that
    var selfGetterAst = {
            "type": "Identifier",
            "name": "that"
    };
    localLibrary.nodes["self"] = new Node(selfGetterAst, makeBaseType(typeId));

    // Iterate on fields
    /////////////////////
    var fieldsNodes = {};
    _.each(nodeGraph.fields, function(fieldGraph) {
        if(fieldGraph.type == "Def") {
            var defDeclaration = makeDefInNode(fieldGraph, localLibrary);
            bodyAst.push(defDeclaration.ast);
            var fieldName = fieldGraph.id.name;
            attribs[fieldName] = {
                type : defDeclaration.type,
                getGetterAst : defDeclaration.getGetterAst
            };
        } else if(fieldGraph.type == "Var") {
            var varDeclaration = makeVarInNode(fieldGraph, localLibrary);
            bodyAst.push(varDeclaration.ast);
            var fieldName = fieldGraph.id.name;
            attribs[fieldName] = {
                type : varDeclaration.type,
                getGetterAst : varDeclaration.getGetterAst
            };

            // Builds sink list var name for this field
            // The member path is in the form n.x, this is what is stored in sourceToSinks
            var memberPath = id + "." + fieldName;
            if(memberPath in sourceToSinks) {
                // should be field$sinkList
                var sinkListVarName = fieldName + "$sinkList";
                // that.id
                var getterAst = ast.memberExpression(
                    ast.id("that"),
                    id
                );
                fieldsNodes[fieldName] = new Node(getterAst, varDeclaration.type, sinkListVarName);
                var sinks = sourceToSinks[memberPath];
                var declaratorInit = {
                    "type": "ArrayExpression",
                    "elements": []//_.map(sinks, ast.id)
                };
                bodyAst.push(makeThisDeclaration(sinkListVarName, declaratorInit));
            }
        }
    });

    var nodeDefAst = {
        "type": "VariableDeclaration",
        "declarations": [
        {
            "type": "VariableDeclarator",
            "id": {
                "type": "Identifier",
                "name": id
            },
            "init": {
                "type": "NewExpression",
                "callee": {
                    "type": "FunctionExpression",
                    "id": null,
                    "params": [],
                    "defaults": [],
                    "body": {
                        "type": "BlockStatement",
                        "body": bodyAst
                    },
                    "generator": false,
                    "expression": false
                },
                "arguments": []
            }
        }
        ],
        "kind": "var"
    };

    prog.addStmnt(nodeDefAst);

    var getterAst = {
            "type": "Identifier",
            "name": id
    };
    library.nodes[id] = new Node(getterAst, makeBaseType(typeId), "", fieldsNodes);
}
