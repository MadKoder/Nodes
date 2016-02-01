function makeInferredExpressionType(typeParamsValues, type) {
    return {
        typeParamsValues : typeParamsValues,
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
    argsInferredType = _.map(argsGraph, function(arg) {
        return inferExprType(arg, library, functionsDeclaration, typeParams);
    });

    var argsType = _.map(argsInferredType, "type");
    var funcType = funcSpec.inferType(
        argsType,
        typeParams
    );

    // [{string -> Type}]
    // An array of dict from type params to their values
    var typeParamsValuesArray = _
        .map(argsInferredType, "typeParamsValues")
        .concat([funcType.typeParamsValues]);

    // Merge valued type params from the previous array
    var mergedTypeParamsValues = {};
    _.each(typeParamsValuesArray, function(typeParamsValues) {
        for(typeParam in typeParamsValues) {
            // The value of the type param
            var typeValue = typeParamsValues[typeParam];
            // TODO super type ?
            // If type param has already a value, check that it is compatible with the current value
            // If yes, the new value is the common super type
            if(typeParam in mergedTypeParamsValues) {
                var previousTypeValue = mergedTypeParamsValues[typeParam];
                var commonSuperType = getCommonSuperClass(previousTypeValue, typeValue);
                if(commonSuperType == null) {
                    error("Incompatible infered types for type param " + typeParam + " : " 
                        + typeToString(typeValue) + " and " + typeToString(previousTypeValue));
                }
                mergedTypeParamsValues[typeParam] = commonSuperType;
            } else {
                mergedTypeParamsValues[typeParam] = typeValue;
            }
        }
    });

    return makeInferredExpressionType(
        mergedTypeParamsValues,
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
            return instanciateType(inputType, inferedExpressionType.typeParamsValues);
        }),
        output : inferedExpressionType.type,
        typeParamsValues : inferedExpressionType.typeParamsValues
    };

    return {
        inputs : [makeBaseType("int")],
        output : makeBaseType("int"),
        typeParamsValues : {"x$Type" : makeBaseType("int")}
    };
}