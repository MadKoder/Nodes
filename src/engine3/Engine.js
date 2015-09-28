function setEngineLodash(l)
{
	_=l;
}

function setLibrary(lib)
{
	library = lib;
}

function getId(node)
{
	return "id" in node ? node.id : (("def" in node) ? node.def : ("var" in node ? node["var"] : node["cache"]))
}

function getBaseType(type)
{
	if(type == undefined)
		throw "Type undefined in getBaseType"
	if(isString(type))
	{
		return type;
	}
	return type.base;
}

function getTypeParams(type)
{
	if(type == undefined)
		throw "Type undefined in getTypeParams"
	if(isString(type))
	{
		if(/^[^<]*<([^>]*)>$/.test(type))
		{
			return RegExp.$1;
		}
		// TODO : erreur
		return [];
	}
	if("params" in type)
		return type.params;
	return [];
}

function Val(valStr, type)
{
	this.valStr = valStr;
	this.type = type;
	
	this.getVal = function()
	{
		return this.valStr;
	}

	this.getType = function()
	{
		return this.type;
	}
}

function makeExpr(expr, nodes, genericTypeParams, cloneIfRef)
{
	if(_.isArray(expr) || (_.isString(expr) && (expr[expr] != "'" || expr[expr.length - 1] != "'")))
	{
		// expr is a reference
		var compiledRef = compileRef(expr, nodes);
		// Utilise par les actions d'affectations, pour copier la valeur et non la reference
		if(cloneIfRef && !(compiledRef.isConstant))
		{
			var str = "new Cloner(" + compiledRef.getNode() + ")";
			return new Var("(" + str + ").get()", str, compiledRef.getType());
		}
		return compiledRef;
	} else if (_.isNumber(expr) || _.isBoolean(expr))
	{
		var type;
		if(_.isNumber(expr))
		{
			if(Math.floor(expr) != expr)
			{
				type = "float";
			}
			else
			{
				type = "int";
			}
		} 
		else
		{
			type = "bool";
		}
		return new Val(expr.toString(), type);
	} else if("access" in expr)
	{
		var ref = makeExpr(expr.access, nodes);
		var indexOrKey = makeExpr(expr.indexOrKey, nodes);
		var dictTypeParam = getDictTypeParam(ref.getType());
		// TODO For array
		// TODO check type of ref, type of indexKey
		var str = "new DictAccess(" + ref.getNode() + ", " + indexOrKey.getNode() + ", " + typeToJson(dictTypeParam) + ")";
		return new Var(str + ".get()", str, dictTypeParam);
	} else if("array" in expr)
	{
		var typeParam = "";
		var beforeStr = "";
		var valStr = "[";
		var nodeStr = "[";
		_.each(expr.array, function(elt, index)
		{
			var expr = makeExpr(elt, nodes);
			beforeStr += expr.getBeforeStr();
			
			if(typeParam == "")
			{
				typeParam = expr.getType();
			} else
			{
				typeParam = getCommonSuperClass(typeParam, expr.getType())
			}

			var comma = (index == 0) ? "" : ", ";
			valStr += comma + expr.getVal();
			nodeStr += comma + expr.getNode();			
		}, "[");
		valStr += "]";
		nodeStr += "]";
		
		return new Var(valStr, "new List(" + nodeStr + ")", mListType(typeParam), beforeStr, undefined);		
	} else if("dict" in expr)
	{
		var d = _.mapValues(expr.dict, function(val)
			{
				return makeExpr(val, nodes);
			}
		);

		var dictVal = "{" + _.map(d, function(val, key)
		{
			return key + " : " + val.getVal();
		}).join(", ") + "}";

		var dictVar = "{" + _.map(d, function(val, key)
		{
			return key + " : " + val.getNode();
		}).join(", ") + "}";

		var valType = "";
		_.forOwn(d, function(val)
		{
			var newType = val.getType();
			if(valType == "")
			{
				valType = newType;
			}
			else if(!sameTypes(valType, newType))
			{
				error("Dict value types are not the same, found " + valType + " and " + newType);
			}
		});

		return new Var(dictVal, "new Dict(" + dictVar + ", \"" + typeToJson(valType) + "\")", {base : "dict", params : ["string", valType]});
		
	} else  if("string" in expr)
	{
		var str = "\"" + expr.string.replace(/\\/g, "\\\\").replace(/"/g, "\\\"") + "\"";
		return new Var(str, "new Store(" + str + ", string)", "string");
	} else if("type" in expr)
	{
		if(expr.type == undefined)
		{
			throw "Type undefined in makeNode";
		}
		
		var node;
		if(!_.isString(expr.type) && ("type" in expr.type))
		{
			var node = makeExpr(expr.type, nodes);
			var closure = node.get();
			var type = "closure";
			var typeParams = [];
			var nodeSpec = new funcToNodeSpec(closure);
		}
		else
		{
			var type = getBaseType(expr.type);
			// When type of expression is explicitely defined (ex. var dict<string, int>)
			var typeParams = getTypeParams(expr.type);
			if(!(type in library.nodes))
			{
				error("Function " + type + " not found in nodes library");
			}
			var nodeSpec = library.nodes[type];
		}

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
		return node;
	} else if("merge" in expr)
	{
		function makeAffectationStr(matchesGraph, nodes)
		{
			return "[" + _.map(matchesGraph, function(mergeExp){
				
				if("cond" in mergeExp)
				{
					var cond = makeExpr(mergeExp.cond, nodes);
					var affects = makeAffectationStr(mergeExp.affectations);
					var elseAffects = undefined;
					if("else" in mergeExp)
					{
						var elseAffects = makeAffectationStr(mergeExp["else"]);
					}
					var node = "new CondAffectation(" + cond.getNode() + ", " + affects + ", " + elseAffects + ")";
					return node;
				}
				
				var node = "new Affectation(" + makeExpr(mergeExp.val, nodes).getNode() + ", " + 
					"[" + _.map(mergeExp.paths, pathToString).join(", ") + "])";
				return node;
			}).join(", ") + "]";
		}

		var what = compileRef(expr.merge, nodes);
		var node = "new Merge(" + what.getNode() + ", " +  makeAffectationStr(expr["with"], nodes) + ", " + typeToJson(what.getType()) + ")";
		return new Var(node + ".get()", node, what.getType());
	} else if("let" in expr)
	{
		var what = expr.let;
		var mergedNodes = _.clone(nodes);
		_.forEach(what, function(node)
		{
			// TODO : utiliser "var" plutot ?
			mergedNodes[node.def] = makeNode(node, mergedNodes);
		});
		return makeExpr(expr["in"], mergedNodes);
	} else if("match" in expr)
	{
		// TODO type avec template
		var cases = "[" + expr["cases"].map(function(caseGraph)
			{
				return "{" +
					"vals : [" + _.map(caseGraph.vals, function(val)
						{
							return makeExpr(val, nodes).getNode()
						}).join(", ") + "], " +
					"out : " + makeExpr(caseGraph.out, nodes).getNode() +
				"}"
			}).join(", ") + "]";
		var elseExpr = makeExpr(expr["else"], nodes)
		var elseStr = elseExpr.getNode();
		var type = elseExpr.getType();

		var str = "new Match(" + makeExpr(expr.match, nodes).getNode() + ", " + cases + ", " + elseStr + ", " + typeToJson(type) + ")";
		return new Var("(" + str + ").get()", str, type);
	} else if("matchType" in expr)
	{

		var what = makeExpr(expr.matchType, nodes);
		
		var addsRefs = "false";
		var returnType = null;
		var beforeStr ="";
		var matchNeedsNodes = false;
		var cases = "[\n" + expr["cases"].map(function(matchExp){
			var matchType = matchExp.type;
			if(genericTypeParams && matchType in genericTypeParams)
			{
				matchType = genericTypeParams[matchType];
			}
			var matchStore = new Var(what.getVal(), what.getNode(), matchType != "_" ? matchType : what.getType());
			var mergedNodes = _.clone(nodes);
			mergedNodes[expr.matchType] = matchStore;
			
			var val = makeExpr(matchExp.val, mergedNodes, genericTypeParams);
			
			var needsNodes = "false";
			if(val.needsNodes)
			{
				needsNodes = "true";
				addsRefs = "true";
				matchNeedsNodes = true;
			}

			if(returnType == null)
			{
				returnType = val.getType();
			}
			else
			{
				returnType = getCommonSuperClass(returnType, val.getType());
			}
			
			return "{\nval : " + val.getNode() + ",\n type : " + typeToJson(matchType) + ",\n needsNodes : " + needsNodes + "\n}";
		}, this).join(",\n ") + "\n]";

		// TODO type avec template
		var str = "new MatchType(" + what.getNode() + ", " + cases + ", " + typeToJson(returnType) + ", " + addsRefs + ")";
		var ret = new Var("(" + str + ").get()", str, returnType, "", undefined);
		if(matchNeedsNodes)
			ret.needsNodes = true;
		return ret;
		// return new MatchType(expr.matchType, expr["cases"]);
	} else if("comp" in expr)
	{
		return new ComprehensionNode(expr, nodes);
	} else if("closure" in expr)
	{
		var funcName = "lambda" + lambdaIndex.toString();
		var funcDef = "function(";
		var localNodes = _.clone(nodes);
		inputTypes = [];
		var storeStr = "";
		funcDef += _.map(expr.params, function(param, index)
		{
			var paramType = (genericTypeParams != undefined &&  param.type in genericTypeParams) ?
				genericTypeParams[param.type] :
				param.type;
			storeStr += newVar("new Store(" + param.id + ", " + typeToJson(paramType) + ")");
			var node = new Var(param.id, getVar(), paramType);
			localNodes[param.id] = node;
			inputTypes.push(paramType);
			return param.id;
		}).join(", ") + "){\n";
		
		var builtExpr = makeExpr(expr.closure, localNodes, genericTypeParams);
		funcDef += storeStr;
		funcDef += builtExpr.getBeforeStr();
		funcDef += "return " + builtExpr.getVal() + "\n}\n";

		return new Var(funcDef, funcDef, {inputs : inputTypes, output : builtExpr.getType()});
	}
}

function isLit(expr)
{
 	return (_.isNumber(expr) || _.isBoolean(expr))
}

function compileGraph(graph, lib, previousNodes) 
{
	// globals init
	var nodes = previousNodes != undefined ? previousNodes : {};
	library = lib;
	mainBlock = new Block("", "", "\n", undefined, ";");;
	mainBlock.addVar("float", "{}");
	mainBlock.addVar("int", "{}");
	mainBlock.addVar("string" , "{}");
	
	// return mainBlock.getStr(0);
	
	var graphNodes = graph.nodes;
    var connectionsGraph = graph.connections;
    for(var i = 0; i < graphNodes.length; i++)
	{
		var nodeRow = graphNodes[i];
		for(var j = 0; j < nodeRow.length; j++)
		{
			var nodeGraph = nodeRow[j];
			var id = getId(nodeGraph);
			//try
			{
				if("var" in nodeGraph)
				{
					var val = makeExpr(nodeGraph.val, nodes);
					mainBlock.addVar(id, "new Store(" + val.getVal() + ", " + typeToJson(val.getType()) + ")");
					// nodes[id] = new Var(id + ".get()", id, node.getType(), "", id);
				}
				else
				{
					if(isLit(nodeGraph.val))
					{
						var val = makeExpr(nodeGraph.val, nodes);
						mainBlock.addVar(id, "new Store(" + val.getVal() + ", " + typeToJson(val.getType()) + ")");
					}
					else
					{
						var val = nodeGraph.val;
						var expr =  makeExpr(nodeGraph.val, nodes);
						var node = expr.getNode();
						var a = 1;
						mainBlock.addVar(id, node.getStr(0));
					}
					// mainBlock.addVar(id, val.getNode());
					// src += "var " + id + " = " + node.getNode() + ";\n";
					// nodes[id] = new Def(id + ".get()", id, node.getType(), "", node);
				}
			}
			// catch(err) // For release version only
			// {
				// console.log(err);
				// error("Cannot build node " + id);
			// }
		}
    }

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
