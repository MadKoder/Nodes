
function buildFunctionOrStruct(graph, id, params, returnType, returnStmnt, library)
{
	var paramsType = getParamsType(params);
	var functionType = makeFunctionType(paramsType, returnType);

	// Default guesser when there are not type params
	var guessTypeArgs = function(args) {
		return [];
	}
	// If there are type params, make guessTypeArgs function from type params and params type
	if(graph.typeParams != null) {
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
					return {
						"type": "CallExpression",
						"callee": {
							"type": "Identifier",
							"name": id
						},
						"arguments": args
					}
				},
				type : instanciateFunctionType(functionType, typeArgs),
				instancesAst : []
			}
		},
		type : functionType,
		callType : graph.callType
	};

	var stmnt = {
		"type": "FunctionDeclaration",
		"id": {
			"type": "Identifier",
			"name": id
		},
		"params": _.map(params, function(param) {
			return {
				"type": "Identifier",
				"name": param.id.name
			};}),
		"defaults": [],
		"body": {
			"type": "BlockStatement",
			"body": [
				{
					"type": "ReturnStatement",
					"argument": returnStmnt
				}
			]
		},
		"generator": false,
		"expression": false
	}
	return stmnt;
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
		// For each untyped param, push a type param in the function graph
		// and sets the param type to this type param
		_.each(params , function(param) {
			if(param.type == null) {
				if(funcGraph.typeParams == null) {
					funcGraph.typeParams = [];
				}
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
		if(funcGraph.typeParams != null) {
			var paramsType = getParamsType(params);
			var typeParamsToParamsPaths = getTypeParamsToParamsPaths(funcGraph.typeParams, paramsType);
			var guessTypeArgs = makeGuessTypeArgs(
				typeParamsToParamsPaths,
				_.map(funcGraph.typeParams, function(typeParam) {return typeParam.name;})
			);


			library.functions[id] = {
				guessTypeArgs : guessTypeArgs,
				getInstance : function(typeArgs)
				{
					var instanceName = id + "$" + _.map(funcGraph.typeParams, function(typeParam) {
						var name = typeParam.name;
						if(!(name in typeArgs)) {
							error("Type param " + name + " not in type args dict");
						}
						return typeToString(typeArgs[name]);
					}).join("$");

					var expr = null;
					var exprType = null;
					var localNodes = {};
					_.each(params, function(param) {
						localNodes[param.id.name] = new Node({
								"type": "Identifier",
								"name": param.id.name
							},
							typeGraphToCompact(param.type)
						);
					});

					expr = makeExpr(
						bodyGraph, 
						{
							functions : library.functions,
							nodes : localNodes
						},
						typeArgs
					);
					var instancesAst = expr.instancesAst;
					exprType = expr.type;
					var returnType = exprType;
					var functionType = makeFunctionType(paramsType, returnType);

					instancesAst.push(buildFunctionOrStruct(
						funcGraph,
						instanceName,
						params,
						exprType,
						expr.getAst(),
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
				callType : funcGraph.callType

				// ,type : functionType
			};
			return;
		}
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
					typeGraphToCompact(param.type)
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
