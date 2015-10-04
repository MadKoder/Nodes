function setEngineLodash(l)
{
	_=l;
}

function setLibrary(lib)
{
	library = lib;
}

function Node(type)
{
	this.type = type;
}

function Val(type)
{
	this.type = type;
}

function makeFunction(funcGraph, library, prog)
{
	if(funcGraph.typeParams != null)
	{
		var func = new FunctionTemplate(funcGraph);
		library.functions[funcGraph.id] = func;
		library.nodes[funcGraph.id] = funcToNodeSpec(func);
	}
	else
	{
		// If the function has been predeclared, complete the object
		if(funcGraph.id in library.functions)
		{
			var func = library.functions[funcGraph.id];
			var funcNode = library.nodes[funcGraph.id];
		}
		else
		{
			// Else create a new function instance object
			var params = funcGraph.params;
			var paramsType = _.map(params, function(param) {
				return {
					base : param.type.base,
					args : param.type.args
				};
			});

			var bodyGraph = funcGraph.body;
			var expr = null;
			var exprType = null;
			if(bodyGraph != null)
			{							
				var localVals = {};
				_.each(params, function(param) {
					localVals[param.id.name] = new Val({
							base : param.type.base,
							args : param.type.args
						}
					);
				});

				expr = makeExpr(
					bodyGraph, 
					{
						functions : library.functions,
						nodes : {},
						vals : localVals
					},
					{}
				);
				exprType = expr.type;
			}

			var inAndOutTypes = makeFunctionType(paramsType, exprType);

			var func = {
				guessTypeArgs : function(args)
				{
					return [];
				},		
				getInstance : function(typeArgs)
				{
					return {
						getAst : function(args) 
						{	
							return {
				                "type": "CallExpression",
				                "callee": {
				                    "type": "Identifier",
				                    "name": funcGraph.id
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
			}

			library.functions[funcGraph.id] = func;

			var stmnt = {
		        "type": "FunctionDeclaration",
		        "id": {
		            "type": "Identifier",
		            "name": funcGraph.id
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
		                    "argument": expr.getAst()
		                }
		            ]
		        },
		        "generator": false,
		        "expression": false
		    }
			prog.addStmnt(stmnt);
		}
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
			var id = nodeGraph.id;
			//try
			{
				if(nodeGraph.type == "var")
				{
					var expr = makeExpr(nodeGraph.val, library, {});
					var vor = varDeclarator(
						identifier(id), newExpression(
							identifier("Store"),
							[
								expr.getAst(),
								typeToAst(expr.getType())
							]
						)
					);
					var von = varDeclaration([vor]);
					prog.addStmnt(von);
					library.nodes[id] = new Node(expr.getType());
				}
				else
				{
					var expr = makeExpr(nodeGraph.val, library, {});
					// value is an object
					// {
					// 	get : function()
					// 	{
					// 		return valAst
					// 	}
					// }
					var vor = varDeclarator(
						identifier(id), 
						{
	                        "type": "ObjectExpression",
	                        "properties": [
	                            {
	                                "type": "Property",
	                                "key": {
	                                    "type": "Identifier",
	                                    "name": "get"
	                                },
	                                "value": {
	                                    "type": "FunctionExpression",
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
	                                    }
	                                },
	                                "kind": "init"
	                            }
	                        ]
	                    }
					);
					var von = varDeclaration([vor]);
					prog.addStmnt(von);
					library.nodes[id] = new Node(expr.getType());
				}
			}
			// catch(err) // For release version only
			// {
				// console.log(err);
				// error("Cannot build node " + id);
			// }
		}
    }

    return prog;
    return mainBlock.getStr(-1);
	
	for(var i = 0; i < actionsGraph.length; i++)
	{
		var actionGraph = actionsGraph[i];
		var id = getId(actionGraph);
		if(id.length == 1)
		{
			var localNodes = _.clone(nodes);

			var inputStr = "";
			if(actionGraph.inParams)
			{
				inputStr = _.map(actionGraph.inParams, function(param)
				{
					localNodes[param[0]] = new Var(param[0] + ".get()", param[0], param[1]);
					return param[0];
				}).join(", ");
			}

			var action =  makeAction(actionGraph, localNodes);
			src += "function " + id[0] + "(" + inputStr + "){\n";
			src += action.getBeforeStr();
			src += action.getNode() + "}\n";
		}
    }
	
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
