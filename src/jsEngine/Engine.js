var library;

function error(str)
{
	throw "Compilation error : " + str;
}

function setEngineLodash(l)
{
	_=l;
}

function isString(val)
{
	return (typeof val == 'string' || val instanceof String);
}

function isNumber(val)
{
	return (typeof val == 'number' || val instanceof Number);
}

function isBool(val)
{
	return (typeof val == 'boolean');
}

function isArray(val)
{
	return val instanceof Array;
}

function isRef(v)
{
	return isArray(v) || (isString(v) && (v[0] != "'" || v[v.length - 1] != "'"));
}

function getId(node)
{
	return "id" in node ? node.id : (("def" in node) ? node.def : ("var" in node ? node["var"] : node["const"]))
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

function getTemplates(type)
{
	if(type == undefined)
		throw "Type undefined in getTemplates"
	if(isString(type))
	{
		if(/^[^<]*<([^>]*)>$/.test(type))
		{
			return RegExp.$1;
		}
		// TODO : erreur
		return [];
	}
	if("templates" in type)
		return type.templates;
	return [];
}

function List(val, templateType)
{
	this.list = val;
	this.templateType = templateType;
	this.get = function (path)
    {
		return this.list.map(function(item)
		{
			return item.get();
		});
    }
	
	this.signal = function(value)
    {
		this.list = value;
    }
	
	this.update = function(l)
	{
		var list = this.list;
		return l.map(function(item, index)
		{
			return list[index].update(item);
		});
	}
	
	this.getType = function()
	{
		return {base : "list", templates : [this.templateType]};
	}
}

function Store(v, type) 
{
	this.val = v;
	this.type = type;

	this.deltas = [];
	this.tag = 0;
	
	this.sinks = [];
	
	if(type != null)
	{
		var baseType = getBaseType(type);
		var templates = getTemplates(type);
		var typeObj = (templates.length > 0) ? 
			library.nodes[baseType].getInstance(templates) :
			library.nodes[type];
		if(typeObj != undefined && "operators" in typeObj)
		{
			var operators = typeObj.operators;
			//this.signalOperator = operators.signal;
		}
	}
	
	this.get = function()
	{
		return this.val;
	};

	this.set = function(val)
	{
		this.val = val;
		_.each(this.sinks, function(sink)
		{
			sink.dirty()
		});
	};
	
	this.addSink = function(sink)
	{
		this.sinks.push(sink);
	};
	
	
	this.signalStored = function(signal, params)
	{
		operators.signal(this.val, signal, params)
	};
	
	this.addDelta = function(delta)
	{
		this.deltas.push(delta);
		this.tag++;
		_.each(this.sinks, function(sink)
		{
			sink.dirty()
		});
	}
	
	this.getDeltas = function(tag)
	{
		if(tag < this.tag)
		{
			if(tag < 0)
			{
				return [new ListDelta(this.val, 0, [])];
			}
			
			return this.deltas.slice(tag - this.tag);
		}
		
		return [];
	}
	
	this.getType = function()
	{
		return this.type;
	}
}

function ActionParam(type) 
{
	this.type = type;
	var baseType = getBaseType(type);
	var templates = getTemplates(type);
	var typeObj = (templates.length > 0) ? 
		library.nodes[baseType].getInstance(templates) :
		library.nodes[type];
	if(typeObj != undefined && "operators" in typeObj)
	{
		var operators = typeObj.operators;
	}
	
	this.get = function()
	{
		return this.val;
	};

	this.signal = function(val)
	{
		this.val = val;
	};
	
	this.getType = function()
	{
		return this.type;
	}
	
	this.addSink = function()
	{
		// TODO something to do ? I think not...
	}
}

function StoreFunctionTemplate(t) 
{
	this.template = t;
	this.func = null;
	//this.type = null;

	this.get = function()
	{
		return this.func;
	};
	
	this.getTemplate = function()
	{
		return this.template;
	};
	
	this.setTemplateParams = function(params)
	{
		this.func = this.template.build(params);		
	};
	
	// this.getType = function()
	// {
		// return this.type;
	// }
	
	this.addSink = function(sink)
	{
		// TODO : y'en a besoin ?
	};
	
}

function Comprehension(nodeGraph, externNodes)
{
	this.nodes = {};
	
	// TODO  connections
	var iterators = nodeGraph.it;
	this.arrays = new Array(iterators.length);
	var inputs = new Array(iterators.length);
	var destructInputs = new Array(iterators.length);
	var comprehensionIndices = new Array(iterators.length);

	_.forEach(iterators, function(iterator, index)
	{
		exprAndType = makeExprAndType(iterator["in"], externNodes);
		this.arrays[index] = exprAndType.val;
		var inputType = exprAndType.val.getType();
		if(getBaseType(inputType) != "list")
		{
			error("Comprehension input parameter " + iterator["in"] + " is not a list : " + inputType);
		}
		var inputTemplateType = getTemplates(inputType)[0];
	
		var inputGraph = iterator["for"];
		if(_.isString(inputGraph))
		{
			inputs[index] = new Store(null, inputTemplateType);
			this.nodes[iterator["for"]] = inputs[index];
		} else // destruct
		{
			var destructGraph = inputGraph.destruct;
			var destructTypes = getTemplates(inputTemplateType);
			destructInputs[index] = _.map(destructTypes, function(type)
			{
				return new Store(null, type)
			});
			this.nodes = _(destructGraph)
				.zipObject(destructInputs[index])
				.value();
		}
		if("index" in iterator)
		{
			// TODO  Path ?
			// TODO param nodes = union(this.nodes, externNodes)
			comprehensionIndices[index] = new Store(null, "int");
			this.nodes[iterator["index"]] = comprehensionIndices[index];
		};
	}, this);
	
	var mergedNodes = _.merge(this.nodes, externNodes);
	if("when" in nodeGraph)
	{
		// TODO  Path ?
		// TODO param nodes = union(this.nodes, externNodes)
		var when = makeExpr(nodeGraph["when"], mergedNodes);
	};
	
	// TODO  connections ?
	// TODO param nodes = union(this.nodes, externNodes)
	var expr = makeExpr(nodeGraph["comp"], mergedNodes);
	this.outputList = [];
	this.get = function(path)
	{
		// var filteredArray = this.array.get();
		var arrays = _.map(this.arrays, function(array){return array.get()});
		
		function cartesianProductOf(arrays) {
				return _.reduce(arrays, function(a, b) {
					return _.flatten(_.map(a, function(x) {
						return _.map(b, function(y) {
							return x.concat([y]);
						});
					}), true);
				}, [ [] ]);
			};
			
		// Le produit cartesien des indices
		var indicesArray = cartesianProductOf(_.map(arrays, function(array)
		{
			return _.range(array.length);
		}));
		if(when != undefined)
		{
			// filteredArray = filteredArray.filter(function(item,i){
				// if(index != undefined)
				// {
					// index.signal(i);
				// }
				// if(input != null)
				// {
					// input.signal(item);
				// } else
				// {
					// _(inputs).forEach(function(input, index)
						// {
							// input.signal(item[index]);
						// });
				// }
				// return when.get();
			// });
			
			this.outputList = [];
			_.each(indicesArray, function(indices)
			{
				var tuple = _.map(arrays, function(array, index){return array[indices[index]];});
			
				for(var arrayIndex = 0; arrayIndex < arrays.length; arrayIndex++)
				{
					if(comprehensionIndices[arrayIndex] != undefined)
					{
						comprehensionIndices[arrayIndex].set(indices[arrayIndex]);
					}
					if(inputs[arrayIndex] != undefined)
					{
						inputs[arrayIndex].set(tuple[arrayIndex]);
					} else
					{
						_(destructInputs[arrayIndex]).forEach(function(input, tupleIndex)
							{
								input.set(tuple[arrayIndex][tupleIndex]);
							});
					}
				}
				
				if(when.get())
				{
					this.outputList.push(expr.get());
				}
			}, this);
		}
		else
		{
			this.outputList = indicesArray.map(function(indices, i) 
			{
			// if(index != undefined)
			// {
				// index.signal(i);
			// }
			// if(input != null)
			// {
				// input.signal(item);
			// } else
			// {
				// _(inputs).forEach(function(input, index)
					// {
						// input.signal(item[index]);
					// });
			// }
			
			
				var tuple = _.map(arrays, function(array, index){return array[indices[index]];});
			
				for(var arrayIndex = 0; arrayIndex < arrays.length; arrayIndex++)
				{
					if(comprehensionIndices[arrayIndex] != undefined)
					{
						comprehensionIndices[arrayIndex].set(indices[arrayIndex]);
					}
					if(inputs[arrayIndex] != undefined)
					{
						inputs[arrayIndex].set(tuple[arrayIndex]);
					} else
					{
						_(destructInputs[arrayIndex]).forEach(function(input, tupleIndex)
							{
								input.set(tuple[arrayIndex][tupleIndex]);
							});
					}
				}
				return expr.get();
			});
		}
		return this.outputList;
	};
	
	// TODO ameliorer
	this.update = function(v)
	{
		var filteredArray = this.array.get();
		if(when != undefined)
		{
			filteredArray = filteredArray.filter(function(item,i){
				if(index != undefined)
				{
					index.signal(i);
				}
				input.signal(item);
				return when.get();
			});
		};
		if(filteredArray.length == this.outputList.length)
		{
			for(var i = 0; i < this.outputList.length; i++)
			{
				if(index != undefined)
				{
					index.signal(i);
				}
				input.signal(filteredArray[i]);
				this.outputList[i] = expr.val.update(this.outputList[i]);
			}			
		} else
		{
			this.outputList = filteredArray.map(function(item, i) {
				if(index != undefined)
				{
					index.signal(i);
				}
				input.signal(item);
				return expr.val.get();
			});
		}
		return this.outputList;
	};
	
	this.getType = function(path)
	{
		return makeTemplate("list", [expr.getType()]);
	}
	
	this.addSink = function(sink)
	{
		_.each(this.arrays, function(array){array.addSink(this);});
	};
}

function getNode(name, nodes)
{
	var node = nodes[name];
	if(node == undefined)
	{
		throw "Node " + name + " not found!";
	}
	return node;
}

function getFieldType(fields, path)
{
	var head = path[0];
	// Les champs sont des tableaux [nom, type]
	// On recupere le type de celui dont le nom correspond
	var fieldType = _(fields)
		.filter(function(field){return (field[0] == head);})
		.value()[0][1];
	
	if(path.length == 1)
		return fieldType;
		
	return getFieldType(library.nodes[fieldType].fields, _.tail(path));
}

function StructAccess(node, path) {
    this.node = node;
    this.path = path;
	var nodeType = node.getType();
	var baseType = getBaseType(nodeType);
	var templates = getTemplates(nodeType);
	check(baseType in library.nodes, "Node type " + baseType + " not found in library");
	var typeObj = (templates.length > 0) ? 
		library.nodes[baseType].getInstance(templates) :
		library.nodes[baseType];
	var operators = typeObj.operators;
	this.getPathOperator = operators.getPath;
	this.setPathOperator = operators.setPath;
	
	var fields = typeObj.fields;
	this.type = getFieldType(fields, path);

	this.get = function()
	{
		var val = this.node.get();
		// TODO ameliorer ... par ex stocker les operator dans la valeur (== methode virtuelle)
		// Dispatch dynamique, si le node est un store, la valeur peut etre d'un type herite, 
		// et meme changer au cours du temps
		if(_.isObject(val) && "__type" in val)
		//if(true)
		{
			var operators = library.nodes[val.__type].operators;
			this.getPathOperator = operators.getPath;
		}
		return this.getPathOperator(val, this.path);
	};
	
	this.set = function(val)
	{
		var struct = this.node.get();
		// TODO ameliorer ... par ex stocker les operator dans la valeur (== methode virtuelle)
		// Dispatch dynamique, si le node est un store, la valeur peut etre d'un type herite, 
		// et meme changer au cours du temps
		if(_.isObject(val) && "__type" in val)
		//if(true)
		{
			var operators = library.nodes[val.__type].operators;
			this.setPathOperator = operators.setPath;
		}
		this.setPathOperator(struct, this.path, val);
	};
	
	this.getType = function()
	{
		return this.type;
	}
	
	this.addSink = function(sink)
	{
		this.node.addSink(sink);
	};
}

function Destruct(t)
{
	var tuple = t;
	this.set = function(val)
	{
		_.each(val, function(subVal, index){tuple[index].set(subVal);})
	}
}

function compileRef(ref, nodes, promiseAllowed)
{
	if(_.isPlainObject(ref) && "destruct" in ref)
	{
		var tupleGraph = ref.destruct;
		var tuple = _.map(tupleGraph, function(path){return compileRef(path, nodes, promiseAllowed).val;});
		var templates = _.map(tuple, function(node){return node.getType();})
		return {val : new Destruct(tuple), type : makeTemplate("tuple", templates)};
	}
	else
	{
		promiseAllowed = promiseAllowed != undefined ? promiseAllowed : false;
		var split = ref;
		// Representation compacte, ne marche pas avec les acces listes et assoc
		if(isString(ref))
		{
			var split = ref.split(".");
		}
		var sourceNode = split[0];
		
		// Si c'est une fonction
		// TODO : mettre a part les fonctions des autres types de nodes
		if(sourceNode in library.functions)
		{
			// TODO cache
			var func = library.functions[sourceNode];
			if("getTemplates" in func)
			{
				return {val : new StoreFunctionTemplate(library.functions[sourceNode], null), type : null};
			}
			// TODO type
			function makeFunctionType(func)
			{
				return {
					inputs : _.map(func.params, function(param){return param[1];}),
					output : func.type
				};
			}
			var func = library.functions[sourceNode];
			return {val : new Store(func, makeFunctionType(func)), type : null};
		}
		
		if(promiseAllowed && !(sourceNode in nodes))
		{
			return {val : {__promise : ref}};
		}
		var node = getNode(sourceNode, nodes);
		var path = split.slice(1);
		var compiledPath = path.map(function(p) {
			// Si ce n'est pas une chaine, ce n'est pas un champ de struct, c'est donc un index de tableau
			if(!isString(p))
				return makeExpr(p.index, nodes).val;
			return p;
		});
		// TODO ?
		var type = node.getType(path);
		//var type = undefined;
		if(split.length > 1)
		{
			return {val : new StructAccess(getNode(sourceNode, nodes), compiledPath), type : type};
		} else
		{
			return {val : node, type : type};
		}
	}
}

function Cloner(ref)
{
	this.ref = ref;
	var type = ref.getType();
	if(type in library.nodes && "operators" in library.nodes[type])
		this.cloneOperator = library.nodes[type].operators.clone;

	this.get = function()
	{
		// TODO : optimiser
		if(this.cloneOperator != undefined)
			return this.cloneOperator(this.ref.get());
		// TODO listes, autres ...
		return this.ref.get();
		//return _.cloneDeep(this.ref.get());
	}
}
function makeExprAndType(expr, nodes, cloneIfRef)
{
	if(isRef(expr))
	{
		var ref = expr;
		
		var compiledRef = compileRef(ref, nodes);
		// Utilise par les actions d'affectations, pour copier la valeur et non la reference
		if(cloneIfRef != undefined && cloneIfRef)
			return {val : new Cloner(compiledRef.val), type : compiledRef.type};
		return compiledRef;
	} else if (isNumber(expr) || isBool(expr))
	{
		var type = isNumber(expr) ? "float" : "bool"
		return {val : new Store(expr, type), type : type};
		// return expr;
	} else if("array" in expr)
	{
		var l = expr.array.map(
			function(element, index)
			{
				// FIXME : type ?
				return makeExpr(element, nodes);
			}
		);
		var templateType = undefined;
		if(expr.array.length > 0)
			templateType = makeExprAndType(expr.array[0], nodes).type;
		return {val : new List(l, templateType), type : {base : "list", templates : [templateType]}};
	} else  if("string" in expr)
	{
		return {val : new Store(expr.string, "string"), type : "string"};
	} else if("type" in expr)
	{
		if(expr.type == undefined)
		{
			throw "Type undefined in makeNode";
		}
		var type = getBaseType(expr.type);
		
		var node;
		var paramsGraph = expr.params;
		var fieldsGraph = expr.fields;
		if(!(type in library.nodes))
		{
			error("Function " + type + " not found in nodes library");
		}
		var nodeSpec = library.nodes[type];
		var fields = {};
		if(fieldsGraph != undefined)
		{
			fields = compileFields(fieldsGraph, path, type, nodes, false);
		}

		// TODO simplifier
		if(("getTemplates" in nodeSpec))
		{
			var instance;
			if(paramsGraph != undefined)
			{
				var paramsValAndType = _.map(paramsGraph, function(paramGraph)
				{
					return makeExprAndType(paramGraph, nodes);
				});
				var vals = _.map(paramsValAndType, "val");
				//var templates = _.map(paramsValAndType, function(valAndType) {return valAndType.val.getType();});
				// TODO : faire check entre type explicite et deduit
				var templates = nodeSpec.getTemplates(vals);
				
				instance = nodeSpec.getInstance(templates);
				var paramsSpec = _.map(instance["fields"], function(nameAndType){return nameAndType[0];});
				fields = _.zipObject(paramsSpec, vals);
			}
			else
			{
				instance = nodeSpec.getInstance(getTemplates(expr.type));
			}
			
			// TODO template explicite
			node = new instance.builder(fields, getTemplates(expr.type));
		}
		else
		{
			if(paramsGraph != undefined)
			{
				for(var paramIndex = 0; paramIndex < paramsGraph.length; paramIndex++)
				{
					var paramSpec = nodeSpec["fields"][paramIndex];
					fields[paramSpec[0]] = makeExpr(paramsGraph[paramIndex], nodes);
				}
			}
			node = new library.nodes[type].builder(fields, getTemplates(expr.type));
		}
		// TODO type ?
		// return {val : node, type : node.getType()};
		return {val : node, type : expr.type};
	} else if("merge" in expr)
	{
		function Affectation(val, paths, setPath)
		{
			this.val = val;
			this.paths = paths;
			this.setPath = setPath;
			this.affect = function(newObj)
			{
				var val = this.val.get();
				for(var j = 0; j < this.paths.length; j++)
				{
					var path = this.paths[j];
					this.setPath(newObj, path, val);
				}
			}
		}
		function CondAffectation(cond, thenAffects, elseAffects) {
			this.cond = cond;
			this.thenAffects = thenAffects;
			this.elseAffects = elseAffects;
			this.affect = function(newObj)
			{
				if(this.cond.get())
				{
					_.forEach(this.thenAffects, function(affect){affect.affect(newObj);});
				}
				else if(this.elseAffects != undefined)
				{
					_.forEach(this.elseAffects, function(affect){affect.affect(newObj);});
				}
			};
		}
		function Merge(what, withListGraph)
		{
			this.what = compileRef(what, nodes).val;
			var whatType = this.what.getType();
			var setPath = library.nodes[whatType].operators.setPath;
			function makeAffectations(withListGraph)
			{
				return withListGraph.map(function(mergeExp){
					
					if("cond" in mergeExp)
					{
						var cond = makeExpr(mergeExp.cond, nodes);
						var affects = makeAffectations(mergeExp.affectations);
						var elseAffects = undefined;
						if("else" in mergeExp)
						{
							var elseAffects = makeAffectations(mergeExp["else"]);
						}
						return new CondAffectation(cond, affects, elseAffects);
					}
					
					return new Affectation(makeExpr(mergeExp.val, nodes), mergeExp.paths, setPath);
				});
			}
			this.withList = makeAffectations(withListGraph);
			
						
			this.get = function()
			{
				//var obj = this.what.get();
				// TODO methode clone sur les struct ?
				var newObj = _.cloneDeep(this.what.get());
				for(var i = 0; i < this.withList.length; i++)
				{
					_.forEach(this.withList, function(affect){affect.affect(newObj);});
					// var mergeWith = this.withList[i];
					// if("cond" in mergeWith && !mergeWith.cond.get())
					// {
						// if("else" in mergeWith)
						// {
						// continue;
					// }
					// var val = mergeWith.val.get();
					// // var val = mergeWith.val;
					// for(var j = 0; j < mergeWith.paths.length; j++)
					// {
						// var path = mergeWith.paths[j];
						// this.setPath(newObj, path, val);
					// }
				}
				return newObj;
			}
			
			this.update = function(obj)
			{
				// TODO ameliorer
				return this.get();
			}
			
			this.getType = function()
			{
				return whatType;
			}
		}

		// TODO type avec template
		return {val : new Merge(expr.merge, expr["with"]), type : "merge"};
	} else if("let" in expr)
	{
		var what = expr.let;
		var mergedNodes = _.clone(nodes);
		_.forEach(what, function(node)
		{
			// TODO : utiliser "var" plutot ?
			mergedNodes[node.def] = makeNode(node, mergedNodes);
		});
		return {val : makeExpr(expr["in"], mergedNodes), type : "let"};
	} else if("match" in expr)
	{
		function Match(what, cases, elseCase)
		{
			this.what = makeExpr(what, nodes);
			this.cases = cases.map(function(caseGraph){
				return {
					vals : _.map(caseGraph.vals, function(val){
						return makeExpr(val, nodes)}),
					out : makeExpr(caseGraph.out, nodes)
				};
			});
			this.elseCase = makeExpr(elseCase, nodes);
			this.type = this.elseCase.getType();
						
			this.get = function()
			{
				var val = this.what.get();
				for(var i = 0; i < this.cases.length; i++)
				{
					var matchWith = this.cases[i];
					for(var j = 0; j < matchWith.vals.length; j++)
					{
						if(matchWith.vals[j].get() == val)
						{
							return matchWith.out.get();
						}
					}
				}
				return this.elseCase.get();
			}
			
			this.getType = function()
			{
				return this.type;
			}
		}

		// TODO type avec template
		return {val : new Match(expr.match, expr["cases"], expr["else"	]), type : "match"};
	} else if("matchType" in expr)
	{
		function MatchType(what, withList)
		{
			this.what = getNode(what, nodes);
			this.withList = withList.map(function(matchExp){
				return {
					val : makeExpr(matchExp.val, nodes),
					type : matchExp.type
				};
			});
			var whatType = this.what.getType();
						
			this.get = function()
			{
				var val = this.what.get();
				var type = val.__type;
				for(var i = 0; i < this.withList.length; i++)
				{
					var matchWith = this.withList[i];
					if(type == matchWith.type)
					{
						return matchWith.val.get();
					}
				}
				// TODO Error				
			}
			
			this.getType = function()
			{
				return whatType;
			}
		}

		// TODO type avec template
		return {val : new MatchType(expr.matchType, expr["with"]), type : "match"};
	} else if("comp" in expr)
	{
		var node = new Comprehension(expr, nodes);
		return {val : node, type : "comprehension"};
	}
}

function makeExpr(expr, nodes, cloneIfRef)
{
	return makeExprAndType(expr, nodes, cloneIfRef).val;
}

function makeNode(nodeGraph, nodes, connectionsGraph)
{
	if("comp" in nodeGraph)
	{
		var node = new Comprehension(nodeGraph, nodes);
		if("var" in nodeGraph)
		{
			node = new Store(node.get(), node.getType());
		}
		return node;
	} else
	{
		if("val" in nodeGraph)
		{
			var node = makeExpr(nodeGraph.val, nodes);
		}
		else
		{
			var node = makeExpr(nodeGraph, nodes);
		}
		
		if("var" in nodeGraph)
		{
			// TODO : virer les dependances du node
			node = new Store(node.get(), node.getType());
		}
		
		if("slots" in nodeGraph)
		{
			connectionsGraph.push({
				source : node,
				slots : nodeGraph.slots
			});
		}

		return node;
	}
}

function IfElseParam(param, thenSlot, elseSlot) {
	this.thenSlot = thenSlot;
    this.elseSlot = elseSlot;
	this.param = param;
    this.signal = function(val)
    {
		if(this.param.get())
		{
			this.thenSlot.signal();
		}
		else if(this.elseSlot != undefined)
		{
			this.elseSlot.signal();
		}
    };
}

function IfElse(thenSlot, elseSlot) {
    this.thenSlot = thenSlot;
    this.elseSlot = elseSlot;
	this.signal = function(val)
    {
		if(val)
		{
			this.thenSlot.signal();
		}
		else if(this.elseSlot != undefined)
		{
			this.elseSlot.signal();
		}
    };
}

function WhileParam(param, slot) {
    this.param = param;
    this.slot = slot;
	this.signal = function(val)
    {
		while(this.param.get())
		{
			this.slot.signal();
		}
    };
}

function compileSlot(slot, nodes, connections)
{
	if(isString(slot))
	{
		if(slot[0] == "*")
		{
			return new Deref(compileRef(slot.slice(1), nodes).val);
		} else
		{
			return compileRef(slot, nodes, true).val;
		}
	} else if(isArray(slot) || "destruct" in slot)
	{
		return compileRef(slot, nodes, true).val;
	} else
	{
		return makeAction(slot, nodes, connections);
	}
}

function compileSlots(slots, nodes, connections)
{
	return slots.map(function(slot){return compileSlot(slot, nodes, connections)});
}

var msgIndex = 0;

function makeAction(actionGraph, nodes, connections)
{
	if("foreach" in actionGraph)
	{
		function ForEach(list, signal, params)
		{
			this.list = list;
			this.iteratedSignal = signal;
			this.params = params;
			
			this.signal = function()
			{
				this.list.signalStored(this.iteratedSignal, this.params);
			}
		}
		var iterated = compileRef(actionGraph["foreach"], nodes).val;
		checkList(iterated.getType());
		var paramsGraph = actionGraph.params;
		var compiledParams = _.map(paramsGraph, function(param){return makeExpr(param, nodes);});
		// TODO check signal and params valid with list element type
		return new ForEach(iterated, actionGraph.signal, compiledParams);
	}
	
	function ListElementRef(listNode)
	{
		this.listNode = listNode;
		this.type = getListTemplate(listNode.getType());
		this.list = null;
		this.index = 0;
		
		this.get = function()
		{
			return this.list[this.index];
		}
		
		this.set = function(val)
		{
			this.list[this.index] = val;
			this.listNode.addDelta({path : [], val : new ListDelta([0], 0, [[this.index, val]])});
		}		
		
		this.addDelta = function(delta)
		{
			this.listNode.addDelta({path : [this.index].concat(delta.path), val : delta.val});
		}	
		
		this.getType = function()
		{
			return this.type;
		}
		
		this.addSink = function(sink)
		{
			// TODO : y'en a besoin ?
		};

	}
	
	function ListDelta(add, remove, updates)
	{
		this.add = add;
		this.remove = remove;
		this.updates = updates;
	}

	if("on" in actionGraph)
	{
		function ForAction(iterated, itRef, indexStore, action)
		{
			this.listStore = iterated;
			this.itRef = itRef;
			this.indexStore = indexStore;
			this.action = action;
			
			this.signal = function()
			{
				var list = this.listStore.get();
				this.itRef.list = list;
				_.each(
					list, 
					function(element, index)
					{
						this.itRef.index = index;
						if(this.indexStore != undefined)
							this.indexStore.set(index);
						this.action.signal();						
					},
					this
				);
			}
		}
		
		var iterated = compileRef(actionGraph["in"], nodes).val;
		var localNodes = _.clone(nodes);
		
		var itRef = new ListElementRef(iterated);
		// TODO gerer destruct
		localNodes[actionGraph["on"]] = itRef;
		var indexStore = null;
		if("index" in actionGraph)
		{
			indexStore = new Store(null, "int")
			localNodes[actionGraph["index"]] = indexStore;
		}
		// TODO : check that action only change iterator
		var action = makeAction
		(
			actionGraph["apply"],
			localNodes
		);

		return new ForAction(iterated, itRef, indexStore, action);
	}
	
	if("update" in actionGraph)
	{
		function Update(iterated, itRef, indexStore, action)
		{
			this.listStore = iterated;
			this.itRef = itRef;
			this.indexStore = indexStore;
			this.action = action;
			
			this.signal = function()
			{
				var list = this.listStore.get();
				this.itRef.list = list;
				_.each(
					list, 
					function(element, index)
					{
						this.itRef.index = index;
						if(this.indexStore != undefined)
							this.indexStore.set(index);
						this.action.signal();						
					},
					this
				);
			}
		}
		
		function CondUpdate(iterated, itRef, indexStore, action, cond)
		{
			this.listStore = iterated;
			this.itRef = itRef;
			this.indexStore = indexStore;
			this.action = action;
			this.cond = cond;
			
			this.signal = function()
			{
				
				var updated = [];
				var list = this.listStore.get();
				this.itRef.list = list;
				var removed = false;
				_.each(
					list, 
					function(element, index)
					{
						this.itRef.index = index;
						if(this.indexStore != undefined)
							this.indexStore.signal(index);
						if(this.cond.get())
						{
							this.action.signal();
							var newVal = this.itRef.get();
							updated.push(newVal);
						}
						else
						{
							removed = true;
						}
					},
					this
				);
				// TODO : signals
				this.listStore.set(updated);
			}
		}
		var iterated = compileRef(actionGraph["in"], nodes).val;
		var localNodes = _.clone(nodes);
		
		var itRef = new ListElementRef(iterated);
		// TODO gerer destruct
		localNodes[actionGraph["update"]] = itRef;
		var indexStore = null;
		if("index" in actionGraph)
		{
			indexStore = new Store(null, "int")
			localNodes[actionGraph["index"]] = indexStore;
		}

		var val = actionGraph["with"];
		if("with" in actionGraph)
		{
			var action = makeAction
			(
				{
					type : "Send",
					param : actionGraph["with"],
					slots : [actionGraph["update"]]
				},
				localNodes
			);
		}
		else // Conditionnal affectation
		{
			var condVal = actionGraph["condWith"];
			var action = makeAction
			(
				{
					"if" : condVal["if"],
					"then" : 
					{
						type : "Send",
						param : condVal.val,
						slots : [actionGraph["update"]]
					}
				},
				localNodes
			);
		}
		
		var filter = null;
		if("filter" in actionGraph)
		{
			filter = makeExpr(actionGraph.filter, localNodes);
			return new CondUpdate(iterated, itRef, indexStore, action, filter);
		}

		return new Update(iterated, itRef, indexStore, action);
	}
	
	if("signal" in actionGraph)
	{
		function Signal(node, signal, params)
		{
			this.node = node;
			this.signalStored = signal;
			this.params = params;
			
			this.signal = function()
			{
				// TODO ameliorer params.params
				this.node.signalStored(this.signalStored, this.params);
			}
		}
		var paramsGraph = actionGraph.params;
		var compiledParams = _.map(paramsGraph, function(param){return makeExpr(param, nodes);});
		return new Signal(compileRef(actionGraph["var"], nodes).val, actionGraph.signal, compiledParams)
	}
	
	function concatActions(beginActions, actionGraph)
	{
		if(actionGraph.type == "Seq")
		{
			actionGraph.slots = beginActions.concat(actionGraph.slots);
		} else
		{
			actionGraph = {
				"type" : "Seq",
				"slots" : beginActions.concat([actionGraph])
			};
		}
		return actionGraph;
	}
	
	// TODO action avec parametres
	if("params" in actionGraph)
	{
		//TODO manage multiple params
		var param = actionGraph.params[0];
		var paramId = param[0];
		nodes[paramId] = new ActionParam(param[1]);
		actionGraph = concatActions([paramId], actionGraph);
	}
	
	// Les generateurs (les <-) sont transformes en Store, 
	// qui sont alimentes au debut de l'actionGraph
	var msgProducers = [];
	var msg = false;
	function makeGenerators(val)
	{
		if(_.isObject(val) && ("msg" in val))
		{
			msg = true;
			
			var producerGraph = _.cloneDeep(val);
			producerGraph.type = producerGraph.msg;
			var msgProducer = makeNode(producerGraph, nodes, {});
			var msgStore = new Store(null, msgProducer.getType());
			msgProducer.slots = [msgStore];
			var producerName = "__msgProducer" + msgIndex;
			nodes[producerName] = msgProducer;
			msgProducers.push(producerName);

			var storeName = "__msgStore" + msgIndex;
			if("def" in val)
				storeName = val.def;
			nodes[storeName] = msgStore;
			
			msgIndex++;
			
			return [storeName];
		}
		//return val;
		if(_.isArray(val))
		{
			return _.map(val, makeGenerators);
		}
		// En cas de while, les valeurs sont regenerees a chaque iteration
		if(_.isObject(val) && !("while" in val))
		{
			return _.extend({}, val, function(oldProp, prop){
				return _.cloneDeep(prop, makeGenerators);
			});
		}
		return val;
	}
		
	actionGraph = makeGenerators(actionGraph);
	

	// S'il y a des generateurs, on insere leur activation au debut
	if(msg)
	{
		actionGraph = concatActions(msgProducers, actionGraph);
	}
	
	function getSlotsFromGraph(actionGraph)
	{
		if(_.isObject(actionGraph))
		{
			if("slots" in actionGraph)
			{
				return actionGraph.slots;
			}
			else if("slot" in actionGraph)
			{
				return [actionGraph.slot];
			}
		}
		return [];
	}
	
	// TODO gere action avec juste un local (sert a  rien mais bon ...)
	// genre a : loc b=c
	function makeLocals(actionGraph, nodes)
	{
		var slots = getSlotsFromGraph(actionGraph);
		var mergedNodes = nodes;
		_.forEach(slots, function(slot){
			if(_.isObject(slot) && "loc" in slot)
			{
				var subSlot = slot.slots[0];
				var type = makeExprAndType(slot.param, mergedNodes).val.getType();
				if(_.isObject(subSlot) && "destruct" in subSlot)
				{
					var templates = getTemplates(type);
					var newLoc = {};
					var destruct = subSlot.destruct;
					_.each(destruct, function(name, i){
						var loc = new Store(null, templates[i]);
						newLoc[name] = loc;
					});
					mergedNodes = _.merge(mergedNodes, newLoc);
				}
				else
				{
					var locName = subSlot[0];
					var loc = new Store(null, type);
					var newLoc = {};
					newLoc[locName] = loc;
					mergedNodes = _.merge(mergedNodes, newLoc);
				}
			} else
			{
				mergedNodes = _.merge(mergedNodes, makeLocals(slot, mergedNodes));
			}
		});
		return mergedNodes;
	}
	var localNodes = makeLocals(actionGraph, nodes);
	
	var type;
	var paramGraph;
	if("if" in actionGraph)
	{
		type = "if";
		paramGraph = actionGraph["if"];
	} else if("while" in actionGraph)
	{
		type = "while";
		paramGraph = actionGraph["while"];
	}
	else
	{
		type = getBaseType(actionGraph.type);
		paramGraph = actionGraph.param;
	}
	
	var param = null;
	if(paramGraph != undefined)
	{
		// FIXME : type
		// Si l'action est une affectation et que le parametre est une reference, il devra etre clone
		param = makeExpr(paramGraph, localNodes, type == "Send");
	}
	
	if(type == "if")
	{
		// TODO connections
		var thenSlot = compileSlot(actionGraph["then"], localNodes, connections);
		var elseSlot = null;
		if("else" in actionGraph)
		{
			elseSlot = compileSlot(actionGraph["else"], localNodes, connections);
		}
		
		if(param != null)
		{
			return new IfElseParam(param, thenSlot, elseSlot);
		}
		else
		{
			return new IfElse(thenSlot, elseSlot);
		}
	} else if(type == "while")
	{
		// TODO connections
		var slot = compileSlot(actionGraph["do"], localNodes, connections);
		
		if(param != null)
		{
			return new WhileParam(param, slot);
		}
		else
		{
			return new While(slot);
		}
	} else
	{
		var slots = null;
		if("slots" in actionGraph)
		{
			slots = compileSlots(actionGraph.slots, localNodes, connections);
		} else
		{
			// Envoi d'un signal a un node
			if(actionGraph.type in localNodes)
			{
				if(param != null)
				{
					slots = compileSlots([actionGraph.type], localNodes, connections);	
					type = "Send";
				} else
				{
					return compileRef(type, localNodes).val;
				}
			}
		}

		var node = new library.actions[type](slots, param);

		return node;
	}
}

function makeStruct(structGraph, name, inheritedFields)
{
	var fieldsGraph = inheritedFields.concat(structGraph.fields);
	
	var fieldsOperators = {}
	for(var i = 0; i < fieldsGraph.length; i++)
	{
		var fieldType = fieldsGraph[i][1];
		if(fieldType in library.nodes && "operators" in library.nodes[fieldType])
		{
			var fieldName = fieldsGraph[i][0];
			fieldsOperators[fieldName] = library.nodes[fieldType].operators;
		}		
	}
	
	function makeBuilder(structGraph)
	{
		function builder(fields) 
		{	
			this.fields = {
				__type : name
			};
			for(var i = 0; i < fieldsGraph.length; i++)
			{
				var field = fieldsGraph[i];
				if(_.isArray(field))
				{
					var fieldName = field[0];
					if(fieldName in fieldsOperators)
					{
						// Si c'est une structure utilisateur, on recupere directement la valeur
						// this.fields[fieldName] = fields[fieldName].get();
						// ou pas ...
						this.fields[fieldName] = fields[fieldName];
					}
					else 
					{
						// Sinon c'est le champs lui meme
						this.fields[fieldName] = fields[fieldName];
					}
				}
			};
			this.get = function()
			{
				return _.mapValues(this.fields, function(field){
					// TODO : ameliorer
					return isString(field) ? field :  field.get();
				});
				//return this.fields;
			};	
			this.getType = function()
			{
				return name;
			};
			this.addSink = function(sink)
			{
				_.each(this.fields, function(field, key){if(key != "__type")field.addSink(sink);});				
			};
		}

		return builder;
	}
	
	var node = {
		fields : fieldsGraph,
		builder : makeBuilder(structGraph),
		operators : {
			getPath : function(struct, path)
			{
				if(path.length == 1)
				{
					// return struct[path[0]].get();
					return struct[path[0]];
				}
				else
				{
					var subPath = path.slice(0);
					var key = subPath.shift();
					return fieldsOperators[key].getPath(struct[key], subPath);
				}
			},
			setPath : function(struct, path, val)
			{
				if(path.length == 1)
				{
					struct[path[0]] = val;
				}
				else
				{
					var subPath = path.slice(0);
					var key = subPath.shift();
					fieldsOperators[key].setPath(struct[key], subPath, val);
				}
			},
			slots : {},
			selfStore : new Store(null, name),
			signal : function(struct, id, params)
			{
				this.selfStore.set(struct);
				var slot = this.slots[id];
				_.each(params, function(param, i)
				{
					slot.inputs[i].set(param.get());
				});
				slot.action.signal(params);
			},
			clone : function(struct)
			{
				var obj = {}
				return _.merge({}, struct, function(field, key){
					if(key in fieldsOperators)
						return fieldsOperators[key].clone(field);
					return field;
				});
			}
		}
	}
	
	//node.operators.selfStore.signalOperator = node.operators
	library.nodes[name] = node;
	
	for(var i = 0; i < fieldsGraph.length; i++)
	{
		var field = fieldsGraph[i];
		if(!_.isArray(field))
		{
			var slotGraph = field;
			var localNodes = {"self" : node.operators.selfStore};
			var inputs = [];
			_.each(slotGraph.params, function(param)
			{
				var node = new Store(null, param[1]);
				localNodes[param[0]] = node;
				inputs.push(node);
			});
			slotGraph.params = [["self", structGraph.name]].concat(slotGraph.params);
			node.operators.slots[field.slot] = {
				action : makeAction(slotGraph.action, localNodes),
				inputs : inputs
			};
		}
	}
	
	
	
	var subs = structGraph.subs;
	if(subs)
	{
		for(var i = 0; i < subs.length; i++)
		{
			var subStructGraph = subs[i];
			makeStruct(subStructGraph, subStructGraph.name, fieldsGraph);
		}
	}
}

function Transmitter(slots) 
{
	this.slots = (typeof(slots)==='undefined') ? [] : slots;
    this.signal = function(p)
    {
		for(var i = 0; i < this.slots.length; i++)
		{
			this.slots[i].signal(p);
		}
    };
}

function Composite(classGraph)
{
	function builder(fields)
	{
		var nodesGraph = classGraph["nodes"];
		
		this.internalSlots = [];
		this.nodes = {};
		
		for(var key in fields)
		{
			var field = fields[key];
			this.nodes[key] = field;
		}
		
		_.forEach(nodesGraph, function(node){
			// TODO connections ?
			this.nodes[getId(node)] = makeNode(node, this.nodes, {});
		}, this);
		
		var connections = classGraph["connections"];
		
		this.internalSignal = new Transmitter();
		this.slots = this.internalSignal.slots;
		
		for(signal in connections)
		{
			var senderSlots = null;
			if(signal == "receive")
			{
				senderSlots = this.internalSlots;
			}
			else
			{
				senderSlots = this.nodes[signal].slots;
			}
			
			var slots = connections[signal];
			for(var i = 0; i < slots.length; i++)
			{
				var slot = slots[i];
				if(slot == "signal")
				{
					senderSlots.push(this.internalSignal);
				}
				else
				{
					if(isString(slot))
					{
						senderSlots.push(this.nodes[slot]);
					}
					else
					{
						senderSlots.push(this.nodes[slot[0]].fields(slot.slice(1)));
					}
				}
			}
		}
		
		this.signal = function(p)
		{
			for(var i = 0; i < this.internalSlots.length; i++)
			{
				this.internalSlots[i].signal(p);
			}
		};
		
		// var outputFunc = library.classes[classGraph["out"].val.type];
		// var funcSources = _.map(outputFunc["in"], function(value, index){
			// var param = classGraph["out"].val.params[index];
			// return this.nodes[param];
		// }, this);
		// this.func = new outputFunc.builder(funcSources, undefined);
		// TODO : connections
		this.expr = makeExpr(classGraph["out"].val, this.nodes);
		this.get = function(path)
		{
			return this.expr.get();
		};
		
		// TODO ameliorer
		this.update = function(v)
		{
			return this.expr.get();
		};
		
		this.getType = function()
		{
			return this.expr.getType();
		}
	}
	
	return {
		"fields" : classGraph["in"],
		"builder" : builder
	};
}

function templatesToKey(templates)
{
	return _.map(templates, function(template)
	{
		if(_.isString(template))
			return template;
		return template.base + templatesToKey(template.templates);		
	}).join("");
}

function FunctionInstance(classGraph)
{
	this.name = classGraph.id;
	this.params = classGraph["in"];
	this.expr = null;
	this.pushedValues = _.range(this.params.length).map(function()
	{
		return [];
	});
	this.func = function(params) 
	{	
		_.each(params, function(param, i)
		{
			this.pushedValues[i].push(this.inputNodes[i].get());
			this.inputNodes[i].set(param);
		}, this);
		
		var result = this.expr.get();
		
		_.each(params, function(param, i)
		{
			this.inputNodes[i].set(this.pushedValues[i].pop());
		}, this);
		
		return result;
	};
}

function getTemplateFromPath(params, path)
{
	if(!(_.isPlainObject(params) && ("templates" in params)))
	{
		throw "Type of param is not a template, cannot deduce template type"
	}
	if(path.length == 1)
		return params.templates[path[0]];
	var subPath = path.slice(0);
	var index = subPath.shift();	
	return getTemplateFromPath(params.templates[index], subPath);
}

function getParamsDeclTypes(paramsDecl)
{
	return _.map(paramsDecl, function(decl){return decl[1];});
}

function FunctionTemplate(classGraph)
{
	// Liste associant a chaque template les chemins dans les parametres qui l'utilisent
	// Sert pour deviner les templates a partir des types des parametres
	var templatesToParamsPaths = [];
	
	var templates = classGraph.templates;
	// Initialise as a list of empty list
	templatesToParamsPaths = _.map(Array(templates.length), function(){return [];});
	
	// For all parameters types, recursively add paths to leaf types (templates), with leaf types at the end
	// e.g. : [list<list<T>>, pair<F,G>, int] -> [[0, 0, 0, T], [1, 0, F], [1, 1, G], [2, int]]
	function getTypePaths(types, parentPath)
	{
		return _.reduce
		(
			types, 
			function(paths, type, index)
			{
				var templates = getTemplates(type);
				if(templates.length == 0)
					return paths.concat([parentPath.concat([index, type])]);
				return paths.concat(getTypePaths(templates, parentPath.concat([index])));
			},
			[]
		);
	}
	var paramsTypePaths = getTypePaths(getParamsDeclTypes(classGraph["in"]), []);
	
	// map template name -> index in templates array
	var templateNameToIndex = _.zipObject(templates, _.range(templates.length));
	// For each path, if leaf type is a template, adds the path to the templates param paths array
	_.each(paramsTypePaths, function(typePath)
	{
		var last = _.last(typePath);
		if(last in templateNameToIndex)
		{
			// The leaf type is a template, use the map to find the index, and adds the path without leaf type
			templatesToParamsPaths[templateNameToIndex[last]].push(_.first(typePath, typePath.length - 1));
		}
	});
	
	// TODO uniquement si il y a des templates dans la spec
	this.getTemplates = function(params)
	{
		// Guess templates types from params types
		var paramsTypes = _.map(params, function(param){return param.getType();});
		return _.map(templatesToParamsPaths, function(paths)
		{
			var templatesInPaths = _.map(paths, function(path)
			{
				if(path.length == 1)
					return paramsTypes[path[0]];
				var subPath = path.slice(0);
				var index = subPath.shift();
				try
				{
					return getTemplateFromPath(paramsTypes[index], subPath);
				}
				catch(err)
				{
					console.log(error)
					error("Type mismatch of param " + classGraph["in"][index][0] + " for function " + classGraph.id);
				}
			});
			var firstTemplate = templatesInPaths[0];
			_.each(templatesInPaths, function(template)
			{
				// If template type is used at different places of parameters types, the instances must be of the same type
				// e.g. if paramsTypes = [list<T>, pair<T, U>], we can have [list<int>, pair<int, float>] but not [list<int>, pair<float, int>]
				if(template != firstTemplate)
					throw "Template types not conform for different params : " + firstTemplate + " vs " + template;
			});
			return firstTemplate;
		});
	};
	
	this.cache = {};
	this.build = function(templates)
	{
		var key = templatesToKey(templates);
		if(key in this.cache)
			return this.cache[key];
		
		var instance = new FunctionInstance(classGraph);
		// instance.params = _.map(classGraph["in"], function(paramAndType){return paramAndType[1];});
		// instance.expr = null;
		// instance.func = function(params) 
		// {	
			// _.each(params, function(param, i)
			// {
				// instance.inputNodes[i].signal(param.get());
			// });
			
			// return instance.expr.get();
		// };
		var templateNameToInstances = _.zipObject(classGraph.templates, templates);	
		function instantiateTemplates(type, templateNameToInstances)
		{
			if(_.isPlainObject(type))
			{
				return makeTemplate(getBaseType(type), _.map(getTemplates(type), function(template){return instantiateTemplates(template, templateNameToInstances);}));
			}
			if(type in templateNameToInstances)
				return templateNameToInstances[type];
			return type;
		}
		if("type" in classGraph && classGraph.type != null)
		{
			instance.type = instantiateTemplates(classGraph.type, templateNameToInstances);			
		}
		this.cache[key] = instance;
		
		instance.internalNodes = {};
		instance.inputNodes = [];
		
		
		_.each(classGraph["in"], function(paramAndType)
		{
			// Replace template declarations by their instances:
			var type = instantiateTemplates(paramAndType[1], templateNameToInstances);
			var node = new Store(null, type);
			instance.inputNodes.push(node);
			instance.internalNodes[paramAndType[0]] = node;
		});
		
		var nodesGraph = classGraph["nodes"];
		_.each(nodesGraph, function(node)
		{
			// TODO connections ?
			instance.internalNodes[getId(node)] = makeNode(node, instance.internalNodes, {});
		});
		
		instance.expr = makeExpr(classGraph["out"].val, instance.internalNodes);
		if("type" in instance)
		{
			// Juste check
			var deducedType = instance.expr.getType();
		}
		else
		{
			instance.type = instance.expr.getType();
		}
		
		return instance;
	}
}

function Event(condition, action)
{
	this.condition = condition;
	this.action = action;
	this.triggered = false;
	
	this.signal = function()
	{
		if(this.triggered)
		{
			this.triggered = this.condition.get();
		} else if(this.condition.get())
		{
			this.triggered = true;
			this.action.signal();
		}
	}
}
function makeEvent(event, nodes, connections)
{
	var condition = makeExpr(event["when"], nodes);
	var action = makeAction(event["do"], nodes, connections);
	return new Event(condition, action);
}

function compileGraph(graph, lib, previousNodes) 
{
	// globals init
	var nodes = previousNodes != undefined ? previousNodes : {};
	msgIndex = 0;
	library = lib;
	
	//return;
	
	if("structsAndFuncs" in graph)
	{
		var structsAndfuncsGraph = graph.structsAndFuncs;
		for(var i = 0; i < structsAndfuncsGraph.length; i++)
		{
			if("func" in structsAndfuncsGraph[i])
			{
				var funcGraph = structsAndfuncsGraph[i].func;
				if("templates" in funcGraph)
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
					}
					else
					{
						// Else create a new function instance object
						var func = new FunctionInstance(funcGraph);
						library.functions[funcGraph.id] = func;
						library.nodes[funcGraph.id] = funcToNodeSpec(func);

						if("type" in funcGraph && funcGraph.type != null)
						{
							func.type = funcGraph.type;
						}
										
						func.internalNodes = {};
						func.inputNodes = [];
						
						_.each(funcGraph["in"], function(paramAndType)
						{
							var type = paramAndType[1];
							var node = new Store(null, type);
							func.inputNodes.push(node);
							func.internalNodes[paramAndType[0]] = node;
						});
						
					}
					
					var nodesGraph = funcGraph["nodes"];
					_.each(nodesGraph, function(node)
					{
						// TODO connections ?
						func.internalNodes[getId(node)] = makeNode(node, func.internalNodes, {});
					});
					
					// If it is not a predeclaration
					if("val" in funcGraph["out"])
					{
						func.expr = makeExpr(funcGraph["out"].val, func.internalNodes);
						if("type" in func)
						{
							// Juste check
							var deducedType = func.expr.getType();
						}
						else
						{
							func.type = func.expr.getType();
						}
					}
				}
			}
			else
			{
				var structGraph = structsAndfuncsGraph[i].struct;
				makeStruct(structGraph, structGraph.name, []);
			}
		}
	}
	
	var structGraphs = graph.structs;
	if(structGraphs != undefined)
	{
		
	}
	
	
	
	// Ajout des dependences d'un noeud
	function makeAddDependencies(n)
	{
		// Le noeud que l'on ajoutera a toutes ses dependences
		// dependencies are in the format {source : [sinks]}, each entry is a node name with all nodes that depend on it
		var node = n;
		function addDependencies(dependencies, val, key, collection)
		{
			if(_.isArray(val))
			{
				// Si la valeur est un tableau, il faut eliminer tous les cas ou ce n'est pas une reference 
				// TODO a mettre a jour en cas d'ajout d'objets contenant un tableau
				if(
					!("array" in collection) 
					&& !("params" in collection) 
					&& !("slots" in collection)
					&& val[0] in dependencies 
				)
				{
					// Le noeud ne doit etre qu'une fois dans la liste des dependences
					if(!_.contains(dependencies[val[0]], node))
						dependencies[val[0]].push(node);
					return dependencies;
				} else
				{
					// Si ce n'est pas une reference, descente recursive
					return _.reduce(val, addDependencies, dependencies)
				}
			} else if(_.isObject(val))
			{
				// Descente recursive
				return _.reduce(val, addDependencies, dependencies)
			} 
			return dependencies;
		}
		
		return addDependencies;
	}
	
	var graphNodes = graph.nodes;
    var connectionsGraph = graph.connections;
    var eventsDependencies = {};
    for(var i = 0; i < graphNodes.length; i++)
	{
		var nodeRow = graphNodes[i];
		for(var j = 0; j < nodeRow.length; j++)
		{
			var nodeGraph = nodeRow[j];
			var id = getId(nodeGraph)
			nodes[id] = makeNode(nodeGraph, nodes, connectionsGraph);
			eventsDependencies[id] = [];
			_.reduce(nodeGraph, makeAddDependencies(nodes[id]), eventsDependencies);
		}
    }
	
	var actionsGraph = graph.actions;
	var actions = [];
    for(var i = 0; i < actionsGraph.length; i++)
	{
		var actionGraph = actionsGraph[i];
		var action = makeAction(actionGraph, nodes, connectionsGraph);
		nodes[getId(actionGraph)] = action;
		actions.push(action);
    }
	
	var eventsGraph = graph.events;
	nodes.__events = [];
	for(var i = 0; i < eventsGraph.length; i++)
	{
		var eventGraph = eventsGraph[i];
		var event = makeEvent(eventGraph, nodes, connectionsGraph);
		nodes.__events.push(event);
		
		_.reduce(eventGraph.when, makeAddDependencies(event), eventsDependencies);
    }
	
	var connections = {};
	for(var i = 0; i < connectionsGraph.length; i++)
	{
		var connection = connectionsGraph[i];
		var slots = connection.slots.map(function(slot){
			return getNode(slot, nodes)
		});
		
		connection.source.slots = slots; 
    }
	
	function getNodeName(node)
	{
		for(var key in nodes)
		{
			if(nodes[key] == node)
				return key;
		}
	}
	//TODO promise slots
	
	// Recuperation des slots dependants d'un autre
	function getDepends(slot, eventsDependencies)
	{
		var slotName = getNodeName(slot);
		var slots = [];
		if(slotName != undefined)
		{
			// Si le slot est un node
			var depends = eventsDependencies[slotName];
			// et qu'il a une entree dans les dependances 
			// (i.e. ce n'est pas un node interne)
			if(depends != undefined)
			{
				// On parcourt toutes ses dependances
				for(var j = 0; j < depends.length; j++)
				{
					var depend = depends[j];
					var dependName = getNodeName(depend);
					if(dependName in eventsDependencies)
					{
						// C'est une donnee -> descente recursive
						var dependsSlots = getDepends(depend, eventsDependencies);
						slots = slots.concat(dependsSlots);
					} else
					{
						// C'est un event -> ajout dans les slots
						slots.push(depend);
					}
				}
			}
		} else if("slots" in slot)
		{
			// Sinon si c'est une sous-action, descente recursive
			for(var i = 0; i < slot.slots.length; i++)
			{
				slots = slots.concat(getDepends(slot.slots[i], eventsDependencies));
			}
		}
		return slots;
	}
	
	// Ajout des nodes dependants de l'action
	function applyDependencies(node, eventsDependencies)
	{
		var slots = [];
		if("slots" in node)
		{
			slots = node.slots;
			// TODO : traiter slot unique
			
			var newSlots = [];
			for(var i = 0; i < slots.length; i++)
			{
				var slot = slots[i];
				// Ajout du slot et de ses evenements dependants
				newSlots.push(slot);
				newSlots = newSlots.concat(getDepends(slot, eventsDependencies));
			}
			
			node.slots = newSlots;
		}
	}
	
	for(var key in nodes)
	{
		var node = nodes[key];
		applyDependencies(node, eventsDependencies);
	}
	
	for(var i = 0; i < nodes.__events.length; i++)
	{
		var event = nodes.__events[i];
		applyDependencies(event.action, eventsDependencies);		
	}
	
	return nodes;
}
