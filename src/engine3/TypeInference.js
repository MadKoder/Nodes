function makeInferredExpressionType(typeParamsToInstance, type) {
    return {
        typeParamsToInstance : typeParamsToInstance,
        type : type
    };
}

function inferIdExpressionType(expr, library, functionsDeclaration, typeParams)
{
    var id = expr.name;
    if(!(id in library.nodes))
    {
        error("Node " + id + " not in set of nodes");
    }
        
    var node = library.nodes[id];
    var type = node.type;

    return makeInferredExpressionType(
        {},
        type
    );
}

function inferCallExpressionType(expr, library, functionsDeclaration, typeParams) {
    var func = expr.func;
    if(func.type == "Id")
    {
        var id = func.name;     
        if(!(id in library.functions)) {
            if(!(id in functionsDeclaration)) {
                error("Function " + id + " not found in functions library nor functions declarations");
            } else {
                funcSpec = functionsDeclaration[id];
            }
        } else {
            var funcSpec = library.functions[id];
        }
    }
    else
    {
        error("Callee type not supported: " + func.type);
    }
    
    var argsGraph = expr.args;
    // TODO call type == tuple (?)
    // Evaluate args
    argsType = _.map(argsGraph, function(arg) {
        return inferExprType(arg, library, functionsDeclaration, typeParams);
    });

    var funcType = funcSpec.inferType(
        _.map(argsType, "type"),
        typeParams
    );

    var typeParamsToInstanceArray = _
        .map(argsType, "typeParamsToInstance")
        .concat([funcType.typeParamsToInstance]);

    // Merge instanciated types
    var typeParamsToInstance = {};
    _.each(typeParamsToInstanceArray, function(argTypeParamsToInstance) {
        for(typeParam in argTypeParamsToInstance) {
            var argInstanciatedType = argTypeParamsToInstance[typeParam];
            // TODO super type ?
            if(typeParam in typeParamsToInstance) {
                var instanciatedType = typeParamsToInstance[typeParam];
                var commonSuperType = getCommonSuperClass(instanciatedType, argInstanciatedType);
                if(commonSuperType == null) {
                    error("Incompatible infered types for type param " + typeParam + " : " 
                        + typeToString(argInstanciatedType) + " and " + typeToString(instanciatedType));
                }
                typeParamsToInstance[typeParam] = commonSuperType;
            } else {
                typeParamsToInstance[typeParam] = argInstanciatedType;
            }
        }
    });


    return makeInferredExpressionType(
        typeParamsToInstance,
        funcType.output
    );
}

function inferExprType(exprGraph, library, functionsDeclaration, typeParams) {
    if(isInArray(exprGraph.type, ["IntLiteral", "FloatLiteral"])) {
        return makeInferredExpressionType(
            {},
            makeBaseType(
                exprGraph.type == "IntLiteral" ?
                    "int" :
                    "float"
            )
        );        
    } else if(exprGraph.type == "Id") {
        return inferIdExpressionType(exprGraph, library, functionsDeclaration, typeParams);
    } else if(exprGraph.type == "FunctionCall") {
        return inferCallExpressionType(exprGraph, library, functionsDeclaration, typeParams);
    }
    error("Unrecognized expression type " + exprGraph.type);
}

function inferFunctionType(functionDeclaration, library, functionsDeclaration, typeParams) {
    var functionGraph = functionDeclaration.graph;

    var exprGraph = functionGraph.body;
    var inferedExpressionType = inferExprType(exprGraph, library, functionsDeclaration, typeParams);

    return {
        inputs : _.map(functionDeclaration.inputs, function(inputType) {
            return instanciateType(inputType, inferedExpressionType.typeParamsToInstance);
        }),
        output : inferedExpressionType.type,
        typeParamsToInstance : inferedExpressionType.typeParamsToInstance
    };

    return {
        inputs : [makeBaseType("int")],
        output : makeBaseType("int"),
        typeParamsToInstance : {"x$Type" : makeBaseType("int")}
    };
}