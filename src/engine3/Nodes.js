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
        hasGetter : true
    };
}

function makeVarInNode(varGraph, library, prog, sourceToSinks, sinksListDeclarations) {
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
        hasGetter : false
    };
}

function makeNodeDef(nodeGraph, library, prog) {
    var id = nodeGraph.id.name;

    var thatAst = {
        "type": "VariableDeclaration",
        "declarations": [
            {
                "type": "VariableDeclarator",
                "id": {
                    "type": "Identifier",
                    "name": "that"
                },
                "init": {
                    "type": "ThisExpression"
                }
            }
        ],
        "kind": "var"
    };
    

    var bodyAst = [thatAst];
    
    var localLibrary = makeLocalLibrary(library);

    var getterAst = {
            "type": "Identifier",
            "name": "that"
    };
    var typeId = "__" + id + "$Type";
    localLibrary.nodes["self"] = new Node(getterAst, makeBaseType(typeId));

    var localVarsType = {};
    var localFieldsHasGetter = {};
    localLibrary.classes[typeId] = function(typeArgs) {
        return {
            varsType : localVarsType,
            fieldsHasGetter : localFieldsHasGetter
        };
    };

    var fieldsType = {};
    var fieldsHasGetter = {};
    _.each(nodeGraph.fields, function(fieldGraph) {
        if(fieldGraph.type == "Def") {
            var defDeclaration = makeDefInNode(fieldGraph, localLibrary);
            bodyAst.push(defDeclaration.ast);
            var fieldName = fieldGraph.id.name;
            fieldsType[fieldName] = defDeclaration.type;
            fieldsHasGetter[fieldName] = defDeclaration.hasGetter;

            localVarsType[fieldName] = defDeclaration.type;
            localFieldsHasGetter[fieldName] = defDeclaration.hasGetter;
        } else if(fieldGraph.type == "Var") {
            var varDeclaration = makeVarInNode(fieldGraph, localLibrary);
            bodyAst.push(varDeclaration.ast);
            var fieldName = fieldGraph.id.name;
            fieldsType[fieldName] = varDeclaration.type;
            fieldsHasGetter[fieldName] = varDeclaration.hasGetter;

            localVarsType[fieldName] = varDeclaration.type;
            localFieldsHasGetter[fieldName] = varDeclaration.hasGetter;
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
    library.nodes[id] = new Node(getterAst, makeBaseType(typeId));

    library.classes[typeId] = function(typeArgs) {
        return {
            varsType : fieldsType,
            fieldsHasGetter : fieldsHasGetter
        };
    };
}
