function makeDefInNode(defGraph, library){
    var id = defGraph.id.name;

    var expr = makeExpr(defGraph.val, library, {});
    
    // id = __def(function() {return expr.getAst(); });
    var defValAst = ast.callExpression(
        "__def",
        [
            {
                "type": "FunctionExpression",
                "params": [],
                "body": {
                    "type": "BlockStatement",
                    "body": [
                        {
                            "type": "ReturnStatement",
                            "argument": expr.ast
                        }
                    ]
                },
            }
        ]
    );
    
    var defDeclarationAst = {
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

    library 
    return {
        ast : defDeclarationAst,
        type : expr.type,
        hasGetter : true
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
        var defDeclaration = makeDefInNode(fieldGraph, localLibrary);
        bodyAst.push(defDeclaration.ast);
        var fieldName = fieldGraph.id.name;
        fieldsType[fieldName] = defDeclaration.type;
        fieldsHasGetter[fieldName] = defDeclaration.hasGetter;

        localVarsType[fieldName] = defDeclaration.type;
        localFieldsHasGetter[fieldName] = defDeclaration.hasGetter;
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
