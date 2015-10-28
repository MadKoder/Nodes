function setEngineLodash(l)
{
	_=l;
}

function setLibrary(lib)
{
	library = lib;
}

function Node(getterAst, type, sinkListVarName)
{
	this.type = type;
	this.getterAst = getterAst;
	this.sinkListVarName = sinkListVarName != undefined ? sinkListVarName : "";
}

function __dirtySinks(sinks){
	_.each(sinks, function(sink) {
		sink.dirty();
	});
}

function __def(getter)
{
	return {
		get : function() {
			if(this.isDirty) {
				this.val = getter();
				this.isDirty = false;
			}
			return this.val;
		},
		isDirty : true,
		dirty : function() {
			this.isDirty = true;
		},
		val : null
	};
}

// Recursively gets sources of an expression				
function makeDependencies(exprGraph, sinkId, sinkToSources)
{
	// If the expression is an id, it is a source (maybe not root)
	if(exprGraph.type == "Id") {
		var sourceId = exprGraph.name;
		sinkToSources[sinkId][sourceId] = {};
	} else if(exprGraph.type == "CallExpression") {
		_.each(exprGraph.args, function(arg) {
			makeDependencies(arg, sinkId, sinkToSources);
		});
	}  else if(exprGraph.type == "MemberExpression") {
		makeDependencies(exprGraph.obj, sinkId, sinkToSources);
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
	    }
	};
	
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

	// Builds the sinkToSources dict
	// For each leaf sink (defs), get its direct sources by examining its expression
	// Note that sources in this dict may also be defs, i.e. not root sources
	var graphNodes = graph.nodes;
    var connectionsGraph = graph.connections;
    var sinkToSources = {};
    for(var i = 0; i < graphNodes.length; i++)
	{
		var nodeRow = graphNodes[i];
		for(var j = 0; j < nodeRow.length; j++)
		{
			var nodeGraph = nodeRow[j];
			var sinkId = nodeGraph.id.name;
			// If node is a def, it is a leaf sink
			if(nodeGraph.type == "def")
			{
				sinkToSources[sinkId] = {};

				// Recursively gets sources of an expression				
				makeDependencies(nodeGraph.val, sinkId, sinkToSources);
			}
		}
	}

	// Adds events sources to the sink to sources dict
	var eventsGraph = graph.events;
	for(var i = 0; i < eventsGraph.length; i++) {
		var eventGraph = eventsGraph[i];
		var eventId = "__event__" + i;
		sinkToSources[eventId] = {};
		makeDependencies(eventGraph.condition, eventId, sinkToSources);
	}

	// Builds the root sources to leaf sinks dict,
	// From each sink, goes up to its sources, and recursively sources of sources ...
	// When a source is not in the sinkToSources dict, it's a root source (a var)
    var sourceToSinks = {};
	for(leafSinkId in sinkToSources) {
		function addRootSourcesOfCurrentLeafSink(sourceId) {
			// Source is a def, adds its sinks
			if(sourceId in sinkToSources) {
				var sources = sinkToSources[sourceId];
				_.each(sources, function(dummy, sourceId) {
					addRootSourcesOfCurrentLeafSink(sourceId)
				});
			} else {
				// Source root, adds it to the dict if not already in,
				// And adds the leaf sink in its sinks dict
				if(!(sourceId in sourceToSinks)) {
					sourceToSinks[sourceId] = [];
				}
				// Adds the sink if not already in the sink array
				sourceToSinks[sourceId] = _.union(
					sourceToSinks[sourceId],
					[leafSinkId]
				);
			}
		}

		// Begin with the leaf sink as its own source
		addRootSourcesOfCurrentLeafSink(leafSinkId);
	}

	var sinksListDeclarations = [];
    for(var i = 0; i < graphNodes.length; i++) {
		var nodeRow = graphNodes[i];
		for(var j = 0; j < nodeRow.length; j++) {
			var nodeGraph = nodeRow[j];
			var id = nodeGraph.id.name;
			//try
			{
				if(nodeGraph.type == "var") {
					var expr = makeExpr(nodeGraph.val, library, {});
					var getterAst, declaratorInit;
					// if(id in sourceToSinks) {
					if(false) {
						declaratorInit = {
	                        "type": "NewExpression",
	                        "callee": {
	                            "type": "Identifier",
	                            "name": "Store"
	                        },
	                        "arguments": [
	                            expr.getAst()
	                        ]
	                    };
                    }
					else {
						declaratorInit = expr.getAst();
					}
					var varDeclarator = ast.varDeclarator(
						ast.identifier(id), declaratorInit
					);
					var varDeclaration = ast.varDeclaration([varDeclarator]);
					prog.addStmnt(varDeclaration);
					var sinkListVarName = "";
					if(id in sourceToSinks) {
						sinkListVarName = id + "$sinkList";
						var sinks = sourceToSinks[id];
						var declaratorInit = {
	                        "type": "ArrayExpression",
	                        "elements": _.map(sinks, ast.identifier)
	                    }
						var varDeclarator = ast.varDeclarator(
							ast.identifier(sinkListVarName), declaratorInit
						);
						var varDeclaration = ast.varDeclaration([varDeclarator]);
						sinksListDeclarations.push(varDeclaration);
					}
					var getterAst = {
                        "type": "Identifier",
                        "name": id
                    };
                    library.nodes[id] = new Node(getterAst, expr.type, sinkListVarName);
				}
				else
				{
					var expr = makeExpr(nodeGraph.val, library, {});
					var varDeclarator = ast.varDeclarator(
						ast.identifier(id), 
						{
	                        "type": "CallExpression",
	                        "callee": {
	                            "type": "Identifier",
	                            "name": "__def"
	                        },
	                        "arguments": [
	                            {
	                                "type": "FunctionExpression",
	                                "params": [],
	                                "body": {
	                                    "type": "BlockStatement",
	                                    "body": [
	                                        {
	                                            "type": "ReturnStatement",
	                                            "argument": expr.getAst()
	                                        }
	                                    ]
	                                },
	                            }
	                        ]
	                    }
					);
					var varDeclaration = ast.varDeclaration([varDeclarator]);
					prog.addStmnt(varDeclaration);
					var getterAst = {
                        "type": "CallExpression",
                        "callee": {
                            "type": "MemberExpression",
                            "computed": false,
                            "object": {
                                "type": "Identifier",
                                "name": id
                            },
                            "property": {
                                "type": "Identifier",
                                "name": "get"
                            }
                        },
                        "arguments": []
                    };
					library.nodes[id] = new Node(getterAst, expr.type);
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
		makeAction(actionsGraph[i], library, prog);
    }

    // Adds events sources to the sink to sources dict
	for(var i in eventsGraph) {
		var eventGraph = eventsGraph[i];
		var eventId = "__event__" + i;
		makeEvent(eventGraph, eventId, library, prog);
	}

    for(var i in sinksListDeclarations) {
		prog.addStmnt(sinksListDeclarations[i]);
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
