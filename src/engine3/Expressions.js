
function getId(node)
{
	return "id" in node ? node.id : (("def" in node) ? node.def : ("var" in node ? node["var"] : node["cache"]))
}

function Val(ast, type)
{
	this.ast = ast;
	this.type = type;
	
	this.getAst = function()
	{
		return this.ast;
	}

	this.getType = function()
	{
		return this.type;
	}
}

function makeExpr(expr, nodes, genericTypeParams, cloneIfRef)
{
	if (_.isNumber(expr) || _.isBoolean(expr))
	{
		var type = _.isNumber(expr) ? (
			(Math.floor(expr) != expr) ?
				"float" :
				"int"
		) : 
		"bool";
		return new Val(literal(expr), type);
	} else if("type" in expr)
	{
		var node;
		var type = getBaseType(expr.type);
		// When type of expression is explicitely defined (ex. var dict<string, int>)
		var typeParams = getTypeParams(expr.type);
		if(!(type in library.nodes))
		{
			error("Function " + type + " not found in nodes library");
		}
		var nodeSpec = library.nodes[type];
		
		var paramsGraph = expr.params;
		var fieldsGraph = expr.fields;
		var fields = {};
		if(fieldsGraph != undefined)
		{
			// TODO !!!
			fields = compileFields(fieldsGraph, path, type, nodes, false);
		}

		// TODO simplifier
		if(("guessTypeParams" in nodeSpec))
		{
			var instance;
			if(typeParams.length == 0 && "typeParams" in expr)
			{
				// If we are evaluating a generic expression, and we are in a generic function,
				// convert the generic types of the expression to the concrete types defined 
				// in the current instance of the function
				if(genericTypeParams)
				{
					var typeParams = _.map(expr.typeParams, function(type)
					{
						if(type in genericTypeParams)
							return genericTypeParams[type];
						return type;
					});
				} 
				else
				{
					var typeParams = expr.typeParams;				
				}
			}
			if(paramsGraph != undefined)
			{
				var vals = _.map(paramsGraph, function(paramGraph)
				{
					return makeExpr(paramGraph, nodes, genericTypeParams);
				});
				// TODO : faire check entre type explicite et deduit				
				if(typeParams.length == 0)
					typeParams = nodeSpec.guessTypeParams(vals);
				
				instance = nodeSpec.getInstance(typeParams);
				var paramsSpec = _.map(instance["fields"], function(nameAndType){return nameAndType[0];});
				fields = _.zipObject(paramsSpec, vals);
			}
			else
			{
				instance = nodeSpec.getInstance(typeParams);
			}
			
			// TODO template explicite
			node = new instance.builder(fields, typeParams);
		}
		else
		{
			if(paramsGraph != undefined)
			{
				var fieldsSpec = nodeSpec["fields"];
				var nbParamsSpec = _.filter(fieldsSpec, function(field){return _.isArray(field);}).length;
				if(paramsGraph.length < nbParamsSpec)
				{
					error("Not enough params in constructor of " + type + ". Required " + nbParamsSpec + " found " + paramsGraph.length);
				}
				for(var paramIndex = 0; paramIndex < paramsGraph.length; paramIndex++)
				{
					var paramSpec = fieldsSpec[paramIndex];
					var val = makeExpr(paramsGraph[paramIndex], nodes);
					var valType = val.getType();					
					if(genericTypeParams && valType in genericTypeParams)
					{
						valType = genericTypeParams[valType];
					}
					if(!isSameOrSubType(valType, paramSpec[1]))
					{
						error("Parameter of index " + paramIndex + " in call of " + 
							expr.type + " is of type " + typeToString(val.getType()) + ", required type " + typeToString(paramSpec[1]));
					}
					fields[paramSpec[0]] = val;
				}
			}
			node = new nodeSpec.builder(fields, typeParams);
		}

		if("connections" in expr)
		{
			// TODO always true ?
			node.needsNodes = true;
			var type = node.getType();
			var signals = node.getSignals();
			var typeSignals = library.nodes[type].signals;

			_.each(expr.connections, function(connection)
			{
				var mergedNodes = _.clone(nodes);
				_.merge(mergedNodes, typeSignals[connection.signal].localNodes);
				signals[connection.signal] = {action : connection.action, nodes : mergedNodes};
			});
		}
		return node;
	} 
}

function isLit(expr)
{
 	return (_.isNumber(expr) || _.isBoolean(expr));
}
