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
