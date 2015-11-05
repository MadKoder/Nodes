function isId(exprGraph) {
    return exprGraph.type == "Id";
}

function Expr(ast, type)
{
    this.ast = ast;
    this.type = type;
    
    this.getAst = function()
    {
        return this.ast;
    }

    this.getType = function()
    {
        return this.type;
    }
}

function makeListComprehensionExpression(expr, library, genericTypeParams)
{
    var localLibrary = makeLocalLibrary(library);
    var generatorsGraph = expr.generators;
    // Each generator in the list can use targets of subsequent generators,
    // So we need to iterate on it in reverse order in order to have each generators
    // targets available for generators before them
    var reversedGeneratorsGraph = generatorsGraph;
    reversedGeneratorsGraph.reverse();
    // Iterators are also stacked from last to first, as last
    // will be in the outer iteration
    // TODO needed ?
    var iteratorsAst = [];
    var generatorIndex = reversedGeneratorsGraph.length - 1;
    _.each(reversedGeneratorsGraph, function(generatorGraph) {
        // TODO : check type == "Generator"
        var iterableExpr = makeExpr(generatorGraph.iter, localLibrary, genericTypeParams);
        if(!getBaseType(iterableExpr.type) == "list") {
            // TODO better message
            error("Iterable is not a list");
        }
        iteratorsAst.unshift(iterableExpr.ast);
        var iteratorType = getTypeArgs(iterableExpr.type)[0];
        var targetsGraph = generatorGraph.targets;
        // TODO destructuring
        if(targetsGraph.length == 1)
        {
            var targetGraph = targetsGraph[0];
            if(targetGraph.type != "Id")
            {
                error("Target type is not an id");
            }
            // list{generatorIndex}[i{generatorIndex}]
            var getterAst = {
                "type": "MemberExpression",
                "computed": true,
                "object": {
                    "type": "Identifier",
                    "name": "list" + generatorIndex
                },
                "property": {
                    "type": "Identifier",
                    "name": "i" + generatorIndex
                }
            };
            localLibrary.nodes[targetGraph.name] = new Node(getterAst, typeGraphToCompact(iteratorType));
        } else
        {
            error("destructuring !!!");
        }

        generatorIndex--;
    });

    var eltExpr = makeExpr(expr.elt, localLibrary, genericTypeParams);

    // Inner body, push computed elements in result
    // {
    //  results.push(eltExpr.ast);
    // }
    var bodyAst = {
        "type": "BlockStatement",
        "body": [
            {
                "type": "ExpressionStatement",
                "expression": {
                    "type": "CallExpression",
                    "callee": {
                        "type": "MemberExpression",
                        "computed": false,
                        "object": {
                            "type": "Identifier",
                            "name": "results"
                        },
                        "property": {
                            "type": "Identifier",
                            "name": "push"
                        }
                    },
                    "arguments": [eltExpr.ast]
                }
            }
        ]
    };

    // Iteratively insert inner body into next outter loop
    // So last iterators are transformed into outer loop
    // For the last iterator, adds results array declaration and return statement
    // [x for x in [1, y * 2] for y in [3, 4, 5]] ->
    // var results = [];
    //     var list1 = [
    //             3,
    //             4,
    //             5
    //         ];
    //     for (var i1 = 0; i1 < list1.length; i1++) {
    //         var list0 = [
    //                 1,
    //                 list1[i1] * 2
    //             ];
    //         for (var i0 = 0; i0 < list0.length; i0++) {
    //             results.push(list0[i0]);
    //         }
    //     }
    //     return results;
    _.each(iteratorsAst, function(iteratorAst, index) {
        // var list{index} = iteratorAst;
        //  for (var i{index} = 0; i{index} < list{index}.length; i{index}++) {
        //      bodyAst
        // }
        bodyAst = 
        [
            {
                "type": "VariableDeclaration",
                "declarations": [
                    {
                        "type": "VariableDeclarator",
                        "id": {
                            "type": "Identifier",
                            "name": "list" + index
                        },
                        "init": iteratorAst
                    }
                ],
                "kind": "var"
            },
            {
                "type": "ForStatement",
                "init": {
                    "type": "VariableDeclaration",
                    "declarations": [
                        {
                            "type": "VariableDeclarator",
                            "id": {
                                "type": "Identifier",
                                "name": "i" + index
                            },
                            "init": {
                                "type": "Literal",
                                "value": 0,
                                "raw": "0"
                            }
                        }
                    ],
                    "kind": "var"
                },
                "test": {
                    "type": "BinaryExpression",
                    "operator": "<",
                    "left": {
                        "type": "Identifier",
                        "name": "i" + index
                    },
                    "right": {
                        "type": "MemberExpression",
                        "computed": false,
                        "object": {
                            "type": "Identifier",
                            "name": "list" + index
                        },
                        "property": {
                            "type": "Identifier",
                            "name": "length"
                        }
                    }
                },
                "update": {
                    "type": "UpdateExpression",
                    "operator": "++",
                    "argument": {
                        "type": "Identifier",
                        "name": "i" + index
                    },
                    "prefix": false
                },
                "body": bodyAst
            }
        ];

        // Last iteration, adds results declaration and return statement
        if(index == iteratorsAst.length - 1)
        {
            bodyAst.unshift(
                {
                    "type": "VariableDeclaration",
                    "declarations": [
                        {
                            "type": "VariableDeclarator",
                            "id": {
                                "type": "Identifier",
                                "name": "results"
                            },
                            "init": {
                                "type": "ArrayExpression",
                                "elements": []
                            }
                        }
                    ],
                    "kind": "var"
                }
            );

            bodyAst.push(
                {
                    "type": "ReturnStatement",
                    "argument": {
                        "type": "Identifier",
                        "name": "results"
                    }
                }
            );
        }

        bodyAst = 
        {
            "type": "BlockStatement",
            "body": bodyAst
        }
    });

    
    // function () {
    //     bodyAst
    // }();
    return new Expr(
        {
            "type": "CallExpression",
            "callee": {
                "type": "FunctionExpression",
                "id": null,
                "params": [],
                "defaults": [],
                "body": bodyAst,
                "generator": false,
                "expression": false
            },
            "arguments": []
        },
        makeListType(eltExpr.type)
    );

}

function makeListExpression(expr, library, genericTypeParams)
{
    // TODO empty list
    var elementsType = null;
    var elementsAst = _.map(expr.array, function(element) {
        var elementExp = makeExpr(element, library, genericTypeParams);
        if(elementsType == null) {
            elementsType = elementExp.type;
        } else
        {
            // TODO common type
            if(!isSameType(elementsType, elementExp.type)) {
                // TODO stringify element
                error(
                    "List element " + elementExp.ast + " type " + typeToString(elementExp.type) + " different from previous elements type " + typeToString(elementsType)
                );
            }
        }
        return elementExp.ast;
    });

    return new Expr(
        {
            "type": "ArrayExpression",
            "elements": elementsAst
        },
        makeType("list", [elementsType])
    );
}

function makeCallExpression(expr, library, genericTypeParams)
{
    var func = expr.func;
    if(func.type == "Id")
    {
        var id = func.name;     
        if(!(id in library.functions))
        {
            error("Function " + id + " not found in functions library");
        }
        var funcSpec = library.functions[id];
    }
    else
    {
        error("Callee type not supported: " + func.type);
    }
    
    args = _.map(expr.args, function(arg) {
        return makeExpr(arg, library, genericTypeParams);
    });

    typeArgs = funcSpec.guessTypeArgs(args);
    funcInstance = funcSpec.getInstance(typeArgs);

    _.each(
        _.zip(args, funcInstance.type.inputs),
        function(argAndInputType) {
            if(!isSameType(argAndInputType[0].type, argAndInputType[1])) {
                error(
                    "Arg type " + typeToString(argAndInputType[0].type) + " different from formal parameter type " + typeToString(argAndInputType[1])
                );
            }
        }
    );

    return new Expr(
        funcInstance.getAst(
            _.map(args, function(arg) {
                return arg.ast;
        })),
        funcInstance.type.output
    );
}

function makeMemberExpression(exprGraph, library, genericTypeParams)
{
    var obj = exprGraph.obj;
    var expr = makeExpr(obj, library, genericTypeParams);
    // TODO check types

    var fieldName = exprGraph.field.name;
    // Instanciate class type
    var classType = library.classes[expr.type.base](expr.type.args);
    // And get the member type
    var fieldType = classType.varsType[exprGraph.field.name];
    return new Expr(
        {
            "type": "MemberExpression",
            "computed": false,
            "object": expr.getAst(),
            "property": {
                "type": "Identifier",
                "name": fieldName
            }
        },
        fieldType
    );
}

function makeIdExpression(expr, library, genericTypeParams)
{
    var id = expr.name;
    if(!(id in library.nodes))
    {
        error("Node " + id + " not in set of nodes nor of vals");
    }
        
    var node = library.nodes[id];
    var idVal = node.getterAst;
    var type = node.type;

    return new Expr(
        idVal,
        type
    );
}

function makeExpr(exprGraph, library, genericTypeParams) {
    if(isInArray(exprGraph.type, ["IntLiteral", "FloatLiteral"])) {
        return new Expr(
            ast.literal(exprGraph.val),
            makeBaseType(
                exprGraph.type == "IntLiteral" ?
                    "int" :
                    "float"
            )
        );
    } else if(exprGraph.type == "BooleanLiteral") {
        return new Expr(
            ast.literal(exprGraph.val),
            makeBaseType("bool")
        );
    } else if(isId(exprGraph)) {
        return makeIdExpression(exprGraph, library, genericTypeParams);
    } else if(exprGraph.type == "ListExpression") {
        return makeListExpression(exprGraph, library, genericTypeParams);
    } else if(exprGraph.type == "ListComprehensionExpression") {
        return makeListComprehensionExpression(exprGraph, library, genericTypeParams);
    } else if(exprGraph.type == "CallExpression") {
        return makeCallExpression(exprGraph, library, genericTypeParams);
    }  else if(exprGraph.type == "MemberExpression") {
        return makeMemberExpression(exprGraph, library, genericTypeParams);
    } 
}
