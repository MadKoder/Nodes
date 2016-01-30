
function buildFunctionOrStruct(graph, id, params, returnType, returnStmnt, library, typeParamsValues)
{
    var paramsType = getParamsType(params);
    var functionType = instanciateFunctionType(
        makeFunctionType(paramsType, returnType),
        typeParamsValues
    );

    // Default guesser when there are not type params
    var valueTypeParams = function(args) {
        return [];
    }
    // If there are type params, make valueTypeParams function from type params and params type
    // TODO useful ? when building function there is already a dedicated case for generic functions,
    // and buildFunctionOrStruct is only used when building instances. In this case, the valueTypeParams 
    // won't be used => useful for structs ?
    if(graph.typeParams.length > 0) {
        var typeParamsToParamsPaths = getTypeParamsToParamsPaths(graph.typeParams, paramsType);
        valueTypeParams = makeTypeParamsValuer(
            typeParamsToParamsPaths,
            graph.typeParams
        );
    }

    library.functions[id] = {
        valueTypeParams : valueTypeParams,
        getInstance : function(typeArgs)
        {
            return {
                getAst : function(args) 
                {   
                    return ast.callExpression(id, args);
                },
                type : instanciateFunctionType(functionType, typeArgs),
                instancesAst : []
            }
        },
        type : functionType,
        callType : graph.callType
    };

    var stmnt = ast.functionDeclaration(
        id,
        _.map(params, function(param) {
            return param.id.name}
        ),
        [
            {
                "type": "ReturnStatement",
                "argument": returnStmnt
            }
        ]
    );

    return stmnt;
}

funcType([], makeBaseType(""))

function makeFunction(funcGraph, library, prog)
{
    var id = funcGraph.id.name;
    var functionDeclaration = library.functionsDeclaration[id];
    // If the function has been predeclared, complete the object
    // Else create a new function instance object
    var params = funcGraph.params;
    
    // Generic functions are not implemented where they are defined,
    // instead they must be defined when concrete instances are used
    var bodyGraph = funcGraph.body;
    var typeParams = functionDeclaration.typeParams;
    var typeParamsValues = functionDeclaration.typeParamsValues;
    // If there are typeParams without instances
    if(typeParams.length > getNbProperties(typeParamsValues)) {
        var paramsType = getParamsType(params);
        var typeParamsToParamsPaths = getTypeParamsToParamsPaths(typeParams, paramsType);
        var valueTypeParams = makeTypeParamsValuer(
            typeParamsToParamsPaths,
            typeParams
        );

        // Adds function spec to library
        library.functions[id] = {
            valueTypeParams : valueTypeParams,
            getInstance : function(typeArgs)
            {
                // Builds the instance name from the function name and type args
                var instanceName = id + "$" + _.map(typeParams, function(typeParam) {
                    if(!(typeParam in typeArgs)) {
                        error("Type param " + typeParam + " not in type args dict");
                    }
                    return typeToString(typeArgs[typeParam]);
                }).join("$");

                // Build local nodes from params
                var localNodes = {};
                _.each(params, function(param) {
                    localNodes[param.id.name] = new Node({
                            "type": "Identifier",
                            "name": param.id.name
                        },
                        typeGraphToEngine(param.type)
                    );
                });

                // Make the body expr
                var bodyExpr = makeExpr(
                    bodyGraph, 
                    {
                        functions : library.functions,
                        nodes : localNodes
                    },
                    typeArgs
                );
                var instancesAst = bodyExpr.instancesAst;
                var bodyExprType = bodyExpr.type;
                var returnType = bodyExprType;
                var functionType = makeFunctionType(paramsType, returnType);

                // concatenate the instances of the body expression with 
                // the one of this function
                instancesAst.push(buildFunctionOrStruct(
                    funcGraph,
                    instanceName,
                    params,
                    bodyExprType,
                    bodyExpr.getAst(),
                    library,
                    typeParamsValues
                ))

                return {
                    getAst : function(args) 
                    {   
                        return {
                            "type": "CallExpression",
                            "callee": {
                                "type": "Identifier",
                                "name": instanceName
                            },
                            "arguments": args
                        }
                    },
                    type : instanciateFunctionType(functionType, typeArgs),
                    instancesAst : instancesAst
                }
            },
            callType : funcGraph.callType,
            genericType : {
                typeParams : [],
                inputs : [],
                output : mt("", [])
            },
            typeEvaluated : "no"

            // ,type : functionType
        };
        return;
    } else {
        // If function is not generic
        var expr = null;
        var exprType = null;
        var localNodes = {};
        _.each(params, function(param) {
            localNodes[param.id.name] = new Node({
                    "type": "Identifier",
                    "name": param.id.name
                },
                typeGraphToEngine(param.type)
            );
        });

        expr = makeExpr(
            bodyGraph, 
            _.assign(
                {},
                library,
                {
                    nodes : localNodes
                }
            ),
            typeParamsValues
        );
        exprType = expr.type;

        prog.addStmnt(
            buildFunctionOrStruct(
                funcGraph,
                id,
                params,
                exprType,
                expr.getAst(),
                library,
                typeParamsValues
            )
        );
    }
}
