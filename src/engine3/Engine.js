function setEngineLodash(l)
{
	_=l;
}

function setLibrary(lib)
{
	library = lib;
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

	// return mainBlock.getStr(0);
	
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
				if(nodeGraph.type == "var" || isLit(nodeGraph.val))
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
					// var val = makeExpr(nodeGraph.val, nodes);
					// mainBlock.addVar(id, "new Store(" + val.getVal() + ", " + typeToJson(val.getType()) + ")");
					// nodes[id] = new Var(id + ".get()", id, node.getType(), "", id);
				}
				else
				{
					var val = nodeGraph.val;
					var expr =  makeExpr(nodeGraph.val, nodes);
					var node = expr.getNode();
					mainBlock.addVar(id, node.getStr(0));
					var a = varDeclarator(identifier(id), literal(1));
					var b = varDeclaration([a])
					prog.addStmnt(b);
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
