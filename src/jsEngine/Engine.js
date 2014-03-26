var library;

function error(str)
{
	throw "Compilation error : " + str;
}

function setEngineLodash(l)
{
	_=l;
}

function isRef(v)
{
	return _.isArray(v) || (_.isString(v) && (v[0] != "'" || v[v.length - 1] != "'"));
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

function List(val, templateType)
{
	this.list = val;
	this.templateType = templateType;
	this.tick = globalTick;

	this.get = function()
    {
		return this.list.map(function(item)
		{
			return item.get();
		});
    }
	
	this.signal = function(value)
    {
		this.list = value;
		this.tick = globalTick;
    }
	
	this.update = function(val, ticks, parentTick)
	{
		// The entire list has changed
		if(ticks.ticks < this.tick)
		{
			return mValTick(this.get());	
		} else // Only elements of the list may have changed
		{
			var subTicks = ticks.subs;
			var newSubTicks = new Array(this.list.length);
			_.each(this.list, function(item, i)
			{
				var ret = item.update(val[i], (subTicks == undefined) ? {tick : parentTick} : subTicks[i]);
				val[i] = ret[0];
				ticks[i] = ret[1];
			});
			return mValTick(val, newSubTicks);
		}
	}
	
	this.getType = function()
	{
		return mListType(this.templateType);
	}
}

function Dict(val, keyType)
{
	this.dict = val;
	this.keyType = keyType;
	this.get = function()
    {
		return _.mapValues(this.dict, function(val)
		{
			return val.get();
		});
    }
	
	this.signal = function(value)
    {
		this.dict = value;
    }
	
	this.getType = function()
	{
		return {base : "dict", params : ["string", this.keyType]};
	}
}

var storeId = 0;

var connections = null;
var connectionSet = false;
var connectionsAllowed = false;

function getPath(struct, path)
{
	if(path.length == 1)
	{
		return struct[path[0]];
	}
	else
	{
		var subPath = path.slice(0);
		var key = subPath.shift();
		return getPath(struct[key], subPath);
	}
}

function Store(v, type) 
{
	this.val = v;
	this.type = type;

	this.deltas = [];
	this.tag = 0;
	
	this.sinks = [];
	this.path = [];
	
	// DEBUG
	this.id = storeId;
	storeId++;

	this.tickGraph = {min : globalTick, max : globalTick, subs : {}};
	
	this.dirtyList = [];
	if(type != null)
	{
		var baseType = getBaseType(type);
		var templates = getTypeParams(type);
		var typeObj = (templates.length > 0) ? 
			library.nodes[baseType].getInstance(templates) :
			library.nodes[type];
		if(typeObj != undefined && "operators" in typeObj)
		{
			var operators = typeObj.operators;
			//this.signalOperator = operators.signal;
		}
	}
	
	this.pushPath = function(path)
	{
		this.path = this.path.concat([path]);
	};
	
	this.popPath = function()
	{
		this.path.pop();
	};

	this.get = function()
	{
		if(this.path.length == 0)
		{
			return this.val;
		}
		return getPath(this.val, this.path);
	};

	this.set = function(val)
	{
		this.val = val;
		this.dirty([]);
	};
	
	this.getMinMaxTick = function(path)
	{
		function getMinMaxTick(graph, path)
		{
			if(path.length == 1)
			{
				var key = path[0];
				if(_.isNumber(key))
				{
					key = key.toString();
				}
				if(!(key in graph.subs))
				{
					return [graph.min, graph.max];
				}
				var sub = graph.subs[key];
				return [sub.min, sub.max];
			}
			else
			{
				var subPath = path.slice(0);
				var key = subPath.shift();
				if(_.isNumber(key))
				{
					key = key.toString();
				}
				if(!(key in graph))
				{
					return [graph.min, graph.max];
				}
				return getMinMaxTick(graph.subs[key], subPath);
			}
		}
		return getMinMaxTick(this.tickGraph, path);
	}

	this.dirty = function(path)
	{
		function dirtyPath(graph, path)
		{
			if(path.length == 1)
			{
				var key = path[0];
				if(_.isNumber(key))
				{
					key = key.toString();
				}
				graph.subs[key] = {min : globalTick, max : globalTick, subs : {}};
			}
			else
			{
				var subPath = path.slice(0);
				var key = subPath.shift();
				if(_.isNumber(key))
				{
					key = key.toString();
				}
				if(!(key in graph.subs))
				{
					graph.subs[key] = {min : graph.min, max : globalTick, subs : {}};
				}
				graph.max = globalTick;
				dirtyPath(graph.subs[key], subPath);
			}
		}
		globalTick++;
		if(path.length == 0)
		{
			this.tickGraph = {min : globalTick, max : globalTick, subs : {}};
		}
		else
		{
			dirtyPath(this.tickGraph, path);
		}

		_.each(this.sinks, function(sink)
		{
			sink.dirty()
		});
		if(path == undefined)
		{
			throw "Path undefined in dirty"
		}
		// TODO maybe later
		// this.dirtyList.push(path)
	}
	
	this.addSink = function(sink)
	{
		this.sinks.push(sink);
	};
	
	this.signal = function(signal, params, path)
	{
		// operators.signal(this.val, signal, params, [], new NodeAccess(this.val, this.type));
		operators.signal(this.val, signal, params, path, this);
		// this.dirty();
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

	this.getPath = function(path)
	{
		return getPath(this.val, this.path.concat(path));
	}

	this.update = function(val, ticks, parentTick)
	{
		return mValTick(this.val);
	}
}

var subStores = [];
var subStoreId = 0;

function SubStore(type, source) 
{
	this.val = null;
	this.type = type;

	// DEBUG
	this.id = storeId;
	storeId++;

	this.subId = subStoreId;
	subStoreId++;

	subStores.push(this);

	this.source = source;
	
	if(type != null)
	{
		var baseType = getBaseType(type);
		var templates = getTypeParams(type);
		var typeObj = (templates.length > 0) ? 
			library.nodes[baseType].getInstance(templates) :
			library.nodes[type];
		if(typeObj != undefined && "operators" in typeObj)
		{
			this.operators = typeObj.operators;
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
	};

	this.push = function(node)
	{
		this.node = node;
		this.val = node.get();
	};

	this.pop = function()
	{
	};
	
	this.signal = function(signal, params, path, node)
	{
		this.operators.signal(this.val, signal, params, path, node);
	};
	
	this.getType = function()
	{
		return this.type;
	}

	this.addSink = function(sink)
	{
		this.source.addSink(sink);
	}

	// this.dirty = function(path)
	// {
	// 	this.node.dirty(path);
	// }
}

function FuncInput(type, source) 
{
	this.stack = [];
	this.refStack = [];
	this.savedStack = [];
	this.type = type;
	
	// DEBUG
	this.id = storeId;
	storeId++;

	this.source = source;
	
	if(type != null)
	{
		var baseType = getBaseType(type);
		var templates = getTypeParams(type);
		var typeObj = (templates.length > 0) ? 
			library.nodes[baseType].getInstance(templates) :
			library.nodes[type];
		if(typeObj != undefined && "operators" in typeObj)
		{
			this.operatorStack = [typeObj.operators];
			this.lastOperatorIndex = 0;
			//this.signalOperator = operators.signal;
		}
	}
	
	this.get = function()
	{
		return this.stack[this.stack.length - 1];
	};

	this.getRef = function()
	{
		return this.refStack[this.refStacklength - 1];
	}

	this.getPath = function(path)
	{
		var ref = this.refStack.pop();
		this.savedStack.push(ref);
		
		var ret = ref.getPath(path);
		
		this.refStack.push(this.savedStack.pop());

		return ret;		
	}

	this.push = function(node)
	{
		var res = node.get();
		this.refStack.push(node);
		this.stack.push(res);
	};
	
	this.pop = function()
	{
		this.refStack.pop();
		this.stack.pop();
	}

	this.pushRef = function(node)
	{
		this.refStack.push(node);
	};
	
	this.popRef = function()
	{
		this.refStack.pop();
	}

	this.pushVal = function(val)
	{
		this.stack.push(val);
	};
	
	this.popVal = function()
	{
		this.stack.pop();
	}

	this.pushOperators = function(operators)
	{
		this.operatorStack.push(operators);
	}
	
	this.popOperators = function()
	{
		this.operatorStack.pop();
	}
	
	this.signal = function(signal, params, path, callFromSlot)
	{
		var val = this.get();

		var operator = this.operatorStack.pop();
		this.savedStack.push(operator);

		operator.signal(val, signal, params, path, this, callFromSlot);
		
		this.operatorStack.push(this.savedStack.pop());
	};
	
	this.getType = function()
	{
		return this.type;
	}

	this.dirty = function(path)
	{
		// Dirty counter is used with recursive calls
		// If a FuncInput is pushed more than once in a recursive call
		// Dirty message will go back through it multiple times, but must go to higher node each time
		var ref = this.refStack.pop();
		this.savedStack.push(ref);

		ref.dirty(path);
		
		this.refStack.push(this.savedStack.pop());
	}

	this.addSink = function(sink)
	{
		this.source.addSink(sink);
	}

	this.set = function(val, rootAndPath)
	{
		var ref = this.refStack.pop();
		this.savedStack.push(ref);

		ref.set(val, rootAndPath);
		
		this.refStack.push(this.savedStack.pop());
	}

	this.update = function(val, ticks, parentTick)
	{
		if(this.lastIndex < this.refStack.length)
		{
			var ref = this.refStack.pop();
			this.savedStack.push(ref);

			return ref.update(val, ticks, parentTick);

			this.refStack.push(this.savedStack.pop());
		}
		else
		{
			return mValTick(this.stack[this.stack.length - 1]);
		}
	}

	this.getMinMaxTick = function(path)
	{
		var ref = this.refStack.pop();
		this.savedStack.push(ref);

		return ref.getMinMaxTick(path);

		this.refStack.push(this.savedStack.pop());
	}
}

function Closure(expr, nodes, genericTypeParams) 
{
	this.nodes = nodes;
	this.nodesClosure =  _.mapValues(nodes, function(node)
	{
		return new SubStore(node.getType());
	});
	var localNodes = {};
	var paramSpec = [];
	var paramStores = _.map(expr.params, function(param, index)
	{
		var node = new FuncInput(param.type);
		localNodes[param.id] = node;
		paramSpec.push(["param" + index.toString(), param.type]);
		return node;
	}, this);
	
	var localNodes = _.merge(localNodes, nodes);
	var expr = makeExpr(expr.closure, localNodes, genericTypeParams);
	
	this.funcSpec = {
		params : paramSpec,
		needsNodes : true,
		func : function(params)	{	
			_.each(params, function(param, index)
			{
				paramStores[index].push(param);
			});
			return expr.get();
			_.each(params, function(param, index)
			{
				paramStores[index].pop();
			});
		},
		type : expr.getType()
	}
	
	this.type = {
		inputs : _.map(paramSpec, function(param)
			{
				return param[1];
			}),		
		output : this.funcSpec.type
	}

	// DEBUG
	this.id = storeId;
	storeId++;
	
	this.get = function()
	{
		// _.each(this.nodesClosure, function(closure, key)
		// {
		// 	var node = this.nodes[key];
		// 	if(node)
		// 	{
		// 		closure.set(node.get());
		// 	}
		// }, this);
		return this.funcSpec;
	};
	
	this.getType = function()
	{
		return this.type;
	}
}

function NodeAccess(val, type) 
{
	this.val = val;
	this.path = [];
	this.type = type;
	
	// DEBUG
	this.id = storeId;
	storeId++;

	var baseType = getBaseType(type);
	var templates = getTypeParams(type);
	var typeObj = (templates.length > 0) ? 
		library.nodes[baseType].getInstance(templates) :
		library.nodes[type];
	if(typeObj != undefined && "operators" in typeObj)
	{
		this.operatorStack = [typeObj.operators];
		this.lastOperatorIndex = 0;
		//this.signalOperator = operators.signal;
	}

	this.get = function()
	{
		if(this.path.length == 0)
		{
			return this.val;
		}
		return getPath(this.val, this.path);
	};

	this.getPath = function(path)
	{
		if(path.length == 0)
		{
			return this.val;
		}
		return getPath(this.val, path);
	};

	this.pushPath = function(path)
	{
		this.path = this.path.concat([path]);
	};
	
	this.popPath = function()
	{
		this.path.pop();
	};
}


function Cache(node) 
{
	this.node = node;
	this.val = this.node.get();
	this.ticks = {tick : globalTick};
	// this.val = node.get();
	this.type = node.getType();
	
	this.node.addSink(this);
	this.isDirty = false;

	this.tick = globalTick;

	var type = node.getType();
	var baseType = getBaseType(type);
	var templates = getTypeParams(type);
	var typeObj = (templates.length > 0) ? 
		library.nodes[baseType].getInstance(templates) :
		library.nodes[type];
	if(typeObj != undefined && "operators" in typeObj)
	{
		var operators = typeObj.operators;
		//this.signalOperator = operators.signal;
	}

	if(this.type != null)
	{
		var baseType = getBaseType(this.type);
		var templates = getTypeParams(this.type);
		var typeObj = (templates.length > 0) ? 
			library.nodes[baseType].getInstance(templates) :
			library.nodes[this.type];
		if(typeObj != undefined && "operators" in typeObj)
		{
			var operators = typeObj.operators;
			//this.signalOperator = operators.signal;
		}
	}
	
	this.get = function()
	{
		if(this.isDirty)
		{
			// this.val = this.node.get();
			// var res = this.node.update(this.val, this.ticks, this.ticks.tick);
			// this.val = res[0];
			// this.ticks = res[1];
			this.val = this.node.get();
			this.isDirty = false;
		}
		this.tick = globalTick;
		return this.val;		
	};

	this.dirty = function()
	{
		this.isDirty = true;
	}
	
	this.addSink = function(sink)
	{
		this.node.addSink(sink);
	};
	
	this.getType = function()
	{
		return this.type;
	}

	this.getPath = function(path)
	{
		function getPath(struct, path)
		{
			if(path.length == 1)
			{
				return struct[path[0]];
			}
			else
			{
				var subPath = path.slice(0);
				var key = subPath.shift();
				return getPath(struct[key], subPath);
			}
		}
		return getPath(this.val, path);
	}

	this.signal = function(signal, params, path, rootAndPath)
	{
		operators.signal(this.val, signal, params, path, new NodeAccess(this.val, this.type));
	}
}

function ActionParam(type) 
{
	this.type = type;
	var baseType = getBaseType(type);
	var templates = getTypeParams(type);
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

function Affectation(val, paths, setPath)
{
	this.val = val;
	this.paths = paths;
	this.setPath = setPath;
	this.affect = function(obj)
	{
		var val = this.val.get();
		for(var j = 0; j < this.paths.length; j++)
		{
			var path = this.paths[j];
			this.setPath(obj, path, val);
		}
	}
}
function CondAffectation(cond, thenAffects, elseAffects) {
	this.cond = cond;
	this.thenAffects = thenAffects;
	this.elseAffects = elseAffects;
	this.affect = function(obj)
	{
		if(this.cond.get())
		{
			_.forEach(this.thenAffects, function(affect){affect.affect(obj);});
		}
		else if(this.elseAffects != undefined)
		{
			_.forEach(this.elseAffects, function(affect){affect.affect(obj);});
		}
	};
}

function makeAffectations(matchesGraph, nodes, setPathOperator)
{
	return matchesGraph.map(function(mergeExp){
		
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
		
		return new Affectation(makeExpr(mergeExp.val, nodes), mergeExp.paths, setPathOperator);
	});
}

function Merge(what, matchesGraph, nodes)
{
	this.what = compileRef(what, nodes).val;
	var whatType = this.what.getType();
	var setPathOperator = library.nodes[whatType].operators.setPath;
	
	this.matches = makeAffectations(matchesGraph, nodes, setPathOperator);
					
	this.get = function()
	{
		//var obj = this.what.get();
		// TODO methode clone sur les struct ?
		var newObj = _.cloneDeep(this.what.get());
		_.forEach(this.matches, function(affect){affect.affect(newObj);});
			// var mergeWith = this.matches[i];
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

function cartesianProductOf(arrays) {
	return _.reduce(arrays, function(a, b) {
		return _.flatten(_.map(a, function(x) {
			return _.map(b, function(y) {
				return x.concat([y]);
			});
		}), true);
	}, [ [] ]);
};

function Comprehension(nodeGraph, externNodes)
{
	this.nodes = {};
	
	// TODO  connections
	var iterators = nodeGraph.it;
	this.arrays = new Array(iterators.length);
	var inputs = new Array(iterators.length);
	var destructInputs = new Array(iterators.length);
	var comprehensionIndices = new Array(iterators.length);

	this.id = storeId;
	storeId++;

	// TODO replace SubStores by FuncInput (for reccursion)
	// And cleanup SubStores of push, pop, dirty ...
	_.forEach(iterators, function(iterator, index)
	{
		exprAndType = makeExprAndType(iterator["in"], externNodes);
		this.arrays[index] = exprAndType.val;
		var inputType = exprAndType.val.getType();
		if(getBaseType(inputType) != "list")
		{
			error("Comprehension input parameter " + iterator["in"] + " is not a list : " + inputType);
		}
		var inputTemplateType = getTypeParams(inputType)[0];
	
		var inputGraph = iterator["for"];
		if(_.isString(inputGraph))
		{
			inputs[index] = new ArrayAccess(this.arrays[index]);
			this.nodes[iterator["for"]] = inputs[index];
		} else // destruct
		{
			var destructGraph = inputGraph.destruct;
			var destructTypes = getTypeParams(inputTemplateType);
			destructInputs[index] = _.map(destructTypes, function(type)
			{
				return new SubStore(type, exprAndType.val)
			});
			this.nodes = _(destructGraph)
				.zipObject(destructInputs[index])
				.value();
		}
		if("index" in iterator)
		{
			// TODO  Path ?
			// TODO param nodes = union(this.nodes, externNodes)
			comprehensionIndices[index] = new FuncInput("int", exprAndType.val);
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
	var beforeConnectionsLength = connections.length;
	
	
	var expr = makeExpr(nodeGraph["comp"], mergedNodes);

	// TODO only if connection in the expression, or function takes a ref
	var hasConnections = false;
	var funcRef = false;
	var signalsList = [];	

	if("func" in expr && "hasRef" in expr.func)
	{
		funcRef = true;
	} else
	if(connectionSet)
	{
		hasConnections = true;
	}

	this.outputList = [];
	this.get = function(path)
	{
		// var filteredArray = this.array.get();
		var arrays = _.map(this.arrays, function(array, index)
		{
			var ret = array.get();
			if(inputs[index] != undefined)
			{
				inputs[index].pushCache(ret);
			}
			return ret;
		});
		
		// Le produit cartesien des indices
		var indicesArray = cartesianProductOf(_.map(arrays, function(array)
		{
			return _.range(array.length);
		}));
		if(when != undefined)
		{
			this.outputList = [];
			_.each(indicesArray, function(indices)
			{
				var tuple = _.map(arrays, function(array, index){return array[indices[index]];});
			
				for(var arrayIndex = 0; arrayIndex < arrays.length; arrayIndex++)
				{
					if(comprehensionIndices[arrayIndex] != undefined)
					{
						comprehensionIndices[arrayIndex].pushVal(indices[arrayIndex]);
					}
					if(inputs[arrayIndex] != undefined)
					{
						inputs[arrayIndex].push(indices[arrayIndex]);
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
					var ret = expr.get();
					this.outputList.push(ret);
				}

				for(var arrayIndex = 0; arrayIndex < arrays.length; arrayIndex++)
				{
					if(comprehensionIndices[arrayIndex] != undefined)
					{
						comprehensionIndices[arrayIndex].popVal();
					}
					if(inputs[arrayIndex] != undefined)
					{
						inputs[arrayIndex].pop();
					} else
					{
						// _(destructInputs[arrayIndex]).forEach(function(input, tupleIndex)
						// 	{
						// 		input.set(tuple[arrayIndex][tupleIndex]);
						// 	});
					}
				}
			}, this);
		}
		else
		{
			this.outputList = _.map(indicesArray, function(indices, i) 
			{
				var tuple = _.map(arrays, function(array, index){return array[indices[index]];});
			
				for(var arrayIndex = 0; arrayIndex < arrays.length; arrayIndex++)
				{
					if(comprehensionIndices[arrayIndex] != undefined)
					{
						comprehensionIndices[arrayIndex].pushVal(indices[arrayIndex]);
					}
					if(inputs[arrayIndex] != undefined)
					{
						inputs[arrayIndex].push(indices[arrayIndex]);
						// inputs[arrayIndex].push(new ArrayAccess(this.arrays[arrayIndex], i));
					} else
					{
						_(destructInputs[arrayIndex]).forEach(function(input, tupleIndex)
							{
								input.set(tuple[arrayIndex][tupleIndex]);
							});
					}
				}

				var ret = expr.get(true);
				if(hasConnections)
				{
					ret.__referencedNodes = [];
					ret.__refs = inputs;
					_.each(this.arrays, function(array)
					{
						ret.__referencedNodes.push(i);
					}, this);
				} 
				else  if(funcRef)
				{
					ret.__refs = inputs.concat(ret.__refs);
					ret.__referencedNodes = _.map(inputs, function(input, arrayIndex)
					{
						return i;
					}, this).concat(ret.__referencedNodes);
				} 

				for(var arrayIndex = 0; arrayIndex < arrays.length; arrayIndex++)
				{
					if(comprehensionIndices[arrayIndex] != undefined)
					{
						comprehensionIndices[arrayIndex].popVal();
					}
					if(inputs[arrayIndex] != undefined)
					{
						inputs[arrayIndex].pop();
					} else
					{
						// _(destructInputs[arrayIndex]).forEach(function(input, tupleIndex)
						// 	{
						// 		input.set(tuple[arrayIndex][tupleIndex]);
						// 	});
					}
				}
				return ret;
			}, this);
		}

		_.each(this.arrays, function(array, index)
		{
			if(inputs[index] != undefined)
			{
				inputs[index].popCache();
			}
		});

		return this.outputList;
	};
	
	// TODO ameliorer
	this.update = function(upVal, ticks, parentTick)
	{
		var maxTicks = 0, maxOfMinTicks = 0;
		_.each(this.arrays, function(array){
			var arrayMinMaxTicks = array.getMinMaxTick([]);
			maxTicks = Math.max(maxTicks, arrayMinMaxTicks[1]);
			maxOfMinTicks = Math.max(maxOfMinTicks, arrayMinMaxTicks[0]);
		});

		// No array has been updated after value
		if(ticks.tick >= maxTicks)
			return mValTick(upVal, ticks.sub);

		// Parts of array have changed after value, but arrays size didn't
		if(ticks.tick >= maxOfMinTicks)
		{
			var subTicks = ticks.sub;
			var arrays = _.map(this.arrays, function(array){return array.get();});
				
			// Le produit cartesien des indices
			var indicesArray = cartesianProductOf(_.map(arrays, function(array)
			{
				return _.range(array.length);
			}));
			if(when != undefined)
			{
				this.outputList = [];
				_.each(indicesArray, function(indices)
				{
					var tuple = _.map(arrays, function(array, index){return array[indices[index]];});
				
					for(var arrayIndex = 0; arrayIndex < arrays.length; arrayIndex++)
					{
						if(comprehensionIndices[arrayIndex] != undefined)
						{
							comprehensionIndices[arrayIndex].pushVal(indices[arrayIndex]);
						}
						if(inputs[arrayIndex] != undefined)
						{
							inputs[arrayIndex].pushVal(tuple[arrayIndex]);
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
						var ret = expr.get();
						this.outputList.push(ret);
					}

					for(var arrayIndex = 0; arrayIndex < arrays.length; arrayIndex++)
					{
						if(comprehensionIndices[arrayIndex] != undefined)
						{
							comprehensionIndices[arrayIndex].popVal();
						}
						if(inputs[arrayIndex] != undefined)
						{
							inputs[arrayIndex].popVal();
						} else
						{
							// _(destructInputs[arrayIndex]).forEach(function(input, tupleIndex)
							// 	{
							// 		input.set(tuple[arrayIndex][tupleIndex]);
							// 	});
						}
					}
				}, this);
			}
			else
			{
				var vals = upVal;
				_.each(indicesArray, function(indices, i) 
				{
					var tuple = _.map(arrays, function(array, index){return array[indices[index]];});
				
					for(var arrayIndex = 0; arrayIndex < arrays.length; arrayIndex++)
					{
						if(comprehensionIndices[arrayIndex] != undefined)
						{
							comprehensionIndices[arrayIndex].pushVal(indices[arrayIndex]);
						}
						if(inputs[arrayIndex] != undefined)
						{
							inputs[arrayIndex].push(indices[arrayIndex]);
						} else
						{
							_(destructInputs[arrayIndex]).forEach(function(input, tupleIndex)
								{
									input.set(tuple[arrayIndex][tupleIndex]);
								});
						}
					}

					var pair = expr.update(vals[i], (subTicks == undefined) ? {tick :parentTick} : subTicks[i], parentTick);
					var ret = pair[0];
					if(hasConnections)
					{
						ret.__referencedNodes = [];
						ret.__refs = inputs;
						_.each(this.arrays, function(array)
						{
							ret.__referencedNodes.push(i);
						}, this);
					} 
					else  if(funcRef)
					{
						ret.__refs = inputs.concat(ret.__refs);
						ret.__referencedNodes = _.map(inputs, function(input, arrayIndex)
						{
							return i;
						}, this).concat(ret.__referencedNodes);
					} 

					for(var arrayIndex = 0; arrayIndex < arrays.length; arrayIndex++)
					{
						if(comprehensionIndices[arrayIndex] != undefined)
						{
							comprehensionIndices[arrayIndex].popVal();
						}
						if(inputs[arrayIndex] != undefined)
						{
							// inputs[arrayIndex].popVal();
							inputs[arrayIndex].pop();
						} else
						{
							// _(destructInputs[arrayIndex]).forEach(function(input, tupleIndex)
							// 	{
							// 		input.set(tuple[arrayIndex][tupleIndex]);
							// 	});
						}
					}
					vals[i] = ret;
					ticks[i] = pair[1];
				}, this);
			}
			return mValTick(vals, ticks);
		}
		else
		{
			return mValTick(this.get(), undefined);
		}
	};
	
	this.getType = function(path)
	{
		return mt("list", [expr.getType()]);
	}
	
	this.addSink = function(sink)
	{
		// _.each(this.arrays, function(array){array.addSink(sink);});
		expr.addSink(sink);
	};
}

function Select(nodeGraph, externNodes)
{
	this.nodes = {};
	
	// TODO  connections
	var rootNode = makeNode(nodeGraph.select, externNodes);
	var pathStore = null;
	if(nodeGraph.path)
	{
		// TODO utiliser le type component, car le root n'est pas forcement de ce type
		pathStore = new SubStore(mt("list", [rootNode.getType()]));
	}
	var matches = _.map(nodeGraph.matches, function(match)
	{
		var type = match.selector.type;
		var elementStore = new SubStore(type);
		var newNodes = {};
		newNodes[match.selector["id"]] = elementStore;
		if(pathStore != null)
		{
			newNodes[nodeGraph.path] = pathStore;
		}
		var mergedNodes = _.merge(_.clone(externNodes), newNodes);
		var val = makeExpr(match.val, mergedNodes);
		return	{
			"type" : type,
			"elementStore" : elementStore,
			"val" : val
		};
	});
	
	this.get = function()
	{
		var root = rootNode.get();
				
		function select(val, path)
		{
			var type = val.__type;
			if(pathStore != null)
			{
				pathStore.set(path);
			}
			var ret = [];
			for(var i = 0; i < matches.length; ++i)
			{
				var match = matches[i];
				if(match.type == type)
				{
					match.elementStore.set(val);
					ret.push(match.val.get());
					break;
				}
			}
			
			if("children" in val)
			{
				ret = _.reduce(root.children, function(accum, val)
				{
					return accum.concat(select(val, path.concat([val])));
				}, ret);
			}
			
			return ret;
		}
		
		var ret = select(root, [root]);
		
		return ret;
	};
	
	this.getType = function(path)
	{
		// TODO check all selectors have same return type
		return mt("select", [matches[0].val.getType()]);
	}
	
	this.addSink = function(sink)
	{
		rootNode.addSink(sink);
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
	var field = _.find(fields, function(field){return (field[0] == head);})
	if(field == undefined)
	{
		error("No field " + head + " in structure " + fields.toString());
	}
	var fieldType = field[1];
	
	if(path.length == 1)
		return fieldType;
		
	return getFieldType(library.nodes[fieldType].fields, _.tail(path));
}

function typeToCompactString(type)
{
	var baseType = getBaseType(type);
	var typeParams = getTypeParams(type);
	if(typeParams.length == 0)
	{
		return baseType;
	}
	var ret = baseType + "#" + (_.map(typeParams, typeToCompactString)).join("#");
	return ret;
}

function StructAccess(node, path, val) {
    this.node = node;
    this.path = path;
    if(val == undefined)
    {
		var nodeType = node.getType();	
    }
    else
    {
    	var nodeType = val.__type;
    }
	var baseType = getBaseType(nodeType);
	var templates = getTypeParams(nodeType);
	check(baseType in library.nodes, "Node type " + baseType + " not found in library");
	var typeObj = (templates.length > 0) ? 
		library.nodes[baseType].getInstance(templates) :
		library.nodes[baseType];
	var operators = typeObj.operators;
	this.getPathOperator = operators.getPath;
	this.setPathOperator = operators.setPath;
	this.updateOperator = operators.update;
	
	var fields = typeObj.fields;
	try
	{
		this.type = getFieldType(fields, path);
	}
	catch(err)
	{
		console.log(err);
		error("No field " + path + " in node of type " + node.getType());		
	}

	this.get = function()
	{
		return this.node.getPath(this.path);
		// TODO ameliorer ... par ex stocker les operator dans la valeur (== methode virtuelle)
		// Dispatch dynamique, si le node est un store, la valeur peut etre d'un type herite, 
		// et meme changer au cours du temps
		// if(_.isObject(val) && "__type" in val)
		// //if(true)
		// {
		// 	var operators = library.nodes[typeToCompactString(val.__type)].operators;
		// 	this.getPathOperator = operators.getPath;
		// }
		// return this.getPathOperator(val, this.path);
	};
	
	this.set = function(val, rootAndPath, subPath)
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
		currentPath = currentPath.concat(this.path);
		this.setPathOperator(struct, this.path, val);
		if(rootAndPath)
		{
			rootAndPath.root.dirty(rootAndPath.path.concat(this.path));
		}
		else
		{
			this.node.dirty(this.path);
		}
		currentPath = currentPath.slice(0, -this.path.length);
	};

	this.getPath = function(path)
	{
		return this.node.getPath(this.path.concat(path));		
	}
	
	this.signal = function(signal, params, rootAndPath)
	{
		currentPath = currentPath.concat(this.path);
		operators.signal(this.node.get(), signal, params, this.path, {root : rootAndPath.root, path : rootAndPath.path.concat(this.path)});
		// this.node.dirty();
		currentPath = currentPath.slice(0, -this.path.length);
	};
	
	this.dirty = function(path)
	{
		this.node.dirty(this.path.concat(path));
	}
	
	this.addDelta = function(delta)
	{
		this.node.deltas.push(delta);
	}
	
	this.getType = function()
	{
		return this.type;
	}
	
	this.addSink = function(sink)
	{
		this.node.addSink(sink);
	};

	this.update = function(val, ticks, parentTick)
	{
		var minMax = this.node.getMinMaxTick(this.path.concat(path));
		if(ticks.tick >= minMax[1])
		{
			return [val, ticks];
		} 	
		var val = this.node.get();
		// TODO ameliorer ... par ex stocker les operator dans la valeur (== methode virtuelle)
		// Dispatch dynamique, si le node est un store, la valeur peut etre d'un type herite, 
		// et meme changer au cours du temps
		if(_.isObject(val) && "__type" in val)
		//if(true)
		{
			var operators = library.nodes[typeToCompactString(val.__type)].operators;
			this.getPathOperator = operators.getPath;
		}
		return mValTick(this.getPathOperator(val, this.path));
	}

	this.getMinMaxTick = function(path)
	{
		return this.node.getMinMaxTick(this.path.concat(path));
	}
}

function ArrayAccess(node, type) {
    this.node = node;
    if(node == undefined)
    {
    	var nodeType = type;	
    }
    else
    {
    	var nodeType = node.getType();
    }
	var baseType = getBaseType(nodeType);
	var templates = getTypeParams(nodeType);
	check(baseType in library.nodes, "Node type " + baseType + " not found in library");
	// TODO generic management
	var elemType = library.nodes[getBaseType(templates[0])];
	var operators = elemType.operators;

	this.id = storeId;
	storeId++;

	this.stack = [];
	this.savedStack = [];
	this.cacheStack = [];

	this.signal = function(signal, params, rootAndPath)
	{
		var index = this.stack.pop();
		this.savedStack.push(index);

		currentPath = currentPath.concat(index);
		operators.signal(this.node.get()[index], signal, params, {root : rootAndPath.root, path : rootAndPath.path.concat([index])});
		// this.node.dirty();
		currentPath = currentPath.slice(0, -1);

		index = this.savedStack.pop();
		this.stack.push(index);
	};

	this.get = function()
	{		
		if(this.cacheStack.length > 0)
		{
			var array = this.cacheStack[this.cacheStack.length - 1];
			return array[this.stack[this.stack.length - 1]];
		}
		else
		{
			var index = this.stack.pop();
			this.savedStack.push(index);

			var array = this.node.get();
			var ret = array[index];
			
			index = this.savedStack.pop();
			this.stack.push(index);

			return ret;
		}
	}

	this.pushCache = function(array)
	{
		this.cacheStack.push(array);
	}

	this.popCache = function()
	{
		this.cacheStack.pop();
	}

	this.push = function(index)
	{
		this.stack.push(index);
	}

	this.pop = function()
	{
		this.stack.pop();
	}

	this.getMinMaxTick = function(path)
	{
		var index = this.stack.pop();
		this.savedStack.push(index);

		var ret = this.node.getMinMaxTick([index].concat(path));

		index = this.savedStack.pop();
		this.stack.push(index);

		return ret;
	}
	
	this.dirty = function(path)
	{
		var index = this.stack.pop();
		this.savedStack.push(index);

		this.node.dirty([index].concat(path));
		
		index = this.savedStack.pop();
		this.stack.push(index);
	}
	
	this.getType = function()
	{
		var nodeType = node.getType();
		var templates = getTypeParams(nodeType);
		return  templates[0];
	}

	this.addSink = function(sink)
	{
		this.node.addSink(sink);
	};

	this.set = function(val, rootAndPath)
	{
		var index = this.stack.pop();
		this.savedStack.push(index);

		var array = this.node.get();
		array[index] = val;
		this.node.dirty([index]);

		index = this.savedStack.pop();
		this.stack.push(index);
	}

	this.getPath = function(path)
	{
		var index = this.stack.pop();
		this.savedStack.push(index);

		var ret = this.node.getPath([index].concat(path));
		
		index = this.savedStack.pop();
		this.stack.push(index);

		return ret;
	}
}

function Destruct(t)
{
	var tuple = t;
	this.set = function(val)
	{
		_.each(val, function(subVal, index){tuple[index].set(subVal);})
	}
}

var promiseCounter = 0;
var nodeRefs = {};

function compileRef(ref, nodes, promiseAllowed)
{
	if(_.isPlainObject(ref) && "destruct" in ref)
	{
		var tupleGraph = ref.destruct;
		var tuple = _.map(tupleGraph, function(path){return compileRef(path, nodes, promiseAllowed).val;});
		var templates = _.map(tuple, function(node){return node.getType();})
		return {val : new Destruct(tuple), type : mt("tuple", templates)};
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
			if("guessTypeParams" in func)
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
			promiseCounter++;
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
		// If reference is an action, no type...
		// TODO : make another function for resolving references to actions ?
		if("getType" in node)
		{
			var type = node.getType(path);
		}
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
function makeExprAndType(expr, nodes, genericTypeParams, cloneIfRef)
{
	if(isRef(expr))
	{
		var ref = expr;
		
		var compiledRef = compileRef(ref, nodes);
		// Utilise par les actions d'affectations, pour copier la valeur et non la reference
		if(cloneIfRef != undefined && cloneIfRef)
			return {val : new Cloner(compiledRef.val), type : compiledRef.type};
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
		return {val : new List(l, templateType), type : mListType(templateType)};
	} else if("dict" in expr)
	{
		var d = _.mapValues(expr.dict, function(val)
			{
				return makeExpr(val, nodes);
			}
		);
		var valType = undefined;
		_.forOwn(d, function(val)
		{
			var newType = val.getType();
			if(valType == undefined)
			{
				valType = newType;
			}
			else if(valType != newType)
			{
				error("Dict value types are not the same, found " + valType + " and " + newType);
			}
		});
		return {val : new Dict(d, valType), type : {base : "dict", params : ["string", valType]}};
	} else  if("string" in expr)
	{
		return {val : new Store(expr.string, "string"), type : "string"};
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
			// var type = getOutType(closure.getType());
			var type = "closure";
			var typeParams = [];
			var nodeSpec = new funcToNodeSpec(closure);
		}
		else
		{
			var type = getBaseType(expr.type);
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
				var typeParams = expr.typeParams;
				if(genericTypeParams)
				{
					typeParams = _.map(typeParams, function(type)
					{
						if(type in genericTypeParams)
							return genericTypeParams[type];
						return type;
					});
				}
			}
			if(paramsGraph != undefined)
			{
				var paramsValAndType = _.map(paramsGraph, function(paramGraph)
				{
					return makeExprAndType(paramGraph, nodes, genericTypeParams);
				});
				var vals = _.map(paramsValAndType, "val");
				//var templates = _.map(paramsValAndType, function(valAndType) {return valAndType.val.getType();});
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
					function getType(val)
					{
						if(_.isNumber(val))
						{
							return "float";
						} else if(_.isString(val))
						{
							return "string";
						} else if(_.isArray(val))
						{
							if(val.length == 0)
							{
								return listTemplate(null);
							}
							else
							{
								return listTemplate(getType(val[0]));								
							}
						} else
						{
							return val.__type;
						}
					}
					var valType = getType(val);
					
					if(!isSameOrSubType(val.getType(), paramSpec[1]))
					{
						error("Parameter of index " + paramIndex + " in call of " + 
							expr.type + " is of type " + typeToString(val.getType()) + ", required type " + typeToString(paramSpec[1]));
					}
					fields[paramSpec[0]] = val;
				}
			}
			node = new nodeSpec.builder(fields, typeParams);
		}

		if("func" in node && "hasRef" in node.func)
		{
			connectionSet = true;
		}
		
		if("connections" in expr)
		{
			if(connectionsAllowed)
			{
				var signals = node.get().__signals;
				var signals = node.fields.__signals;
				var type = node.getType();
				connections.push({
					signals : signals,
					type : type,
					connections : expr.connections
				});
			}
			else
			{
				var signals = node.fields.__signals;
				var type =  node.getType();
				var slots = library.nodes[type].operators.slots;

				_.each(expr.connections, function(connection)
				{
					var mergedNodes = _.clone(nodes);
					_.merge(mergedNodes, slots[connection.signal].localNodes);
					var action = makeAction(connection.action, mergedNodes);
					signals[connection.signal].push(action);
				});
				connectionSet = true;
			}

		}
		// TODO type ?
		// return {val : node, type : node.getType()};
		return {val : node, type : expr.type};
	} else if("merge" in expr)
	{
		// TODO type avec template
		return {val : new Merge(expr.merge, expr["with"], nodes), type : "merge"};
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
					var match = this.cases[i];
					for(var j = 0; j < match.vals.length; j++)
					{
						if(match.vals[j].get() == val)
						{
							return match.out.get();
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
		function MatchType(what, cases)
		{
			this.what = getNode(what, nodes);
			this.cases = cases.map(function(matchExp){
				var matchStore = new FuncInput(matchExp.type != "_" ? matchExp.type : this.what.getType(), this.what);
				var mergedNodes = _.clone(nodes);
				mergedNodes[what] = matchStore;
				var type = matchExp.type;
				if(genericTypeParams && type in genericTypeParams)
				{
					type = genericTypeParams[type];
				}
				
				var val = makeExpr(matchExp.val, mergedNodes, genericTypeParams);
	
				var hasConnections = false;
				var funcRef = false;
				if("func" in val && "hasRef" in val.func)
				{
					funcRef = true;
				} else if(connectionSet)
				{
					hasConnections = true;
				}

				return {
					val : val,
					type : type,
					matchStore : matchStore,
					hasConnections : hasConnections,
					funcRef : funcRef
				};
			}, this);
			var whatType = this.what.getType();
						
			this.get = function()
			{
				var val = this.what.get();
				var type = val.__type;
				for(var i = 0; i < this.cases.length - 1; i++)
				{
					var match = this.cases[i];
					if(sameTypes(type,  match.type))
					{
						match.matchStore.push(this.what);
						var ret = match.val.get();
						if(match.hasConnections)
						{
							ret.__referencedNodes = [this.what];
							ret.__refs = [match.matchStore];
						} 
						else  if(match.funcRef)
						{
							ret.__refs = [match.matchStore].concat(ret.__refs);
							ret.__referencedNodes = [this.what].concat(ret.__referencedNodes);
						} 
						match.matchStore.pop();
						return ret;
					}
				}
				// else case
				var match = this.cases[i];
				match.matchStore.push(this.what);

				var ret = match.val.get();

				if(match.hasConnections)
				{
					ret.__referencedNodes = [this.what];
					ret.__refs = [match.matchStore];
				} 
				else  if(match.funcRef)
				{
					ret.__refs = [match.matchStore].concat(ret.__refs);
					ret.__referencedNodes = [this.what].concat(ret.__referencedNodes);
				} 
		
				match.matchStore.pop();
		
				return ret;
				// TODO Error				
			}

			this.update = function(upVal, ticks, parentTick)
			{
				var minMax = this.what.getMinMaxTick([]);
				if(ticks.tick >= minMax[1])
				{
					return upVal;
				}

				return mValTick(this.get());
			}
			
			this.getType = function()
			{
				return whatType;
			}
		}

		// TODO type avec template
		return {val : new MatchType(expr.matchType, expr["cases"]), type : "match"};
	} else if("comp" in expr)
	{
		var node = new Comprehension(expr, nodes);
		return {val : node, type : "comprehension"};
	} else if("select" in expr)
	{
		var node = new Select(expr, nodes);
		return {val : node, type : "select"};
	} else if("closure" in expr)
	{
		var closure = new Closure(expr, nodes, genericTypeParams);
		return {val : closure, type : closure.getType()};
	}
}

function makeExpr(expr, nodes, genericTypeParams, cloneIfRef)
{
	return makeExprAndType(expr, nodes, genericTypeParams, cloneIfRef).val;
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
		} else if("cache" in nodeGraph)
		{
			node = new Cache(node);
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
    this.signal = function(rootAndPath)
    {
		if(this.param.get())
		{
			this.thenSlot.signal(rootAndPath);
		}
		else if(this.elseSlot != undefined)
		{
			this.elseSlot.signal(rootAndPath);
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

function GroupChildRef(children, typeParam, rootNode)
{
	this.children = children;
	this.typeParam = typeParam;
	this.rootNode = rootNode;
	this.index = 0;
	
	this.get = function()
	{
		return this.children[this.index];
	}
	
	this.set = function(val)
	{
		this.children[this.index] = val;
		// TODO : root notification
		//this.listNode.addDelta({path : [], val : new ListDelta([0], 0, [[this.index, val]])});
	}		
	
	// this.addDelta = function(delta)
	// {
		// this.listNode.addDelta({path : [this.index].concat(delta.path), val : delta.val});
	// }	
	
	this.getType = function()
	{
		return listTemplate(this.typeParam);
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
				this.list.signal("foreach", [this.iteratedSignal].concat(this.params));
			}
		}
		var iterated = compileRef(actionGraph["foreach"], nodes).val;
		checkList(iterated.getType());
		var paramsGraph = actionGraph.params;
		var compiledParams = _.map(paramsGraph, function(param){return makeExpr(param, nodes);});
		// TODO check signal and params valid with list element type
		return new ForEach(iterated, actionGraph.signal, compiledParams);
	}
	
	if("match" in actionGraph)
	{
		function MatchAction(actionGraph, nodes)
		{
			var cases = actionGraph.cases;
			this.what = makeExpr(actionGraph.match, nodes);
			this.cases = cases.map(function(caseGraph){
				return {
					vals : _.map(caseGraph.vals, function(val)
					{
						return makeExpr(val, nodes);
					}),
					action : makeAction(caseGraph.action, nodes)
				};
			}, this);
			if("else" in actionGraph)
			{
				this.elseCase = makeAction(actionGraph["else"], nodes);
			}
						
			this.signal = function(rootAndPath)
			{
				var val = this.what.get();
				for(var i = 0; i < this.cases.length; i++)
				{
					var match = this.cases[i];
					for(var j = 0; j < match.vals.length; j++)
					{
						if(match.vals[j].get() == val)
						{
							match.action.signal(rootAndPath);
							return;
						}
					}
				}
				if(this.elseCase)
					this.elseCase.signal(rootAndPath);
			}
		}

		// TODO type avec template
		return new MatchAction(actionGraph, nodes);
	}
	
	if("matchType" in actionGraph)
	{
		function MatchTypeAction(actionGraph, nodes)
		{
			var cases = actionGraph.cases;
			this.what = getNode(actionGraph.matchType, nodes);
			this.cases = cases.map(function(matchExp){
				var matchStore = new FuncInput(matchExp.type != "_" ? matchExp.type : this.what.getType());
				var mergedNodes = _.clone(nodes);
				mergedNodes[actionGraph.matchType] = matchStore;
				return {
					action : makeAction(matchExp.action, mergedNodes),
					type : matchExp.type,
					matchStore : matchStore
				};
			}, this);
			var whatType = this.what.getType();
						
			this.signal = function(rootAndPath)
			{
				var val = this.what.get();
				var type = val.__type;
				for(var i = 0; i < this.cases.length; i++)
				{
					var match = this.cases[i];
					if((type == match.type) || isStrictSubType(type, match.type))
					{
						match.matchStore.push(this.what);
						match.action.signal(rootAndPath);
						match.matchStore.pop();
					}
				}
			}
		}

		// TODO type avec template
		return new MatchTypeAction(actionGraph, nodes);
	}
	
	if("select" in actionGraph)
	{
		function SelectAction(nodeGraph, externNodes)
		{
			this.nodes = {};
			
			// TODO  connections
			var rootNode = makeNode(nodeGraph.select, externNodes);
			var pathStore = null;
			if(nodeGraph.path)
			{
				// TODO utiliser le type component, car le root n'est pas forcement de ce type
				pathStore = new FuncInput(mt("list", [rootNode.getType()]));
			}
			
			var matches = _.map(nodeGraph.apply, function(match)
			{
				var type = match.selector.type;
				var newNodes = {};
				
				if("id" in match.selector)
				{
					var elementStore = new SubStore(type);					
					newNodes[match.selector["id"]] = elementStore;				
				}
				
				if(pathStore != null)
				{
					newNodes[nodeGraph.path] = pathStore;
				}
				var mergedNodes = _.merge(_.clone(externNodes), newNodes);
				var setPathOperator = library.nodes[type].operators.setPath;
				var affectations = makeAffectations(match.affectations, mergedNodes, setPathOperator);
				var ret =	{
					"type" : type,
					"elementStore" : elementStore,
					"affectations" : affectations
				};
				
				if("id" in match.selector)
				{					
					ret.elementStore = elementStore;
				}
				
				return ret;
			});
			
			this.signal = function()
			{
				function apply(val, path, rootNode)
				{
					var type = val.__type;
					if(pathStore != null)
					{
						pathStore.push(path);
					}
					for(var i = 0; i < matches.length; ++i)
					{
						var match = matches[i];
						if(match.type == type)
						{
							//val = node.get();
							match.elementStore.set(val);
							_.forEach(match.affectations, function(affect){affect.affect(val);});						
							break;
						}
					}
					
					if("children" in val)
					{
						if(val == null)
						{
							val = node.get();
						}
						var concatPath = path.concat([val]);
						_.each(val.children, function(child)
						{
							apply(child, concatPath);
						});
					}

					if(pathStore != null)
					{
						pathStore.pop();
					}					
				}
				
				// TODO set path only when needed
				var rootVal = rootNode.get();
				apply(rootVal, [rootVal], rootNode);
			};
		}

		return new SelectAction(actionGraph, nodes);
	}
	
	if("for" in actionGraph)
	{
		function ForAction(iterated, arrayAccess, indexStore, action)
		{
			this.listStore = iterated;
			this.arrayAccess = arrayAccess;
			this.indexStore = indexStore;
			this.action = action;
			
			this.signal = function()
			{
				var list = this.listStore.get();
				_.each(
					list, 
					function(element, index)
					{
						this.arrayAccess.push(index);
						if(this.indexStore != undefined)
							this.indexStore.set(index);
						this.action.signal();	
						this.arrayAccess.pop();					
					},
					this
				);
			}
		}
		
		var iterated = compileRef(actionGraph["in"], nodes).val;
		var localNodes = _.clone(nodes);
		
		var arrayAccess = new ArrayAccess(iterated);
		// TODO gerer destruct
		localNodes[actionGraph["for"]] = arrayAccess;
		var indexStore = null;
		if("index" in actionGraph)
		{
			indexStore = new SubStore("int")
			localNodes[actionGraph["index"]] = indexStore;
		}
		// TODO : check that action only change iterator
		var action = makeAction
		(
			actionGraph["do"],
			localNodes
		);

		return new ForAction(iterated, arrayAccess, indexStore, action);
	}
	
	if("update" in actionGraph)
	{
		function Update(iterated, arrayAccess, indexStore, action)
		{
			this.listStore = iterated;
			this.arrayAccess = arrayAccess;
			this.indexStore = indexStore;
			this.action = action;
			
			this.signal = function()
			{
				var list = this.listStore.get();
				_.each(
					list, 
					function(element, index)
					{
						this.arrayAccess.push(index);
						if(this.indexStore != undefined)
							this.indexStore.set(index);
						this.action.signal();
						this.arrayAccess.pop();
					},
					this
				);
			}
		}
		
		function CondUpdate(iterated, arrayAccess, indexStore, action, cond)
		{
			this.listStore = iterated;
			this.arrayAccess = arrayAccess;
			this.indexStore = indexStore;
			this.action = action;
			this.cond = cond;
			
			this.signal = function()
			{
				
				var updated = [];
				var list = this.listStore.get();
				var removed = false;
				_.each(
					list, 
					function(element, index)
					{
						this.arrayAccess.push(index);
						if(this.indexStore != undefined)
							this.indexStore.signal(index);
						if(this.cond.get())
						{
							this.action.signal();
							var newVal = this.arrayAccess.get();
							updated.push(newVal);
						}
						else
						{
							removed = true;
						}
						this.arrayAccess.pop();
					},
					this
				);
				// TODO : signals
				this.listStore.set(updated);
			}
		}
		var iterated = compileRef(actionGraph["in"], nodes).val;
		var localNodes = _.clone(nodes);
		
		var arrayAccess = new ArrayAccess(iterated);
		// TODO gerer destruct
		localNodes[actionGraph["update"]] = arrayAccess;
		var indexStore = null;
		if("index" in actionGraph)
		{
			indexStore = new SubStore("int")
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
		
		if("filter" in actionGraph)
		{
			return new CondUpdate(iterated, arrayAccess, indexStore, action, makeExpr(actionGraph.filter, localNodes));
		}

		return new Update(iterated, arrayAccess, indexStore, action);
	}
	
	if("signal" in actionGraph)
	{
		function SignalNode(node, signal, params)
		{
			this.node = node;
			this.nodeSignal = signal;
			this.params = params;
			
			this.signal = function()
			{
				// TODO ameliorer params.params
				this.node.signal(this.nodeSignal, this.params, [], true);
			}
		}
		var paramsGraph = actionGraph.params;
		var compiledParams = _.map(paramsGraph, function(param){return makeExpr(param, nodes);});
		if("var" in actionGraph)
		{
			return new SignalNode(compileRef(actionGraph["var"], nodes).val, actionGraph.signal, compiledParams)
		}
		function SignalAction(action, params)
		{
			this.action = action;
			this.params = params;
			
			this.signal = function()
			{
				// TODO ameliorer params.params
				this.action.signal(this.params, [], {root : this.node, path : []});
			}
		}
		return new SignalAction(compileRef(actionGraph["signal"], nodes).val, compiledParams);
	}
	
	// Les generateurs (les <-) sont transformes en Store, 
	// qui sont alimentes au debut de l'actionGraph
	var generators = [];
	function makeGenerators(val)
	{
		if(_.isObject(val) && ("msg" in val))
		{
			var producerGraph = _.cloneDeep(val);
			producerGraph.type = producerGraph.msg;
			var msgProducer = makeNode(producerGraph, nodes, {});
			var msgStore = new SubStore(msgProducer.getType());
			msgProducer.slots = [msgStore];
			var producerName = "__msgProducer" + msgIndex;
			nodes[producerName] = msgProducer;
			generators.push(producerName);

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
	if(generators.length > 0)
	{
		actionGraph = concatActions(generators, actionGraph);
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
	
	// TODO action avec parametres
	if("inParams" in actionGraph)
	{
		//TODO manage multiple params
		// var inParam = actionGraph.inParams[0];
		// var paramId = inParam[0];
		// nodes[paramId] = new ActionParam(inParam[1]);
		//actionGraph = concatActions([paramId], actionGraph);
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
					var templates = getTypeParams(type);
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
		var cloneIfRef =  (type == "Send");
		param = makeExpr(paramGraph, localNodes, {}, cloneIfRef);
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
			if(type == "Seq" && slots.length == 1)
			{
				return slots[0];
			}
		} else
		{
			// Envoi d'un signal a un node
			if(actionGraph.type in localNodes)
			{
				if(param != null)
				{
					slots = compileSlots([actionGraph.type], localNodes, connections);	
					type = "Signal";
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

function typeParamToString(param)
{
	var baseType = getBaseType(param);
	var typeParams = getTypeParams(param);
	if(typeParams.length == 0)
	{
		return "#" + baseType;
	}
	return "#" + baseType + _.map(typeParams, typeParamToString);
}

function makeConcreteName(name, typeParamsInstances)
{
	return name + _.map(typeParamsInstances, function(param)
	{
		return typeParamToString(param[1]);
	});
}

function makeStruct(structGraph, inheritedFields, superClassName, isGroup, typeParamsInstances)
{
	var name = structGraph.name;
	var type = name;
	var concreteName = name;
	if(typeParamsInstances)
	{
		var typeParams = _.map(typeParamsInstances, function(instance){return instance[1];});
		type = mt(name, typeParams);
		concreteName = makeConcreteName(name, typeParamsInstances);
	}

	var fieldsGraph = inheritedFields.concat(structGraph.fields ? structGraph.fields : []);
	
	if(isGroup)
	{
		fieldsGraph.unshift
		(
			[
			   "children",
			   {
				  "base": "list",
				  "params": [
					 superClassName
				  ]
			   }
			]
		);
	}
	var fieldsOperators = {};
	var concreteFieldsGraph = fieldsGraph;
	for(var i = 0; i < fieldsGraph.length; i++)
	{
		var fieldType = fieldsGraph[i][1];
		if(typeParamsInstances)
		{
			_.each(typeParamsInstances, function(instance){
				if(instance[0] == fieldType)
				{
					fieldType = instance[1];
					concreteFieldsGraph[i][1] = fieldType;
				}
			})
		}
		if(_.isPlainObject(fieldType))
		{
			var baseType = getBaseType(fieldType);
			if(baseType in library.nodes)
			{
				var instance = library.nodes[baseType].getInstance(getTypeParams(fieldType));
				if("operators" in instance)
				{
					var fieldName = fieldsGraph[i][0];
					fieldsOperators[fieldName] = instance.operators;
				}
			}
		}
		else
		{
			if(fieldType in library.nodes && "operators" in library.nodes[fieldType])
			{
				var fieldName = fieldsGraph[i][0];
				fieldsOperators[fieldName] = library.nodes[fieldType].operators;
			}
		}
	}
	
	function makeBuilder(structGraph)
	{
		function builder(fields) 
		{	
			this.fields = {
				__type : type
			};
			this.operators = library.nodes[concreteName].operators;
			this.signals = {};
			for(var i = 0; i < fieldsGraph.length; i++)
			{
				var field = fieldsGraph[i];
				if(_.isArray(field))
				{
					var fieldName = field[0];
					var fieldVal = fields[fieldName];
					if(fieldVal == undefined)
					{
						error("Field " + fieldName + " not found in parameters of " + concreteName + " constructor");
					}
					this.fields[fieldName] = fieldVal;
				} else if("signal" in field)
				{
					function StructSignal() {
						this.slots = [];
						this.signal = function(rootAndPath)
						{
							for(var i = 0; i < this.slots.length; i++)
							{
								this.slots[i].signal(rootAndPath);
							}
						};
					}
					var signalGraph = field;
					// node.operators.signals[signalGraph.signal] = {};
					if(!("__signals" in this.fields))
					{
						this.fields.__signals = {};
					}
					this.signals[signalGraph.signal] = [];
					this.fields.__signals[signalGraph.signal] = [];
				}
			};
			this.get = function()
			{
				return _.mapValues(this.fields, function(field, key){
					// TODO : ameliorer
					return ((key == "__type") || (key == "__signals")) ? field :  field.get();
				});
				//return this.fields;
			};	
			this.getPath = function(path)
			{
				if(path.length == 1)
				{
					// return struct[path[0]].get();
					return this.fields[path[0]].get();
				}
				else
				{
					var subPath = path.slice(0);
					var key = subPath.shift();
					return this.fields[key].getPath(subPath);
				}
			};	
			this.update = function(val, ticks, parentTick)
			{
				var subTicks = ticks.subs;
				var newSubTicks = {};
				_.each(this.fields, function(field, key){
					// TODO : ameliorer
					if((key != "__type") && (key != "__signals"))
					{
						 var res = field.update(val[key], (subTicks == undefined) ? {tick : parentTick} : subTicks[key], ticks.tick);
						 val[key] = res[0];
						 newSubTicks[key] = res[1];
					}
				});
				return mValTick(val, newSubTicks);
			}
			this.getType = function()
			{
				return type;
			};
			this.addSink = function(sink)
			{
				_.each(this.fields, function(field, key)
				{
					if((key != "__type") && (key != "__signals"))
					{
						field.addSink(sink);
					}
				});				
			};
			this.signal = function(id, params, path)
			{
				this.operators.signal(this.get(), id, params, path, null);
			}
		}

		return builder;
	}

	var node = {};
	if(concreteName in library.nodes)
	{
		node = library.nodes[concreteName];
	} else
	{
		library.nodes[concreteName] = node;
	}
	
	_.merge(node, {
		fields : concreteFieldsGraph,
		builder : makeBuilder(structGraph),
		fieldsOp : fieldsOperators,
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
			update : function(struct, path, tick)
			{
				if(struct == null)
				{
					if(path.length == 1)
					{
						// return struct[path[0]].get();
						return fieldsOperators[path[0]].update(null, tick);
					}
					else
					{
						var subPath = path.slice(0);
						var key = subPath.shift();
						return fieldsOperators[key].update(null, subPath, tick);
					}
				}
			},
			slots : {},
			signal : function(struct, id, params, path, node, callFromSlot)
			{
				var pushedRefs = [];
				// In case of a call from a slot, a push has already been made, we must not push anymore
				// We must push only in the case of descending into a hierarchy.
				// Other solution : add a "__pushed" field in struct, so that it references are not pushed anymore
				if("__refs" in struct && (callFromSlot == undefined))
				// if("__refs" in struct && !("__pushed" in struct))
				{
					_.each(struct.__refs, function(ref, i)
					{
						// ref.pushVal(node.__referencedNodes[i].get());
						//ref.push(node.__referencedNodes[i]);
						ref.push(struct.__referencedNodes[i]);
						pushedRefs.push(ref);
					});
					// struct.__pushed = true;
				}

				if(!path || path.length == 0)
				{
					// this.selfStore.pushVal(struct);
					this.selfStore.push(node);
					// Need this because selfStore is shared between the entire class hierarchy
					this.selfStore.pushOperators(this);
					// Dynamic dispatch
					var slots = library.nodes[struct.__type].operators.slots;
					var slot = slots[id];
					_.each(params, function(param, i)
					{
						slot.inputs[i].push(param);
					});
					slot.action.signal();
					_.each(params, function(param, i)
					{
						slot.inputs[i].pop();
					});
					this.selfStore.popOperators();
					// this.selfStore.popVal();
					this.selfStore.pop();
				}
				else
				{
					

					var subPath = path.slice(0);
					var key = subPath.shift();
					// Dynamic dispatch
					var fieldsOp = library.nodes[struct.__type].fieldsOp;
					node.pushPath([key]);
					fieldsOp[key].signal(struct[key], id, params, subPath, node);
					node.popPath();
				}

				_.each(pushedRefs, function(ref, i)
				{
					ref.pop();
					// delete struct.__pushed;
				});
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
		},
		subClasses : [],
		superClass : superClassName
	});
	
	
	//node.operators.selfStore.signalOperator = node.operators
	// library.nodes[concreteName] = node;
	
	// Why do we need to use the same store.
	// Problem with this code is the type, because operators are only those of the root type
	node.operators.selfStore = superClassName ? library.nodes[superClassName].operators.selfStore : new FuncInput(type);
	// node.operators.selfStore = new SubStore(name);
	
	if(superClassName)
		library.nodes[superClassName].subClasses.push(concreteName);
	
	for(var i = 0; i < fieldsGraph.length; i++)
	{
		var field = fieldsGraph[i];
		if(!_.isArray(field))
		{
			if("slot" in field)
			{
				var slotGraph = field;
				var localNodes = {"self" : node.operators.selfStore};
				var inputs = [];
				_.each(slotGraph.params, function(param)
				{
					var node = new FuncInput(param[1]);
					localNodes[param[0]] = node;
					inputs.push(node);
				});
				slotGraph.params = [["self", concreteName]].concat(slotGraph.params);
				node.operators.slots[field.slot] = {
					action : makeAction(slotGraph.action, localNodes),
					inputs : inputs
				};
			} else
			{
				function StructSignal(id) {
					this.id = id;
					this.selfStore = node.operators.selfStore;
					this.signal = function(rootAndPath)
					{
						var node = this.selfStore.get();
						var slots = node.__signals[this.id];
						// _.each(node.__signals.__refs, function(ref, i)
						// {
						// 	// ref.pushVal(node.__referencedNodes[i].get());
						// 	//ref.push(node.__referencedNodes[i]);
						// 	ref.push(node.__signals.__referencedNodes[i]);
						// })
						for(var i = 0; i < slots.length; i++)
						{
							// slots[i].signal(rootAndPath);
							slots[i].signal(null);
						}
						// _.each(node.__signals.__refs, function(ref, i)
						// {
						// 	// ref.popVal();
						// 	ref.pop();
						// })
					};
				}
				var signalGraph = field;
				var inputs = [];
				var localNodes = {"self" : node.operators.selfStore};
				_.each(signalGraph.params, function(param)
				{
					var node = new SubStore(param[1]);
					localNodes[param[0]] = node;
					inputs.push(node);
				});
				// node.operators.signals[signalGraph.signal] = {};
				node.operators.slots[signalGraph.signal] =  {
					action : new StructSignal(signalGraph.signal),
					inputs : inputs,
					localNodes : localNodes
				};
			}
		}
	}
}

function StructTemplate(classGraph, tp, superClassName, inheritedFields)
{
	this.typeParams = tp;
	var typeParamsToParamsPaths = getTypeParamsToParamsPaths(this.typeParams, classGraph.fields);
	this.classGraph = classGraph;
	this.inheritedFields = inheritedFields;

	// TODO uniquement si il y a des templates dans la spec
	this.guessTypeParams = function(params)
	{
		// Guess templates types from params types
		var paramsTypes = _.map(params, function(param){return param.getType();});
		return _.map(typeParamsToParamsPaths, function(paths)
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
					console.log(err)
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
	
	this.superClassName = superClassName;
	this.cache = {};
	this.getInstance = function(typeParams)
	{
		var key = templatesToKey(typeParams);
		if(key in this.cache)
			return this.cache[key];
		
		if(this.typeParams.length != typeParams.length)
		{
			error("Not the same number for generic parameters between declaration and instance of " + classGraph.name);
		}
		var typeParamsInstances = _.zip(this.typeParams, typeParams);
		var superConcreteName = undefined;
		if(superClassName)
		{
			superConcreteName = makeConcreteName(superClassName, typeParamsInstances);
			if(!(superConcreteName in library.nodes))
			{
				library.nodes[superConcreteName] = library.nodes[superClassName].getInstance(typeParams);
			}
		}
		var concreteName = makeConcreteName(this.classGraph.name, typeParamsInstances);
		var instance = {};
		this.cache[key] = instance;
		library.nodes[concreteName] = instance;
		makeStruct(this.classGraph, this.inheritedFields, superConcreteName, false, typeParamsInstances);
		
		return instance;
	}
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
	// this.pushedValues = _.range(this.params.length).map(function()
	// {
		// return [];
	// });
	this.needsNodes = true;

	this.func = function(paramNodes) 
	{	
		_.each(paramNodes, function(node, i)
		{
			// this.inputNodes[i].pushVal(node);
			this.inputNodes[i].push(node);
		}, this);
		
		var result = this.expr.get(true);
		
		_.each(paramNodes, function(node, i)
		{
			// this.inputNodes[i].popVal();
			this.inputNodes[i].pop();
		}, this);
		
		return result;
	};

	this.funcRef = function(paramNodes) 
	{	
		_.each(paramNodes, function(node, i)
		{
			this.inputNodes[i].push(node);
		}, this);
		
		var result = this.expr.get(true);
		
		if(!("__referencedNodes" in result))
		{
			result.__referencedNodes = paramNodes.slice(0);
			result.__refs = this.__refs.slice(0);
		} else
		{
			result.__referencedNodes = paramNodes.concat(result.__referencedNodes);
			result.__refs = this.__refs.concat(result.__refs);
		}

		_.each(paramNodes, function(node, i)
		{
			this.inputNodes[i].pop();
		}, this);
		
		return result;
	};	

	this.update = function(val, ticks, parentTick, paramNodes) 
	{	
		var max = 0;
		_.each(paramNodes, function(node)
		{
			var minMax = node.getMinMaxTick([]);
			max = Math.max(max, minMax[1]);
		});

		if(ticks.tick >= max)
		{
			return mValTick(val, ticks);
		}

		_.each(paramNodes, function(node, i)
		{
			this.inputNodes[i].push(node);
		}, this);
		
		var res = this.expr.update(val, ticks, parentTick);
		var val = res[0];
		
		if(!("__referencedNodes" in val))
		{
			val.__referencedNodes = paramNodes.slice(0);
			val.__refs = this.__refs.slice(0);
		} else
		{
			val.__referencedNodes = paramNodes.concat(val.__referencedNodes);
			val.__refs = this.__refs.concat(val.__refs);
		}

		_.each(paramNodes, function(node, i)
		{
			this.inputNodes[i].pop();
		}, this);
		
		return [val, res[1]];
	};
}

function getTemplateFromPath(type, path)
{
	if(!(_.isPlainObject(type) && ("params" in type)))
	{
		throw "Type is not generic, cannot deduce param types"
	}
	if(path.length == 1)
		return type.params[path[0]];
	var subPath = path.slice(0);
	var index = subPath.shift();	
	return getTemplateFromPath(type.params[index], subPath);
}

function getParamsDeclTypes(paramsDecl)
{
	return _.map(paramsDecl, function(decl){return decl[1];});
}

function getTypeParamsToParamsPaths(typeParams, inputs)
{
	// Liste associant a chaque template les chemins dans les parametres qui l'utilisent
	// Sert pour deviner les templates a partir des types des parametres
	var typeParamsToParamsPaths = [];
	
	var templates = typeParams;
	// Initialise as a list of empty list
	typeParamsToParamsPaths = _.map(Array(templates.length), function(){return [];});
	
	// For all parameters types, recursively add paths to leaf types (templates), with leaf types at the end
	// e.g. : [list<list<T>>, pair<F,G>, int] -> [[0, 0, 0, T], [1, 0, F], [1, 1, G], [2, int]]
	function getTypePaths(types, parentPath)
	{
		return _.reduce
		(
			types, 
			function(paths, type, index)
			{
				var templates = getTypeParams(type);
				if(templates.length == 0)
					return paths.concat([parentPath.concat([index, type])]);
				return paths.concat(getTypePaths(templates, parentPath.concat([index])));
			},
			[]
		);
	}
	var paramsTypePaths = getTypePaths(getParamsDeclTypes(inputs), []);
	
	// map template name -> index in templates array
	var templateNameToIndex = _.zipObject(templates, _.range(templates.length));
	// For each path, if leaf type is a template, adds the path to the templates param paths array
	_.each(paramsTypePaths, function(typePath)
	{
		var last = _.last(typePath);
		if(last in templateNameToIndex)
		{
			// The leaf type is a template, use the map to find the index, and adds the path without leaf type
			typeParamsToParamsPaths[templateNameToIndex[last]].push(_.first(typePath, typePath.length - 1));
		}
	});

	return typeParamsToParamsPaths;
}

function FunctionTemplate(classGraph)
{
	typeParamsToParamsPaths = getTypeParamsToParamsPaths(classGraph.typeParams, classGraph["in"]);

	// TODO uniquement si il y a des templates dans la spec
	this.guessTypeParams = function(params)
	{
		// Guess templates types from params types
		var paramsTypes = _.map(params, function(param){return param.getType();});
		return _.map(typeParamsToParamsPaths, function(paths)
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
					console.log(err)
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
		// TODO : specifier dans code
		if("ref" in classGraph)
		{
			instance.hasRef = true;
		}

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
		var templateNameToInstances = _.zipObject(classGraph.typeParams, templates);	
		function instantiateTemplates(type, templateNameToInstances)
		{
			if(_.isPlainObject(type))
			{
				return mt(getBaseType(type), _.map(getTypeParams(type), function(template){return instantiateTemplates(template, templateNameToInstances);}));
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
			var node = new FuncInput(type);
			instance.inputNodes.push(node);
			instance.internalNodes[paramAndType[0]] = node;
		});
		
		var nodesGraph = classGraph["nodes"];
		_.each(nodesGraph, function(node)
		{
			// TODO connections ?
			instance.internalNodes[getId(node)] = makeNode(node, instance.internalNodes, {});
		});
		
		var genericTypeParams = {};
		_.each(classGraph.typeParams, function(param, index)
		{
			genericTypeParams[param] = templates[index];
		});
		instance.expr = makeExpr(classGraph["out"].val, instance.internalNodes, genericTypeParams);
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
	this.condition.addSink(this);

	this.dirty = function()
	{
		if(this.condition.get())
		{
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
	connections = [];
	connectionsAllowed = false;
	//return;
	
	if("structsAndFuncs" in graph)
	{
		var structsAndfuncsGraph = graph.structsAndFuncs;
		for(var i = 0; i < structsAndfuncsGraph.length; i++)
		{
			connectionSet = false;
			if("func" in structsAndfuncsGraph[i])
			{
				var funcGraph = structsAndfuncsGraph[i].func;
				if("typeParams" in funcGraph)
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
						var func = new FunctionInstance(funcGraph);
						library.functions[funcGraph.id] = func;
						var funcNode = funcToNodeSpec(func);
						library.nodes[funcGraph.id] = funcNode;

						// TODO : specifier dans code
						if("ref" in funcGraph)
						{
							func.hasRef = true;
						}

						if("type" in funcGraph && funcGraph.type != null)
						{
							func.type = funcGraph.type;
						}
										
						func.internalNodes = {};
						func.inputNodes = [];
						
						_.each(funcGraph["in"], function(paramAndType)
						{
							var type = paramAndType[1];
							var node = new FuncInput(type);
							node.func = funcGraph.id;
							func.inputNodes.push(node);
							func.internalNodes[paramAndType[0]] = node;
						});
						
					}
					
					var beforeConnectionsLength = connections.length;
					
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

					// if(connections.length > beforeConnectionsLength)
					if(func.hasRef)
					{
						func.hasConnections = true;
						func.signalsList = [];
						var newConnections = _.tail(connections, beforeConnectionsLength);
						var refNodes = {};
						func.__refs = [];
						var inputGraph = funcGraph["in"];
						_.each(func.inputNodes, function(node, i)
						{
							// var nodeRef = new FuncInput(node.getType());
							var nodeRef = node;
							func.__refs.push(nodeRef);
							refNodes[inputGraph[i][0]] = nodeRef;
						})
						_.each(newConnections, function(nodeConnection)
						{
							var signals = nodeConnection.signals;
							signals.__refs = func.__refs;
							func.signalsList.push(signals);
							var type = nodeConnection.type;
							var slots = library.nodes[type].operators.slots;
							_.each(nodeConnection.connections, function(connection)
							{
								var mergedNodes = _.clone(nodes);
								_.merge(mergedNodes, slots[connection.signal].localNodes);
								_.merge(mergedNodes, refNodes);
								signals[connection.signal].push(makeAction(connection.action, mergedNodes));
							});
						});
						connections = _.head(connections, beforeConnectionsLength);
					}
				}
			}
			else
			{
				if("struct" in structsAndfuncsGraph[i])
				{
					var structGraph = structsAndfuncsGraph[i].struct;
					if("typeParams" in structGraph)
					{
						function makeGenericStruct(structGraph, typeParams, superClassName, inheritedFields)
						{
							library.nodes[structGraph.name] = new StructTemplate(structGraph, typeParams, superClassName, inheritedFields);
							var subs = structGraph.subs
							if(subs)
							{
								for(var i = 0; i < subs.length; i++)
								{
									var subStructGraph = subs[i];
									makeGenericStruct(subStructGraph, typeParams, structGraph.name, structGraph.fields);
								}
							}
						}

						makeGenericStruct(structGraph, structGraph.typeParams, undefined, []);
					}
					else
					{
						makeStruct(structGraph, []);

						function makeSubs(subs, inheritedFields, superClassName, isGroup)
						{
							if(subs)
							{
								for(var i = 0; i < subs.length; i++)
								{
									var subStructGraph = subs[i];
									makeStruct(subStructGraph, inheritedFields, superClassName, isGroup);
									makeSubs(subStructGraph.subs, inheritedFields.concat(subStructGraph.fields), subStructGraph.name, false);
								}
							}
						}
						
						makeSubs(structGraph.subs, structGraph.fields, structGraph.name, false);
						makeSubs(structGraph.groups, structGraph.fields, structGraph.name, true);
						makeSubs(structGraph.leaves, structGraph.fields, structGraph.name, false);
					}
				} else // tree
				{
					var treeGraph = structsAndfuncsGraph[i].tree;
					makeStruct(treeGraph, []);
				} 
			}
		}
	}
	
	connectionsAllowed = true;
	
	var actionsGraph = graph.actions;
    for(var i = 0; i < actionsGraph.length; i++)
	{
		var actionGraph = actionsGraph[i];
		var id = getId(actionGraph);
		if(id.length == 2) // Struct slot
		{
			var node = library.nodes[id[0]];
			
			var slotGraph = _.clone(actionGraph);
			var localNodes = {"self" : node.operators.selfStore};
			var inputs = [];
			if(slotGraph.inParams)
			{
				_.each(slotGraph.inParams, function(param)
				{
					var node = new SubStore(param[1]);
					localNodes[param[0]] = node;
					inputs.push(node);
				});
				delete slotGraph.inParams;
			}
			//slotGraph.params = [["self", structGraph.name]].concat(slotGraph.params);
			var slotName = id[1];
			var action = makeAction(slotGraph, localNodes);
			var slot = {
				action : action,
				inputs : inputs
			};
			node.operators.slots[slotName] = slot;
			function addSlotToSubClasses(slot, superClass)
			{
				var subClasses = superClass.subClasses;
				_.each(subClasses, function(subClassName)
				{
					var subClass = library.nodes[subClassName];
					subClass.operators.slots[slotName] = slot;
					addSlotToSubClasses(slot, subClass);
				});
			}
			addSlotToSubClasses(slot, node);
		} else // global action
		{
			var inputs = [];
			if(actionGraph.inParams)
			{
				inputs = _.map(actionGraph.inParams, function(param)
				{
					return new SubStore(param[1]);
				});
			}
			
			function ActionParams(action, inputs)
			{
				this.action = action;
				this.inputs = inputs;
				
				this.signal = function(params)
				{
					_.each(params, function(param, i)
					{
						this.inputs[i].set(param.get());
					}, this);
					this.action.signal();
				}
			}
			
			nodes[id[0]] = new ActionParams(null, inputs);
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
			var id = getId(nodeGraph);
			//try
			{
				connectionSet = false;
				nodes[id] = makeNode(nodeGraph, nodes, connectionsGraph);
			}
			// catch(err) // For release version only
			// {
				// console.log(err);
				// error("Cannot build node " + id);
			// }
			// if("connections" in nodeGraph)
			// {
				
				// connectionsGraph.push({
					// source : nodes[id],
					// actions : 
				// })
			// }
		}
    }
	
	for(var i = 0; i < actionsGraph.length; i++)
	{
		var actionGraph = actionsGraph[i];
		var id = getId(actionGraph);
		if(id.length == 1)
		{
			var localNodes = _.clone(nodes);
			var inputs = nodes[id[0]].inputs;
			_.each(inputs, function(input, i)
			{
				localNodes[actionGraph.inParams[i][0]] = input;
			});

			nodes[id[0]].action = makeAction(actionGraph, localNodes);
		}
    }
	
	var eventsGraph = graph.events;
	for(var i = 0; i < eventsGraph.length; i++)
	{
		var eventGraph = eventsGraph[i];
		var event = makeEvent(eventGraph, nodes, connectionsGraph);
    }
	
	for(var i = 0; i < graphNodes.length; i++)
	{
		var nodeRow = graphNodes[i];
		for(var j = 0; j < nodeRow.length; j++)
		{
			var nodeGraph = nodeRow[j];
			var id = getId(nodeGraph);
			
			if("connections" in nodeGraph)
			{
				var node = nodes[id];
				var signals = node.get().__signals;
				var type = node.getType();
				var slots = library.nodes[type].operators.slots;
				_.each(nodeGraph.connections, function(connection)
				{
					var mergedNodes = _.clone(nodes);
					_.merge(mergedNodes, slots[connection.signal].localNodes);
					signals[connection.signal].push(makeAction(connection.action, mergedNodes));
				});
			}
		}
    }
	
	_.each(connections, function(nodeConnection)
	{
		var signals = nodeConnection.signals;
		var type = nodeConnection.type;
		var slots = library.nodes[type].operators.slots;
		_.each(nodeConnection.connections, function(connection)
		{
			var mergedNodes = _.clone(nodes);
			_.merge(mergedNodes, slots[connection.signal].localNodes);
			signals[connection.signal].push(makeAction(connection.action, mergedNodes));
		});
	});
	
	return nodes;
}
