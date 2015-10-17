
function buildFunctionOrStruct(graph, id, params, returnType, returnStmnt, library, prog)
{
	var paramsType = getParamsType(params);
	var functionType = makeFunctionType(paramsType, returnType);

	typeParamsToParamsPaths = getTypeParamsToParamsPaths(graph.typeParams, paramsType);

	library.functions[id] = {
		guessTypeArgs : makeGuessTypeArgs(
			typeParamsToParamsPaths,
			_.map(graph.typeParams, function(typeParam) {return typeParam.name;})
		),
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
				type : instanciateFunctionType(functionType, typeArgs)
			}
		},
		type : functionType
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
	prog.addStmnt(stmnt);
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
		var params = funcGraph.params;
		var bodyGraph = funcGraph.body;
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

		buildFunctionOrStruct(
			funcGraph,
			id,
			params,
			exprType,
			expr.getAst(),
            library,
            prog
        );
	}
}
