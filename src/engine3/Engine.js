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

function makeStruct(structGraph, library, prog)
{
	if(structGraph.typeParams.length > 0)
	{
		var func = new FunctionTemplate(structGraph);
		library.functions[structGraph.id] = func;
		library.nodes[structGraph.id] = funcToNodeSpec(func);
	}
	else
	{
		// If the function has been predeclared, complete the object
		if(structGraph.id in library.functions)
		{
			var func = library.functions[structGraph.id];
			var funcNode = library.nodes[structGraph.id];
		}
		else
		{
			// Else create a new function instance object
			var fields = structGraph.fields;
			var fieldsType = _.map(fields, function(field) {
				return {
					base : field.type.base,
					args : field.type.args
				};
			});

			var bodyGraph = structGraph.body;
			var expr = null;
			var exprType = null;
			if(bodyGraph != null)
			{							
				var localNodes = {};
				_.each(fields, function(field) {
					localNodes[field.id.name] = new Node({
					        "type": "Identifier",
					        "name": field.id.name
					    }, {
							base : field.type.base,
							args : field.type.args
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

			var inAndOutTypes = makeFunctionType(fieldsType, exprType);

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
				                    "name": structGraph.id
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

			library.functions[structGraph.id] = func;

			var stmnt = {
		        "type": "FunctionDeclaration",
		        "id": {
		            "type": "Identifier",
		            "name": structGraph.id
		        },
		        "params": _.map(fields, function(field) {
		        	return {
		                "type": "Identifier",
		                "name": field.id
		            };}),
		        "defaults": [],
		        "body": {
		            "type": "BlockStatement",
		            "body": [
		                {
		                    "type": "ReturnStatement",
		                    "argument": {
	                            "type": "ObjectExpression",
	                            "properties": _.map(fields, function(field) {
	                                return {
	                                    "type": "Property",
	                                    "key": {
	                                        "type": "Identifier",
	                                        "name": field.id
	                                    },
	                                    "computed": false,
	                                    "value": {
	                                        "type": "Identifier",
	                                        "name": field.id
	                                    },
	                                    "kind": "init",
	                                    "method": false,
	                                    "shorthand": false
	                                };
	                            })
	                        }
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
			var id = nodeGraph.id;
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
