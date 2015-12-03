function setEngineLodash(l)
{
	_=l;
}

function setLibrary(lib)
{
	library = lib;
}

function Node(getterAst, type, sinkListVarName, fields)
{
	this.type = type;
	this.getterAst = getterAst;
	this.sinkListVarName = sinkListVarName != undefined ? sinkListVarName : "";
	this.fields = fields != undefined ? fields : {};
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
function makeDependencies(exprGraph, sinkId, sinkToSources, nodeRefs, parentNodeId)
{
	// If the expression is an id, it is a source (maybe not root)
	if(exprGraph.type == "Id") {
		var sourceId = exprGraph.name;
		sinkToSources[sinkId][sourceId] = {};
	} else if(exprGraph.type == "FunctionCall") {
		_.each(exprGraph.args, function(arg) {
			makeDependencies(arg, sinkId, sinkToSources, nodeRefs, parentNodeId);
		});
	}  else if(exprGraph.type == "MemberExpression") {
		var objId = exprGraph.obj.name;
		// If the object name is "self", change it to parent id
		if(objId == "self") {
			objId = parentNodeId;
		}
		// The dependency is a node refs, dependendy must be made to the field
		if(objId in nodeRefs) {
			var sourceId = objId + "." + exprGraph.field.name;
			sinkToSources[sinkId][sourceId] = {};
		} else {
			makeDependencies(exprGraph.obj, sinkId, sinkToSources, nodeRefs, parentNodeId);
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
	    }
	};
	
    var sinkToSources = {};
    var sourceToSinks = {};
    var nodeRefs = {};
    for(var statementIndex = 0; statementIndex < graph.length; statementIndex++) {
		var statementGraph = graph[statementIndex];
		if(statementGraph.type == "NodeDef") {
			nodeRefs[statementGraph.id.name] = {};
		}
	};

	// Builds the sinkToSources dict
	// For each leaf sink (defs), get its direct sources by examining its expression
	// Note that sources in this dict may also be defs, i.e. not root sources
	var graphNodes = graph.nodes;
	for(var statementIndex = 0; statementIndex < graph.length; statementIndex++) {
		var statementGraph = graph[statementIndex];		
		if(statementGraph.type == "Var" || statementGraph.type == "Def") {
			var nodeGraph = statementGraph;
			var sinkId = nodeGraph.id.name;
			// If node is a def, it is a leaf sink
			if(nodeGraph.type == "Def") {
				sinkToSources[sinkId] = {};

				// Recursively gets sources of an expression				
				makeDependencies(nodeGraph.val, sinkId, sinkToSources, nodeRefs, "");
			}
		} else if(statementGraph.type == "NodeDef") {
			var nodeGraph = statementGraph;
			var nodeId = nodeGraph.id.name;
			_.each(nodeGraph.fields, function(fieldGraph) {
				var sinkId = nodeId + "." + fieldGraph.id.name;
				
				if(fieldGraph.type == "Def") {
					sinkToSources[sinkId] = {};

					// Recursively gets sources of an expression				
					makeDependencies(fieldGraph.val, sinkId, sinkToSources, nodeRefs, nodeId);
				}
		    });
		}
	}

	// Adds events sources to the sink to sources dict
	/*var eventsGraph = graph.events;
	for(var i = 0; i < eventsGraph.length; i++) {
		var eventGraph = eventsGraph[i];
		var eventId = "__event__" + i;
		sinkToSources[eventId] = {};
		makeDependencies(eventGraph.condition, eventId, sinkToSources, nodeRefs);
	}*/

	// Builds the root sources to leaf sinks dict,
	// From each sink, goes up to its sources, and recursively sources of sources ...
	// When a source is not in the sinkToSources dict, it's a root source (a var)
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

	for(var statementIndex = 0; statementIndex < graph.length; statementIndex++) {
		var statementGraph = graph[statementIndex];
		if(statementGraph.type == "Var") {
			makeVar(statementGraph, library, prog, sourceToSinks);
		}
		else if(statementGraph.type == "Def") {
			makeDef(statementGraph, library, prog);
		} else if(statementGraph.type == "SlotDef") {
			makeGlobalSlot(statementGraph, library, prog);
		} else if(statementGraph.type == "SignalDef") {
			makeSignalDef(statementGraph, library, prog);
		} else if(statementGraph.type == "GenDef") {
			makeGenDef(statementGraph, library, prog);
		} else if(statementGraph.type == "ChainedConnection") {
			makeChainedConnection(statementGraph, library, prog);
		} else if(statementGraph.type == "NodeDef") {
			makeNodeDef(statementGraph, library, prog, sourceToSinks);
		} else if(statementGraph.type == "ClassDef") {
			makeClass(statementGraph, library, prog);
		}
	}


	for(var id in sourceToSinks) {
		// The members path in sourceToSinks are in the form n.x
		// we transform them in the form n$x to be able to make valid variable names
        sinkListVarName = memberPathToId(id) + "$sinkList";
        var sinks = sourceToSinks[id];
        // It's an array made of the id of the leaf sinks
        // var id$sinkList = [_.map(sinks, ast.id)];
        var declaratorInit = {
            "type": "ArrayExpression",
            "elements": _.map(sinks, ast.id)
        };
        var varDeclaration = ast.varDeclaration(sinkListVarName, declaratorInit);
        prog.addStmnt(varDeclaration);
    }

    // Adds events sources to the sink to sources dict
	// for(var i in eventsGraph) {
	// 	var eventGraph = eventsGraph[i];
	// 	var eventId = "__event__" + i;
	// 	makeEvent(eventGraph, eventId, library, prog);
	// }

	return prog;

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

	var actionsGraph = graph.actions;
	for(var i = 0; i < actionsGraph.length; i++)
	{
		makeAction(actionsGraph[i], library, prog);
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
