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

function compileGraph(graph, lib, previousNodes) 
{
	// globals init
	var nodes = previousNodes != undefined ? previousNodes : {};
	library = lib;
	
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
					var val = makeExpr(nodeGraph.val, nodes);
					var vor = varDeclarator(
						identifier(id), newExpression(
							identifier("Store"),
							[
								val.getAst(),
								typeToAst(val.getType())
							]
						)
					);
					var von = varDeclaration([vor]);
					prog.addStmnt(von);
					nodes[id] = new Node(val.getType());
				}
				else
				{
					var val = makeExpr(nodeGraph.val, nodes);
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
	                                                "argument": val.getAst()
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
					nodes[id] = new Node(val.getType());
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
