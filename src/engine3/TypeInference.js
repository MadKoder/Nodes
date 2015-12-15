function makeInferredExpressionType(typeParamsInstances, type) {
    return {
        typeParamsInstances : typeParamsInstances,
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
    
    var argsGraph = expr.args;
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
        argsExprType = _.map(argsGraph, function(arg) {
            return inferExprType(arg, library, functionsDeclaration, typeParams);
        });
    }

    var typeArgs = funcSpec.inferType(argsExprType);
    var typeArgs = funcSpec.guessTypeArgs(argsExpr);
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
            if(!isSameType(argAndInputType[0].type, argAndInputType[1])) {
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
    return {
        typeParams : inferedFunctionType.typeParams,
        type : inferedFunctionType.functionType
    };
}

function inferExprType(exprGraph, library, functionsDeclaration, typeParams) {
    if(isInArray(exprGraph.type, ["IntLiteral", "FloatLiteral"])) {
        return makeInferredExpressionType(
            [],
            makeBaseType(
                exprGraph.type == "IntLiteral" ?
                    "int" :
                    "float"
            ),
            "yes"
        );        
    } else if(exprGraph.type == "Id") {
        return inferIdExpressionType(exprGraph, library, functionsDeclaration);
    } else if(exprGraph.type == "FunctionCall") {
        return inferCallExpressionType(exprGraph, library, functionsDeclaration);
    }
    error("Unrecognized expression type " + exprGraph.type);
}

function inferFunctionType(functionDeclaration, library, functionsDeclaration, typeParams) {
    var functionGraph = functionDeclaration.graph;

    var exprGraph = functionGraph.body;
    return inferExprType(exprGraph, library, functionsDeclaration, typeParams);
    var a = 1;
}