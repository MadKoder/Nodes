
function buildFunctionOrStruct(graph, id, params, returnType, returnStmnt, library)
{
	var paramsType = getParamsType(params);
	var functionType = makeFunctionType(paramsType, returnType);

	// Default guesser when there are not type params
	var guessTypeArgs = function(args) {
		return [];
	}
	// If there are type params, make guessTypeArgs function from type params and params type
	// TODO useful ? when building function there is already a dedicated case for generic functions,
	// and buildFunctionOrStruct is only used when building instances. In this case, the guessTypeArgs 
	// won't be used => useful for structs ?
	if(graph.typeParams.length > 0) {
		var typeParamsToParamsPaths = getTypeParamsToParamsPaths(graph.typeParams, paramsType);
		guessTypeArgs = makeGuessTypeArgs(
			typeParamsToParamsPaths,
			_.map(graph.typeParams, function(typeParam) {return typeParam.name;})
		);
	}

	library.functions[id] = {
		guessTypeArgs : guessTypeArgs,
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

function inferCallExpressionType(expr, library, genericTypeParams) {
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
        if(argExpr.type.base in genericTypeParams) {
            argExpr = _.clone(argExpr, true);
            argExpr.type = genericTypeParams[argExpr.type.base];
        }
        instancesAst = instancesAst.concat(argExpr.instancesAst);
        return argExpr;
    });

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

function inferFunctionType(exprGraph, library, genericTypeParams) {
	if(exprGraph.type == "FunctionCall") {
        return inferCallExpressionType(exprGraph, library, {});
    }
    error("Unrecognized expression type " + exprGraph.type);
}

function makeFunction(funcGraph, library, prog)
{
	var id = funcGraph.id.name;     
	// If the function has been predeclared, complete the object
	if(id in library.functions)
	{
		var func = library.functions[id];
		var funcNode = library.nodes[id];
	}
	else
	{
		// Else create a new function instance object
		var params = _.clone(funcGraph.params, true);
		// For each untyped param, make a type param for this param
		// and push it in the funcion typeParams
		_.each(params, function(param) {
			if(param.type == null) {
				var paramTypeName = param.id.name + "$Type";
				funcGraph.typeParams.push({
					type : "Id",
					name : paramTypeName
				});
				param.type = {
					type : "Id",
					name : paramTypeName
				};
			}
		});

		// Generic functions are not implemented where they are defined,
		// instead they must be defined when concrete instances are used
		var bodyGraph = funcGraph.body;
		if(funcGraph.typeParams.length > 0) {
			var paramsType = getParamsType(params);
			var typeParamsToParamsPaths = getTypeParamsToParamsPaths(funcGraph.typeParams, paramsType);
			var guessTypeArgs = makeGuessTypeArgs(
				typeParamsToParamsPaths,
				_.map(funcGraph.typeParams, function(typeParam) {return typeParam.name;})
			);

			var typeParams = _.map(funcGraph.typeParams, function(typeParam) {
				return typeParam.name;
			});

			// // Build local nodes from params
			// var localNodes = {};
			// _.each(params, function(param) {
			// 	localNodes[param.id.name] = new Node({
			// 			"type": "Identifier",
			// 			"name": param.id.name
			// 		},
			// 		typeGraphToEngine(param.type)
			// 	);
			// });

			// var expr = makeExpr(
			// 	bodyGraph,
			// 	{
			// 		functions : library.functions,
			// 		nodes : localNodes
			// 	},
			// 	{}
			// );

			// var genericType = inferFunctionType(
			// 	bodyGraph,
			// 	{
			// 		functions : library.functions,
			// 		nodes : localNodes
			// 	}
			// );

			// var genericType = {
			// 	typeParams : inferedFunctionType.typeParams,
			// 	type : inferedFunctionType.functionType
			// };

			// Adds function spec to library
			library.functions[id] = {
				guessTypeArgs : guessTypeArgs,
				getInstance : function(typeArgs)
				{
					// Builds the instance name from the function name and type args
					var instanceName = id + "$" + _.map(funcGraph.typeParams, function(typeParam) {
						var name = typeParam.name;
						if(!(name in typeArgs)) {
							error("Type param " + name + " not in type args dict");
						}
						return typeToString(typeArgs[name]);
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
						library
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
		}

		// If function is not generic
		var expr = null;
		var exprType = null;
		if(bodyGraph != null)
		{                           
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
				{
					functions : library.functions,
					nodes : localNodes
				},
				{}
			);
			exprType = expr.type;
		}

		prog.addStmnt(
			buildFunctionOrStruct(
				funcGraph,
				id,
				params,
				exprType,
				expr.getAst(),
				library
			)
		);
	}
}
