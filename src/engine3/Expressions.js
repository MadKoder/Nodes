function isId(exprGraph) {
    return exprGraph.type == "Id";
}

function Expr(ast, type, instancesAst)
{
    this.ast = ast;
    this.type = type;
    this.instancesAst = instancesAst != undefined ? instancesAst : []
    
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
    var generators = [];
    var generatorIndex = reversedGeneratorsGraph.length - 1;
    _.each(reversedGeneratorsGraph, function(generatorGraph) {
        // TODO : check type == "Generator"
        var iterableExpr = makeExpr(generatorGraph.iter, localLibrary, genericTypeParams);
        if(!getBaseType(iterableExpr.type) == "list") {
            // TODO better message
            error("Iterable is not a list");
        }
        // Generators will be used from first to last, so we reverse the insertion
        var iteratorNames = [];
        // TODO destruct
        var iterableName = "__" + generatorGraph.targets[0].name + "$list";
        generators.unshift(
            {
                iteratorNames : iteratorNames,
                iterableName : iterableName,
                ast : iterableExpr.ast
            }
        );
        // generators.unshift(iterableExpr.ast);
        var iteratorType = getTypeArgs(iterableExpr.type)[0];
        var targetsGraph = generatorGraph.targets;
        // TODO destructuring
        if(targetsGraph.length == 1)
        {
            var targetGraph = targetsGraph[0];
            var name = targetGraph.name;
            var iteratorName = "__" + name + "$index";
            iteratorNames.push(iteratorName);
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
                    "name": iterableName
                    // "name": "list" + generatorIndex
                },
                "property": {
                    "type": "Identifier",
                    "name": iteratorName
                    // "name": "i" + generatorIndex
                }
            };
            localLibrary.nodes[name] = new Node(getterAst, typeGraphToEngine(iteratorType));
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
    _.each(generators, function(generator, index) {
        // var list{index} = generator.ast;
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
                            "name": generator.iterableName
                        },
                        "init": generator.ast
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
                                // TODO destruct
                                "name": generator.iteratorNames[0]
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
                        "name": generator.iteratorNames[0]
                    },
                    "right": {
                        "type": "MemberExpression",
                        "computed": false,
                        "object": {
                            "type": "Identifier",
                            "name": generator.iterableName
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
                        "name": generator.iteratorNames[0]
                    },
                    "prefix": false
                },
                "body": bodyAst
            }
        ];

        // Last iteration, adds results declaration and return statement
        if(index == generators.length - 1)
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

function makeTupleExpression(expr, library, genericTypeParams)
{
    // TODO empty tuple (?)
    var elementsTypes = [];
    var elementsAst = _.map(expr.tuple, function(element) {
        var elementExp = makeExpr(element, library, genericTypeParams);
        elementsTypes.push(elementExp.type);
        return elementExp.ast;
    });

    return new Expr(
        {
            "type": "ArrayExpression",
            "elements": elementsAst
        },
        makeType("tuple", elementsTypes)
    );
}

function makeCallExpression(expr, library, genericTypeParams)
{
    var func = expr.func;
    var funcSpec = null;
    if(func.type == "Id")
    {
        var id = func.name;     
        if(!(id in library.functions))
        {
            if(!(id in library.functionsDeclaration))
            {
                error("Function " + id + " not found in functions library nor functions declarations");
            } else {
                funcSpec = library.functionsDeclaration[id];
            }
        } else 
        {
            funcSpec = library.functions[id];
        }
    }
    else
    {
        error("Callee type not supported: " + func.type);
    }
    
    var argsGraph = expr.args;
    var argsExpr;
    // If call type of function is tuple, check that there is only parameter of type tuple
    // the args expression are evaluated from the args of the tuple
    if(funcSpec.callType == "Tuple") {
        if(argsGraph.length > 1) {
            error("Call of tuple params function with more than 1 params. There should be only 1 param of type tuple.")
        }
        if(argsGraph[0].type != "TupleExpression") {
            error("Call of tuple params function with a parameter whose type is not a tuple: " + argsGraph[0].type);
        }
        // Evaluate the items of the tuple
        argsExpr = _.map(argsGraph[0].tuple, function(arg) {
            return makeExpr(arg, library, genericTypeParams);
        });
    }
    else {    
        // Evaluate args
        argsExpr = _.map(argsGraph, function(arg) {
            return makeExpr(arg, library, genericTypeParams);
        });
    }

    var instancesAst = [];
    // Replace arguments generic types by their instances
    argsExpr = _.map(argsExpr, function(argExpr) {
        // Copy of argExpr with type replaced by its instance
        var instanciatedArgExpr = _.assign(
            {},
            argExpr,
            {
                type : instanciateType(argExpr.type, genericTypeParams)
            }
        );

        instancesAst = instancesAst.concat(instanciatedArgExpr.instancesAst);
        return instanciatedArgExpr;
    });

    var typeArgs = funcSpec.valueTypeParams(_.map(argsExpr, "type"));
    var funcInstance = funcSpec.getInstance(typeArgs);
    instancesAst = instancesAst.concat(funcInstance.instancesAst);

    // Control number of args
    // TODO currying
    if(argsExpr.length != funcInstance.type.inputs.length) {
        error("Function " + id + " with " + funcInstance.type.inputs.length + " param(s)" +  
            " is called with " + argsExpr.length + " args");
    }

    // Control args type agains params type
    _.each(
        _.zip(argsExpr, funcInstance.type.inputs),
        function(argAndInputType) {
            if(!isSubType(argAndInputType[0].type, argAndInputType[1])) {
                error(
                    "Arg type " + typeToString(argAndInputType[0].type) + " different from formal parameter type " + typeToString(argAndInputType[1])
                );
            }
        }
    );

    return new Expr(
        funcInstance.getAst(
            _.map(argsExpr, function(arg) {
                return arg.ast;
        })),
        funcInstance.type.output,
        instancesAst
    );
}

function makeNewExpression(exprGraph, library, genericTypeParams)
{
    var newGraph = exprGraph;

    var classId = newGraph["class"].name;
    if(!(classId in library.classes))
    {
        error("Class " + classId + " not found in classes library");
    }
    var classSpec = library.classes[classId];
    
    var argsGraph = newGraph.args;

    // Evaluate the args
    argsExpr = _.map(argsGraph, function(arg) {
        return makeExpr(arg, library, genericTypeParams);
    });

    // TODO generic classes
    // var instancesAst = [];
    // // Replace arguments generic types by their instances
    // _.each(argsExpr, function(argExpr) {
    //     if(argExpr.type.base in genericTypeParams) {
    //         argExpr.type = genericTypeParams[argExpr.type.base];
    //     }
    //     instancesAst = instancesAst.concat(argExpr.instancesAst);
    // });
    // var typeArgs = funcSpec.valueTypeParams(argsExpr);
    // var funcInstance = funcSpec.getInstance(typeArgs);
    // instancesAst = instancesAst.concat(funcInstance.instancesAst);

    // TODO check types
    var exprAst = {
        "type": "NewExpression",
        "callee": ast.id(classId),
        "arguments": _.map(argsExpr, function(arg) {
            return arg.ast;
        })
    }

    return new Expr(
        exprAst,
        makeBaseType(classId) // TODO generic classes
    );
}

function makeMemberExpression(exprGraph, library, genericTypeParams)
{
    var objGraph = exprGraph.obj;
    var objExpr = makeExpr(objGraph, library, genericTypeParams);
    var attribName = exprGraph.field.name;

    // TODO check types
    if(isRecordType(objExpr.type)){
        // Record
        var recordTypeFields = getRecordTypeFields(objExpr.type);
        if(!(attribName in recordTypeFields)) {
            error("Field " + attribName + " not in record type " + typeToString(objExpr.type));
        }
        // objAst.attribName
        var exprAst = ast.memberExpression(
            objExpr.getAst(),
            attribName
        );
        var attribType = recordTypeFields[attribName];
    } else { // Struct or literal object
        // Instanciate class type    
        var classType = library.classes[objExpr.type.base](objExpr.type.args);
        // And get the attribute infos
        if(!(attribName in classType.attribs))
        {
            error("Field " + attribName + " is not in object/struct of type " + typeToString(objExpr.type)
                + ". Object/struct name: " + objGraph.name);
        }
        var attrib = classType.attribs[attribName];
        var attribType = attrib.type;
        var exprAst = attrib.getGetterAst(objExpr.getAst());
    }

    return new Expr(
        exprAst,
        attribType
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

function makeRecordExpression(recordGraph, library, genericTypeParams)
{
    var fieldsType = {};
    var propertiesAst = _.map(recordGraph.fields, function(field) {
        var fieldId = field.id.name;
        var fieldExpr = makeExpr(field.val, library, genericTypeParams);
        
        fieldsType[fieldId] = fieldExpr.type;

        return ast.property(
            fieldId,
            fieldExpr.ast
        );
    });
    var recordAst = ast.objectExpression(propertiesAst);

    var type = makeRecordType(fieldsType);

    return new Expr(
        recordAst,
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
    } else if(exprGraph.type == "StringLiteral") {
        return new Expr(
            ast.literal(exprGraph.val),
            makeBaseType("string")
        );
    } else if(isId(exprGraph)) {
        return makeIdExpression(exprGraph, library, genericTypeParams);
    } else if(exprGraph.type == "ListExpression") {
        return makeListExpression(exprGraph, library, genericTypeParams);
    } else if(exprGraph.type == "ListComprehensionExpression") {
        return makeListComprehensionExpression(exprGraph, library, genericTypeParams);
    } else if(exprGraph.type == "TupleExpression") {
        return makeTupleExpression(exprGraph, library, genericTypeParams);
    } else if(exprGraph.type == "FunctionCall") {
        return makeCallExpression(exprGraph, library, genericTypeParams);
    }  else if(exprGraph.type == "MemberExpression") {
        return makeMemberExpression(exprGraph, library, genericTypeParams);
    }  else if(exprGraph.type == "NewExpression") {
        return makeNewExpression(exprGraph, library, genericTypeParams);
    }  else if(exprGraph.type == "RecordExpression") {
        return makeRecordExpression(exprGraph, library, genericTypeParams);
    }
    error("Unrecognized expression type " + exprGraph.type);
}
