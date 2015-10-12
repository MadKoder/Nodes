function setEngineLodash(l)
{
	_=l;
}

function setLibrary(lib)
{
	library = lib;
}

function Node(getterAst, type)
{
	this.type = type;
	this.getterAst = getterAst;
}


function getTypeParamsToParamsPaths(typeParams, paramsType)
{
	// Liste associant a chaque typeParam les chemins dans les parametres qui l'utilisent
	// Sert pour deviner les typeParams a partir des types des parametres
	// Initialise as a list of empty list
	var typeParamsToParamsPaths = _.map(Array(typeParams.length), function(){return [];});
	
	// For all parameters types, recursively add paths to leaf types (typeParams), with leaf types at the end
	// e.g. : [list<list<T>>, pair<F,G>, int] -> [[0, 0, 0, T], [1, 0, F], [1, 1, G], [2, int]]
	function getTypePaths(paramsType, parentPath)
	{
		return _.reduce
		(
			paramsType, 
			function(paths, type, index)
			{
				var typeParams = type.args;
				if(typeParams.length == 0)
				{
					return paths.concat(
						[parentPath.concat([index, type])]
					);
				}
				return paths.concat(
					getTypePaths(
						typeParams, 
						parentPath.concat([index])
					)
				);
			},
			[]
		);
	}
	var paramsTypePaths = getTypePaths(paramsType, []);
	
	// map typeParam name -> index in typeParams array
	var typeParamNameToIndex = _.zipObject(
		_.map(typeParams, function(typeParam) {return typeParam.name;}),
		_.range(typeParams.length)
	);
	// For each path, if leaf type is a typeParam, adds the path to the typeParams param paths array
	_.each(paramsTypePaths, function(typePath)
	{
		var last = _.last(typePath);
		if(last.base in typeParamNameToIndex)
		{
			// The leaf type is a typeParam, use the map to find the index, and adds the path without leaf type
			typeParamsToParamsPaths[typeParamNameToIndex[last.base]].push(_.first(typePath, typePath.length - 1));
		}
	});

	return typeParamsToParamsPaths;
}

function getParamsType(params) {
	return _.map(params, function(param){return param.type;});
}

function makeGuessTypeArgs(typeParamsToParamsPaths) {
	return function(params)
	{
		// Guess templates types from params types
		var paramsType = getParamsType(params);
		return _.map(typeParamsToParamsPaths, function(paths)
		{
			function getTypeArgFromPath(type, path)
			{
				if(path.length == 1)
					return type.params[path[0]];
				var subPath = path.slice(0);
				var index = subPath.shift();	
				return getTypeArgFromPath(type.params[index], subPath);
			}

			var typeArgsInPaths = _.map(paths, function(path)
			{
				if(path.length == 1)
					return paramsType[path[0]];
				var subPath = path.slice(0);
				var index = subPath.shift();
				try
				{
					return getTypeArgFromPath(paramsType[index], subPath);
				}
				catch(err)
				{
					console.log(err)
					error("Type mismatch of param " + funcGraph.params[index].id.name + " for function " + funcGraph.id.name);
				}
			});
			var firstTypeArg = typeArgsInPaths[0];
			_.each(typeArgsInPaths, function(typeArg)
			{
				// If typeArg type is used at different places of parameters types, the instances must be of the same type
				// e.g. if paramsType = [list<T>, pair<T, U>], we can have [list<int>, pair<int, float>] but not [list<int>, pair<float, int>]
				if(typeArg != firstTypeArg)
					throw "Type params not the same for different params : " + firstTypeArg + " vs " + typeArg;
			});
			return firstTypeArg;
		});
	};
}

function buildFunctionOrStruct(graph, id, params, returnType, returnStmnt, library, prog)
{
	var fieldsType = getParamsType(params);
	var inAndOutTypes = makeFunctionType(fieldsType, returnType);

	typeParamsToParamsPaths = getTypeParamsToParamsPaths(graph.typeParams, fieldsType);

	library.functions[id] = {
		guessTypeArgs : makeGuessTypeArgs(typeParamsToParamsPaths),
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
				type : inAndOutTypes.output
			}
		},
		getType : function(typeArgs)
		{
			return inAndOutTypes;
		}
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

function makeStruct(structGraph, library, prog)
{
	var id = structGraph.id.name;
	// If the function has been predeclared, complete the object
	if(id in library.functions)
	{
		var func = library.functions[id];
		var funcNode = library.nodes[id];
	}
	else
	{
		// Else create a new function instance object
		buildFunctionOrStruct(
			structGraph,
			id,
			structGraph.fields,
			makeType(id, structGraph.typeParams),
			{
                "type": "ObjectExpression",
                "properties": _.map(structGraph.fields, function(field) {
                    return {
                        "type": "Property",
                        "key": {
                            "type": "Identifier",
                            "name": field.id.name
                        },
                        "computed": false,
                        "value": {
                            "type": "Identifier",
                            "name": field.id.name
                        },
                        "kind": "init",
                        "method": false,
                        "shorthand": false
                    };
                })
            },
            library,
            prog
        );
	}
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
				    }, {
						base : param.type.base,
						args : param.type.args
					}
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

function compileGraph(graph, library, previousNodes) 
{
	prog = {
	    type: "Program",
	    body: [],
	    addStmnt : function(stmnt)
	    {
	    	this.body.push(stmnt);
	    },
	    addLitVarDecl : function(id, litVal)
	    {
	    	this.addStmnt(makeLitVarDecl(id, litVal));
	    }
	};

	prog.addLitVarDecl("float", "{}");
	prog.addLitVarDecl("int", "{}");
	prog.addLitVarDecl("string", "{}");
	
	if("structsAndFuncs" in graph)
	{
		var structsAndfuncsGraph = graph.structsAndFuncs;
		for(var i = 0; i < structsAndfuncsGraph.length; i++)
		{
			if("func" in structsAndfuncsGraph[i])
			{
				makeFunction(structsAndfuncsGraph[i].func, library, prog);
			} else //struct
			{
				makeStruct(structsAndfuncsGraph[i].struct, library, prog);
			}
		}
	}

	var graphNodes = graph.nodes;
    var connectionsGraph = graph.connections;
    for(var i = 0; i < graphNodes.length; i++)
	{
		var nodeRow = graphNodes[i];
		for(var j = 0; j < nodeRow.length; j++)
		{
			var nodeGraph = nodeRow[j];
			var id = nodeGraph.id.name;
			//try
			{
				if(nodeGraph.type == "var")
				{
					var expr = makeExpr(nodeGraph.val, library, {});
					var vor = varDeclarator(
						identifier(id), expr.getAst()
					);
					var von = varDeclaration([vor]);
					prog.addStmnt(von);
					var getterAst = {
                        "type": "Identifier",
                        "name": id
                    };
                    library.nodes[id] = new Node(getterAst, expr.getType());
				}
				else
				{
					var expr = makeExpr(nodeGraph.val, library, {});
					var vor = varDeclarator(
						identifier(id), 
						{
	                        "type": "FunctionExpression",
	                        "id": null,
	                        "params": [],
	                        "defaults": [],
	                        "body": {
	                            "type": "BlockStatement",
	                            "body": [
	                                {
	                                    "type": "ReturnStatement",
	                                    "argument": expr.getAst()
	                                }
	                            ]
	                        },
	                        "generator": false,
	                        "expression": false
	                    }
					);
					var von = varDeclaration([vor]);
					prog.addStmnt(von);
					var getterAst = {
                        "type": "CallExpression",
                        "callee": {
                            "type": "Identifier",
                            "name": id
                        },
                        "arguments": []
                    }
					library.nodes[id] = new Node(getterAst, expr.getType());
				}
			}
			// catch(err) // For release version only
			// {
				// console.log(err);
				// error("Cannot build node " + id);
			// }
		}
    }
	
	var actionsGraph = graph.actions;
	for(var i = 0; i < actionsGraph.length; i++)
	{
		var actionGraph = actionsGraph[i];

		function makeAssignment(assignmentGraph, library) {
			var exprAst = makeExpr(assignmentGraph.value, library, {}).getAst();
			// TODO check existence and type of target
			return {
                "type": "ExpressionStatement",
                "expression": {
                    "type": "AssignmentExpression",
                    "operator": "=",
                    "left": {
                        "type": "Identifier",
                        "name": assignmentGraph.target.name
                    },
                    "right": exprAst
                }
            };
		}
		function makeStatement(statementGraph, library) {
			switch(statementGraph.type) {
				case "Assignment":
					return makeAssignment(statementGraph, library);
			}
		}
		function makeAction(actionGraph, library, prog) {
			var statements = _.map(actionGraph.statements, function(statement) {
				return makeStatement(statement, library)
			});
			var actionAst = {
	            "type": "FunctionDeclaration",
	            "id": {
	                "type": "Identifier",
	                "name": actionGraph.id.name
	            },
	            "params": [],
	            "defaults": [],
	            "body": {
	                "type": "BlockStatement",
	                "body": statements	                
	            },
	            "generator": false,
	            "expression": false
	        };

			prog.addStmnt(actionAst);
		}

		makeAction(actionGraph, library, prog);
    }


    return prog;

	var eventsGraph = graph.events;
	var eventIndex = 0;
	for(var i = 0; i < eventsGraph.length; i++)
	{
		var eventGraph = eventsGraph[i];
		var condition = makeExpr(eventGraph["when"], nodes);
		var action = makeAction(eventGraph["do"], nodes, connectionsGraph);
		src += condition.getBeforeStr() + action.getBeforeStr();
		src += "var __event" + eventIndex.toString() + " = new Event(" + condition.getNode() + ", {signal:function(){" + action.getNode() + "}});\n";
		src += condition.getAddSinkStr("__event" + eventIndex.toString());
		eventIndex++;
    }
	
	return src;
}
