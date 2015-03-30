var library;

function error(str)
{
	throw "Compilation error : " + str;
}

function setEngineLodash(l)
{
	_=l;
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

var src = "";
var currentVarIndex = -1;
function newVar(val)
{
	currentVarIndex++;
	return "var __v" + currentVarIndex.toString() + " = " + val + ";\n";
}

function getVar()
{
	return "__v" + currentVarIndex.toString();
}

function pathToString(path)
{
	return "[" + _.map(path, function(step){return "\"" + step + "\"";}).join(", ") + "]";
}

function List(val)
{
	this.list = val;

	this.needsNodes =  _.any(this.list, function(elt)
	{
		return elt.needsNodes;
	})

	this.get = function()
    {
		return this.list.map(function(item)
		{
			return item.get();
		});
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


function FuncInput(type) 
{
	this.stack = [];
	this.type = type;
	
	// DEBUG
	this.id = storeId;
	storeId++;
	
	this.get = function()
	{
		// TODO error management
		return this.stack[this.stack.length - 1];
	};

	this.pushVal = function(val)
	{
		this.stack.push(val);
	};
	
	this.popVal = function()
	{
		this.stack.pop();
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

function setPath(struct, path, val)
{
	if(path.length == 1)
	{
		struct[path[0]] = val;
	}
	else
	{
		var subPath = path.slice(0);
		var key = subPath.shift();
		setPath(struct[key], subPath, val);
	}
}

function Store(v, type) 
{
	this.val = v;
	this.type = type;

	this.sinks = [];
	
	// DEBUG
	this.id = storeId;
	storeId++;

	this.needsNodes = false;

	this.get = function()
	{
		return this.val;
	};

	this.set = function(val)
	{
		this.val = val;
		this.dirty();
	};
	
	this.setPath = function(val, path)
	{
		if(path.length == 0)
		{
			this.val = val;
		}
		else
		{
			setPath(this.val, path, val);
		}
		this.dirty();
	};

	this.dirty = function()
	{
		_.each(this.sinks, function(sink)
		{
			sink.dirty()
		});
	}

	this.addSink = function(sink)
	{
		this.sinks.push(sink);
	};
	
	this.getType = function()
	{
		return this.type;
	}
}

var lambdaIndex = 0;
function Closure(expr, nodes, genericTypeParams) 
{
	this.nodes = nodes;
	
	var localNodes = {};
	var paramSpec = [];
	var paramStores = _.map(expr.params, function(param, index)
	{
		var node = new Store(param.type);
		localNodes[param.id] = node;
		paramSpec.push(["param" + index.toString(), param.type]);
		return node;
	}, this);
	
	var localNodes = _.merge(localNodes, nodes);
	var builtExpr = makeExpr(expr.closure, localNodes, genericTypeParams);

	var needsNodes = false; // If the expression is a function that needs references (for making connections)
	if(builtExpr.needsNodes)
	{
		needsNodes = true;
	}
	
	this.funcSpec = {
		params : paramSpec,
		needsNodes : needsNodes,
		func : function(params)	{	
			_.each(params, function(param, index)
			{
				paramStores[index].pushVal(param);
			});
			return builtExpr.get();
			_.each(params, function(param, index)
			{
				paramStores[index].popVal();
			});
		},
		funcRef : function(params)	{	
			_.each(params, function(param, index)
			{
				paramStores[index].push(param);
			});
			return builtExpr.get();
			_.each(params, function(param, index)
			{
				paramStores[index].pop();
			});
		},
		type : builtExpr.getType()
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

	this.get = function()
	{
		if(this.path.length == 0)
		{
			return this.val;
		}
		return getPath(this.val, this.path);
	};
}


function Cache(node) 
{
	this.node = node;
	this.isDirty = true;

	this.get = function()
	{
		if(this.isDirty)
		{
			// this.val = this.node.get();
			this.val = this.node.get();
			this.isDirty = false;
		}
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

function StoreFunctionTemplate(t, name) 
{
	this.template = t;
	this.func = null;
	this.id = storeId++;
	this.name = name;
	//this.type = null;

	this.getVal = function()
	{
		return this.name;
	};
	
	this.getNode = function()
	{
		return this.name;
	};

	this.getTemplate = function()
	{
		return this.template;
	};
	
	this.setTemplateParams = function(params)
	{
		this.func = this.template.build(params);		
	};

	this.getBeforeStr = function()
	{
		return "";
	}
	
	this.addSink = function(sink)
	{
		// TODO : y'en a besoin ?
	};
	
}

function Affectation(val, paths)
{
	this.val = val;
	this.paths = paths;
	this.affect = function(obj)
	{
		var val = this.val.get();
		for(var j = 0; j < this.paths.length; j++)
		{
			var path = this.paths[j];
			setPath(obj, path, val);
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

function Merge(what, matches, type)
{
	this.what = what;
	var whatType = type;
	
	this.matches = matches;
	
	// Needs nodes if any of the affection value needs nodes
	this.needsNodes = _.any(this.matches, function(affect)
	{
		return affect.val.needsNodes;
	});	

	this.get = function()
	{
		//var obj = this.what.get();
		// TODO methode clone sur les struct ?
		var newObj = _.cloneDeep(this.what.get());
		_.forEach(this.matches, function(affect)
		{
			affect.affect(newObj);			
		}, this);			
		return newObj;
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

var compIndex = 0;

function ComprehensionNode(nodeGraph, externNodes)
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
	this.compIndex = compIndex;
	var beforeStr = "";
	var arraysStr = "[";
	var indicesStr = "[";
	var varPostfix = "";
	var varIndex = 0;
	var arrayAccessNames = [];
	var indicesNames = [];
	_.forEach(iterators, function(iterator, index)
	{
		varPostfix = compIndex.toString() + "_" + varIndex.toString();
		varIndex++;
		var expr = makeExpr(iterator["in"], externNodes);
		
		arraysStr += ((index > 0) ? ", " : "") + expr.getNode();
		var inputType = expr.getType();
		if(getBaseType(inputType) != "list")
		{
			error("Comprehension input parameter " + iterator["in"] + " is not a list : " + inputType);
		}
		var inputTemplateType = getTypeParams(inputType)[0];
	
		var inputGraph = iterator["for"];
		
		beforeStr += expr.getBeforeStr();
		var arrayAccessName = "aa" + varPostfix;
		arrayAccessNames.push(arrayAccessName);
		if(_.isString(inputGraph))
		{
			this.nodes[inputGraph] = new Var(arrayAccessName + ".get()", arrayAccessName, inputTemplateType);
		} else // destruct
		{
			var destructGraph = inputGraph.destruct;
			destructInputs[index] = _.map(destructGraph, function(destruct, destructIndex)
			{
				return new ArrayAccess(inputs[index], destructIndex);
			});
			this.nodes = _(destructGraph)
				.zipObject(destructInputs[index])
				.value();
		}
		if("index" in iterator)
		{
			// TODO  Path ?
			// TODO param nodes = union(this.nodes, externNodes)
			var indexName = "index" + varPostfix;
			comprehensionIndices[index] = new Var(indexName + ".get()", indexName, "int");
			this.nodes[iterator["index"]] = comprehensionIndices[index];
			indicesStr += ((index > 0) ? ", " : "") + "true";
			indicesNames.push(indexName);
		} else
		{
			indicesStr += ((index > 0) ? ", " : "") + "false";
		}		
	}, this);
	arraysStr += "]"
	indicesStr += "]"
	var mergedNodes = _.clone(externNodes)
	_.merge(mergedNodes, this.nodes);
	compIndex++;
	if("when" in nodeGraph)
	{
		// TODO  Path ?
		// TODO param nodes = union(this.nodes, externNodes)
		var when = makeExpr(nodeGraph["when"], mergedNodes);
	};
	
	var expr = makeExpr(nodeGraph["comp"], mergedNodes);

	var funcRef = false; // If the expression is a function that needs references (for making connections)
	this.needsNodes = false;
	this.addsRefs = false;
	if(expr.needsNodes)
	{
		funcRef = true;
		this.needsNodes = true;
		this.addsRefs = true;
	} 

	this.getBeforeStr = function()
	{
		return "";
	}

	this.getNode = function()
	{
		var str = "new Comprehension(function(" + arrayAccessNames.join(", ");
		if(indicesNames.length > 0)
		{
			str += ", " + indicesNames.join(", ");
		}
		str += "){\n" + expr.getBeforeStr() + "return " + expr.getVal() + ";\n},\n";
		str += indicesStr + ",\n" + arraysStr + ",\n" + funcRef.toString() + ", ";
		if(when)
		{
			str += "function(" + arrayAccessNames.join(", ");
			if(indicesNames.length > 0)
			{
				str += ", " + indicesNames.join(", ");
			}
			str += "){\n" + when.getBeforeStr() + "return " + when.getVal() + ";\n}\n";
		}
		else
		{
			str += "undefined";	
		}
		str += ")";
		return str;
	}

	this.getVal = function()
	{
		return "(" + this.getNode() 
			+ ").get()";
	}

	this.getType = function()
	{
		return mt("list", [expr.getType()]);
	}
}

function SimpleArrayAccess(array, index)
{
	this.array = array;
	this.index = index;
	
	this.get = function()
	{
		return this.array.get()[this.index];
	}	

	this.getPath = function(path)
	{
		return getPath(this.array.get()[this.index], path);
	}

	this.set = function(val)
	{
		this.array.setPath(val, [this.index]);
	}

	this.setPath = function(val, path)
	{
		this.array.setPath(val, [this.index].concat(path));
	}

	this.dirty = function(path)
	{
		this.array.dirty([this.index].concat(path));
	}
}

function Comprehension(_expr, _comprehensionIndices, arrays, _funcRef, _when)
{
	this.arrays = arrays;
	var expr = _expr;
	var comprehensionIndices = _comprehensionIndices;
	var funcRef = _funcRef;
	var when = _when;

	this.outputList = [];
	this.get = function(parentRefs)
	{
		var nbArrays = this.arrays.length;
		var arrayVals = _.map(this.arrays, function(array, index)
		{
			var val = array.get();
			return val;
		});
		
		// Cartesian product of indices
		var indicesArray = cartesianProductOf(_.map(arrayVals, function(array)
		{
			return _.range(array.length);
		}));

		if(when)
		{
			this.outputList = [];
			_.each(indicesArray, function(indices, i)
			{
				if(nbArrays == 1)
				{
					if(comprehensionIndices[0] != undefined)
					{
						var cond = when(new SimpleArrayAccess(this.arrays[0], indices[0]), new Store(indices[0]));
					}
					else
					{
						var cond = when(new SimpleArrayAccess(this.arrays[0], indices[0]));
					}
				} else
				{
					if(comprehensionIndices[0] != undefined)
					{
						if(comprehensionIndices[1] != undefined)
						{
							var cond = when(new SimpleArrayAccess(this.arrays[0], indices[0]), new SimpleArrayAccess(this.arrays[1], indices[1]), new Store(indices[0]), new Store(indices[1]));
						}
						else
						{
							var cond = when(new SimpleArrayAccess(this.arrays[0], indices[0]), new SimpleArrayAccess(this.arrays[1], indices[1]), new Store(indices[0]));
						}
					}
					else
					{
						if(comprehensionIndices[1] != undefined)
						{
							var cond = when(new SimpleArrayAccess(this.arrays[0], indices[0]), new SimpleArrayAccess(this.arrays[1], indices[1]), new Store(indices[1]));
						}
						else
						{
							var cond = when(new SimpleArrayAccess(this.arrays[0], indices[0]), new SimpleArrayAccess(this.arrays[1], indices[1]));
						}
					}						
				}
				if(cond)
				{
					// var ret = expr.get();
					if(nbArrays == 1)
					{
						if(comprehensionIndices[0] != undefined)
						{
							var ret = expr(new SimpleArrayAccess(this.arrays[0], indices[0]), new Store(indices[0]));
						}
						else
						{
							var ret = expr(new SimpleArrayAccess(this.arrays[0], indices[0]));
						}
					} else
					{
						if(comprehensionIndices[0] != undefined)
						{
							if(comprehensionIndices[1] != undefined)
							{
								var ret = expr(new SimpleArrayAccess(this.arrays[0], indices[0]), new SimpleArrayAccess(this.arrays[1], indices[1]), new Store(indices[0]), new Store(indices[1]));
							}
							else
							{
								var ret = expr(new SimpleArrayAccess(this.arrays[0], indices[0]), new SimpleArrayAccess(this.arrays[1], indices[1]), new Store(indices[0]));
							}
						}
						else
						{
							if(comprehensionIndices[1] != undefined)
							{
								var ret = expr(new SimpleArrayAccess(this.arrays[0], indices[0]), new SimpleArrayAccess(this.arrays[1], indices[1]), new Store(indices[1]));
							}
							else
							{
								var ret = expr(new SimpleArrayAccess(this.arrays[0], indices[0]), new SimpleArrayAccess(this.arrays[1], indices[1]));
							}
						}						
					}
					this.outputList.push(ret);
				}
			}, this);
		}
		else
		{
			this.outputList = _.map(indicesArray, function(indices, i) 
			{
				if(funcRef)
				{
					if(nbArrays == 1)
					{
						var ret = expr(new SimpleArrayAccess(this.arrays[0], indices[0]));
					} else
					{
						var ret = expr(new SimpleArrayAccess(this.arrays[0], indices[0]), new SimpleArrayAccess(this.arrays[1], indices[1]));
					}
				}
				else
				{
					if(nbArrays == 1)
					{
						if(comprehensionIndices[0] != undefined)
						{
							var ret = expr(new SimpleArrayAccess(this.arrays[0], indices[0]), new Store(indices[0]));
						}
						else
						{
							var ret = expr(new SimpleArrayAccess(this.arrays[0], indices[0]));
						}
					} else
					{
						var ret = expr(new SimpleArrayAccess(this.arrays[0], indices[0]), new SimpleArrayAccess(this.arrays[1], indices[1]));
					}
				}
				return ret;
			}, this);
		}

		return this.outputList;
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

function getNode(name, nodes)
{
	var node = nodes[name];
	if(node == undefined)
	{
		throw "Var " + name + " not found!";
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

function StructAccess(node, path, type) {
	this.id = storeId++;
    this.node = node;
    this.path = path;
    this.type = type;

	this.get = function()
	{
		return getPath(this.node.get(), this.path);
	};
	
	this.set = function(val)
	{
		this.node.setPath(val, this.path);
	};

	this.setPath = function(val, path)
	{
		this.node.setPath(val, this.path.concat(path));
	};

	this.getPath = function(path)
	{
		return this.node.getPath(this.path.concat(path));		
	}
	
	this.dirty = function(path)
	{
		this.node.dirty(this.path.concat(path));
	}

	this.getType = function()
	{
		return this.type;
	}
	
	this.addSink = function(sink)
	{
		this.node.addSink(sink);
	};
}

function ArrayAccess(node) {
    this.node = node;

	this.id = storeId;
	storeId++;

	this.stack = [];
	this.savedStack = [];
	this.cacheStack = [];
	this.nodeStack = [];

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

	this.getPath = function(path)
	{		
		var val = this.get();
		return getPath(val, path);
	}

	this.push = function(index)
	{
		this.stack.push(index);
	}

	this.pop = function()
	{
		this.stack.pop();
	}

	this.dirty = function(path)
	{
		var index = this.stack.pop();
		this.savedStack.push(index);

		this.node.dirty([index].concat(path));
		
		index = this.savedStack.pop();
		this.stack.push(index);
	}

	this.addSink = function(sink)
	{
		this.node.addSink(sink);
	};

	this.set = function(val)
	{
		var index = this.stack.pop();
		this.savedStack.push(index);

		var array = this.node.get();
		array[index] = val;
		this.node.dirty([index]);

		index = this.savedStack.pop();
		this.stack.push(index);
	}

	this.setPath = function(val, path)
	{
		var index = this.stack.pop();
		this.savedStack.push(index);

		var array = this.node.get();
		setPath(array[index], path, val);
		this.node.dirty([index].concat(path));

		index = this.savedStack.pop();
		this.stack.push(index);
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
		var tuple = _.map(tupleGraph, function(path){return compileRef(path, nodes, promiseAllowed);});
		var beforeStr = newVar("new Destruct(" + "[" + _.map(tuple, function(elt)
			{
				return elt.getNode();
			}).join(", ") + "])");
		var v = getVar();
		return new Var(v + ".get()", v, "", beforeStr);
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
				return new StoreFunctionTemplate(library.functions[sourceNode], sourceNode);
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
			// return new Store(func, makeFunctionType(func));
			var res = new Var(sourceNode, sourceNode, makeFunctionType(func));
			res.isFunc = true;
			return res;
		}
		
		if(promiseAllowed && !(sourceNode in nodes))
		{
			// TODO struct access
			// TODO check that promises are kept, check types
			promiseCounter++;
			return new Var(sourceNode + ".get()", sourceNode);
		}
		var node = getNode(sourceNode, nodes);
		var path = split.slice(1);
		var valPath = "";
		var nodePath = _.reduce(path, function(accum, step, index)
		{
			valPath += "." + step;
			var comma = (index == 0) ? "" : ", ";
			return accum + comma + "\"" + step + "\"";
		}, "[");
		nodePath += "]";
		// If reference is an action, no type...
		// TODO : make another function for resolving references to actions ?
		if("getType" in node)
		{
			var type = node.getType(path);
		}
		if(split.length > 1)
		{
			var baseType = getBaseType(node.getType());
			var templates = getTypeParams(node.getType());
			check(baseType in library.nodes, "Var type " + baseType + " not found in library");
			var typeObj = (templates.length > 0) ? 
				library.nodes[baseType].getInstance(templates) :
				library.nodes[baseType];
			
			var fields = typeObj.fields;
			var hiddenFields = typeObj.hiddenFields;
			var type;
			try
			{
				type = getFieldType(fields.concat(hiddenFields), path);
			}
			catch(err)
			{
				console.log(err);
				error("No field " + path + " in node of type " + node.getType());		
			}

			var str = "new StructAccess(" + node.getNode() + ", " + nodePath + ")";
			var valStr = node.getVal() + valPath;
			var ret = new Var(valStr, str, type);
			
			ret.isStructAccess = true;
			ret.path = nodePath;
			ret.rootNode = node.getNode();
			return ret;
		} else
		{
			return node;
		}
	}
}

function Cloner(ref)
{
	this.ref = ref;

	this.get = function()
	{
		// TODO : optimiser
		if(this.cloneOperator != undefined)
			return this.cloneOperator(this.ref.get());
		// TODO listes, autres ...
		return _.clone(this.ref.get(), true);
	}
}

var varId = 0;

function Var(valStr, nodeStr, type, beforeStr, nodeId)
{
	this.valStr = valStr;
	this.nodeStr = nodeStr;
	this.type = type;
	this.nodeId = nodeId;
	this.id = varId++;
	if(beforeStr != undefined)
	{
		this.beforeStr = beforeStr;
	}
	else
	{
		this.beforeStr = "";
	}

	this.getVal = function()
	{
		return this.valStr;
	}

	this.getNode = function()
	{
		return this.nodeStr;
	}

	this.getType = function()
	{
		return this.type;
	}

	this.getBeforeStr = function()
	{
		return this.beforeStr;
	}

	this.getAddSinkStr = function(sink)
	{
		if(this.nodeId)
		{
			return this.nodeId + ".addSink(" + sink + ");\n";
		}
		return "";
	}
}

function Def(valStr, nodeStr, type, beforeStr, node)
{
	this.valStr = valStr;
	this.nodeStr = nodeStr;
	this.type = type;
	this.node = node;
	if(beforeStr != undefined)
	{
		this.beforeStr = beforeStr;
	}
	else
	{
		this.beforeStr = "";
	}

	this.getVal = function()
	{
		return this.valStr;
	}

	this.getNode = function()
	{
		return this.nodeStr;
	}

	this.getType = function()
	{
		return this.type;
	}

	this.getBeforeStr = function()
	{
		return this.beforeStr;
	}

	this.getAddSinkStr = function(sink)
	{
		return this.node.getAddSinkStr(sink);
	}
}

function Constant(valStr, type, beforeStr)
{
	this.valStr = valStr;
	this.type = type;
	this.isConstant = true;
	if(beforeStr != undefined)
	{
		this.beforeStr = beforeStr;
	}
	else
	{
		this.beforeStr = "";
	}

	this.getVal = function()
	{
		return this.valStr;
	}

	this.getType = function()
	{
		return this.type;
	}

	this.getBeforeStr = function()
	{
		return this.beforeStr;
	}
}

function Action(nodeStr, beforeStr)
{
	this.nodeStr = nodeStr;
	if(beforeStr != undefined)
	{
		this.beforeStr = beforeStr;
	}
	else
	{
		this.beforeStr = "";
	}

	this.getNode = function()
	{
		return this.nodeStr;
	}

	this.getBeforeStr = function()
	{
		return this.beforeStr;
	}
}

function Match(what, cases, elseCase, type)
{
	this.what = what;
	this.cases = cases
	this.elseCase = elseCase;
	this.type = type;
				
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

function MatchType(what, cases, type, addsRefs)
{
	this.what = what;
	this.cases = cases;
	this.type = type;
	this.addsRefs = addsRefs;

	this.get = function()
	{
		var val = this.what.get();
		var type = val.__type;
		for(var i = 0; i < this.cases.length - 1; i++)
		{
			var match = this.cases[i];
			if(sameTypes(type,  match.type))
			{
				var val = match.val.get();
				return val;
			}
		}
		// else case
		var match = this.cases[i];

		var val = match.val.get();
		return val;
		// TODO Error				
	}
	
	this.getType = function()
	{
		return this.type;
	}
}

function DictAccess(ref, key, dictTypeParam)
{
	this.ref = ref;
	this.key = key;
	this.type = dictTypeParam;
	this.justBuilder = library.nodes.Just.getInstance([this.type]).builder; 
	this.noneBuilder = library.nodes.None.getInstance([this.type]).builder; 
	
	this.get = function()
	{
		var keyVal = this.key.get();
		var dict = this.ref.get();
		var val = dict[keyVal];
		if(val != undefined)
		{
			// TODO : optim
			return {
				__type : {
					base : "Just",
					params : [this.type]
				},
				x : val
			}
		}
		return {
			__type : {
				base : "None",
				params : [this.type]
			}
		}
	}

	this.getPath = function(path)
	{
		return getPath(this.get(), path);
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
		return new Var(expr.toString(), "new Store(" + expr.toString() + ", \"" + type + "\")", type);
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

		if(node.needsRef)
		{
			connectionSet = true;
		}
		
		if("connections" in expr)
		{
			if(connectionsAllowed)
			{
				node.needsNodes = true;				
				var signals = node.fields.__signals;

				var type = node.getType();
				connections.push({
					signals : signals,
					type : type,
					connections : expr.connections
				});

				_.each(expr.connections, function(connection)
				{
					signals[connection.signal] = {action : connection.action, nodes : _.clone(nodes)};
				})
			}
			else
			{
				// TODO always true ?
				node.needsNodes = true;
				var type = node.getType();
				var signals = node.getSignals();
				var slots = library.nodes[type].operators.slots;

				_.each(expr.connections, function(connection)
				{
					var mergedNodes = _.clone(nodes);
					_.merge(mergedNodes, slots[connection.signal].localNodes);
					var action = makeAction(connection.action, mergedNodes);
					signals[connection.signal] = {action : connection.action, nodes : mergedNodes};
				});
				connectionSet = true;
			}

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
			storeStr += newVar("new Store(" + param.id + ", " + typeToJson(param.type) + ")");
			var node = new Var(param.id, getVar(), param.type);
			localNodes[param.id] = node;
			inputTypes.push(param.type);
			return param.id;
		}).join(", ") + "){\n";
		
		var builtExpr = makeExpr(expr.closure, localNodes, genericTypeParams);
		funcDef += storeStr;
		funcDef += builtExpr.getBeforeStr();
		funcDef += "return " + builtExpr.getVal() + "\n}\n";

		return new Var(funcDef, funcDef, {inputs : inputTypes, output : builtExpr.getType()});
	}
}

function makeNode(nodeGraph, nodes, connectionsGraph)
{
	if("val" in nodeGraph)
	{
		var node = makeExpr(nodeGraph.val, nodes);
	}
	else
	{
		var node = makeExpr(nodeGraph, nodes);
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
			return compileRef(slot, nodes, true);
		}
	} else if(isArray(slot) || "destruct" in slot)
	{
		return compileRef(slot, nodes, true);
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

function concatActions(beginActions, actionGraph)
{
	if(!("if" in actionGraph) && !("while" in actionGraph) && !("accessSet" in actionGraph) && !("set" in actionGraph))
	{
		actionGraph.slots = beginActions.concat(actionGraph.slots);
	} else
	{
		actionGraph = {
			"slots" : beginActions.concat([actionGraph])
		};
	}
	return actionGraph;
}

var locIndex = 0;
function makeAction(actionGraph, nodes, connections)
{
	
	if("foreach" in actionGraph)
	{
		var list = compileRef(actionGraph["foreach"], nodes);
		var itName = "it" + locIndex;
		var beforeStr = "var " + itName + " = new ArrayAccess(" + list.getNode() + ");\n";

		var str = newVar(list.getVal() + ".length - 1");
		var counter = getVar();

		locIndex++;

		var paramsGraph = actionGraph.params;
		var paramsStr = _.map(paramsGraph, function(param)
			{
				beforeStr += newVar(makeExpr(param, nodes).getNode());
				return getVar();
			}).join(", ");
		str += "for(; " + counter + " >= 0; " + counter + "--){\n";
		str += itName + ".push(" + counter + ");\n";
		str += getListTypeParam(list.getType()) + "." + actionGraph["signal"] + "(" + itName;
		if(paramsStr.length > 0)
		{
			str += ", " + paramsStr;
		}
		str += ");\n";
		str += itName + ".pop();\n}\n";
		return new Action(str, beforeStr);
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
		// return new MatchAction(actionGraph, nodes);

		var beforeStr = ""
		var str = newVar(makeExpr(actionGraph.match, nodes).getVal());
		var matchVar = getVar();
		_.each(actionGraph.cases, function(caseGraph, caseIndex)
		{
			if(caseIndex > 0) str += "else ";
			str += "if(" + _.map(caseGraph.vals, function(val)
			{
				return "(" + matchVar + " == " + makeExpr(val, nodes).getVal() + ")";
			}).join(" || ") + "){\n";

			var action = makeAction(caseGraph.action, nodes);
			beforeStr += action.getBeforeStr();
			str += action.getNode() + "}\n";
		});
		if("else" in actionGraph)
		{
			var action = makeAction(actionGraph["else"], nodes);
			beforeStr += action.getBeforeStr();
			str += "else{\n" + action.getNode() + "}\n";
			this.elseCase = makeAction(actionGraph["else"], nodes);
		}
		return new Action(str, beforeStr);
	}
	
	if("matchType" in actionGraph)
	{
		function MatchTypeAction(actionGraph, nodes)
		{
			var cases = actionGraph.cases;
			this.what = getNode(actionGraph.matchType, nodes);
			this.cases = cases.map(function(matchExp){
				var matchStore = new Store(matchExp.type != "_" ? matchExp.type : this.what.getType());
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

		var beforeStr = newVar(makeExpr(actionGraph.matchType, nodes).getNode());
		var matchVar = getVar();
		beforeStr += newVar(matchVar + ".get().__type");
		var typeVar = getVar();
		var str = ""
		_.each(actionGraph.cases, function(caseGraph, caseIndex)
		{
			// TODO manage default case
			var matchType = caseGraph.type;
			var matchStore = new Var(matchVar + ".get()", matchVar, matchType != "_" ? matchType : what.getType());
			var mergedNodes = _.clone(nodes);
			mergedNodes[actionGraph.matchType] = matchStore;

			if(caseIndex > 0) str += "else ";
			str += "if(isSameOrSubType(" + typeVar + ", " + typeToJson(matchType) + ")){\n";
			var action = makeAction(caseGraph.action, mergedNodes);
			beforeStr += action.getBeforeStr();
			str += action.getNode() + "}\n";
		});
		
		return new Action(str, beforeStr);

		// TODO type avec template
	}
	
	if("for" in actionGraph)
	{
		var list = compileRef(actionGraph["in"], nodes);
		var itName = "it" + locIndex;
		var beforeStr = "var " + itName + " = new ArrayAccess(" + list.getNode() + ");\n";

		var localNodes = _.clone(nodes);
		localNodes[actionGraph["for"]] = new Var(itName + ".get()", itName, getListTypeParam(list.getType()));

		var str = newVar(list.getVal() + ".length - 1");
		var counter = getVar();
		
		if("index" in actionGraph)
		{
			localNodes[actionGraph["index"]] = new Constant(counter, "int");
		}
		locIndex++;
		// TODO : check that action only change iterator
		var action = makeAction
		(
			actionGraph["do"],
			localNodes
		);

		str += "for(; " + counter + " >= 0; " + counter + "--){\n";
		str += itName + ".push(" + counter + ");\n";
		str += action.getBeforeStr();
		str += action.getNode();
		str += itName + ".pop();\n}\n";
		return new Action(str, beforeStr);
	}
	
	if("update" in actionGraph)
	{
		var list = compileRef(actionGraph["in"], nodes);
		var itName = "it" + locIndex;
		var beforeStr = "var " + itName + " = new ArrayAccess(" + list.getNode() + ");\n";

		var localNodes = _.clone(nodes);
		localNodes[actionGraph["update"]] = new Var(itName + ".get()", itName, getListTypeParam(list.getType()));

		var str = newVar(list.getVal() + ".length - 1");
		var counter = getVar();
		
		if("index" in actionGraph)
		{
			localNodes[actionGraph["index"]] = new Constant(counter, "int");
		}
		
		if("with" in actionGraph)
		{
			var action = makeAction
			(
				{
					set : actionGraph["with"],
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
						set : condVal.val,
						slots : [actionGraph["update"]]
					}
				},
				localNodes
			);
		}
		
		locIndex++;

		str += "for(; " + counter + " >= 0; " + counter + "--){\n";
		str += itName + ".push(" + counter + ");\n";
		str += action.getNode();
		str += itName + ".pop();\n}\n";
		var val = actionGraph["with"];
		return new Action(str, beforeStr);
	}
	
	if("signal" in actionGraph)
	{
		var paramsGraph = actionGraph.params;
		var beforeStr = ""
		var paramsStr = _.map(paramsGraph, function(param)
			{
				beforeStr += newVar(makeExpr(param, nodes).getNode());
				return getVar();
			}).join(", ");
		
		// Object slot
		if("var" in actionGraph)
		{
			var node = compileRef(actionGraph["var"], nodes); 
			var str = getBaseType(node.getType()) + "." + actionGraph["signal"] + "(" + node.getNode();
			if(paramsStr.length > 0)
			{
				str += ", " + paramsStr;
			}
			str += ");\n";
			return new Action(str, beforeStr);
		}
		
		// Global action
		var str = compileRef(actionGraph["signal"], nodes).getNode() + "(" + paramsStr + ");\n";
		return new Action(str, beforeStr);
	}
	
	// Les generateurs (les <-) sont transformes en Store, 
	// qui sont alimentes au debut de l'actionGraph
	var beforeStr = "";
	var generators = [];
	function makeGenerators(val)
	{
		if(_.isObject(val) && ("msg" in val))
		{
			var producerGraph = _.cloneDeep(val);
			producerGraph.type = producerGraph.msg;
			var msgProducer = makeNode(producerGraph, nodes, {});
			var producerName = "__msgProducer" + msgIndex;
			beforeStr += "var " + producerName + " = " + msgProducer.getNode() + ";\n";
			var msgStore = new Var("", "new Store( null, " + typeToJson(msgProducer.getType()) + ")", msgProducer.getType());
			var storeName = "__msgStore" + msgIndex;
			if("def" in val)
				storeName = val.def;
			nodes[storeName] = new Var(storeName + ".get()", storeName, msgProducer.getType());
			beforeStr += "var " + storeName + " = " + msgStore.getNode() + ";\n";
			beforeStr += "__msgProducer" + msgIndex.toString() + ".slots = [" + storeName + "];\n";
			nodes[producerName] = new Action("(function(){" + producerName + ".signal();})", "");
			generators.push(
				{
					signal : producerName,
					params : []
				});

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
				var type = makeExpr(slot.set, mergedNodes).getType();
				if(_.isObject(subSlot) && "destruct" in subSlot)
				{
					var templates = getTypeParams(type);
					var destruct = subSlot.destruct;
					_.each(destruct, function(name, i){
						// var loc = new Store(null, templates[i]);
						var locName = "__loc" + locIndex.toString();
						locIndex++;
						beforeStr += "var " + locName + " = new Store(null, " + typeToJson(templates[i]) + ");\n";
						var loc = new Var(locName + ".get()", locName, templates[i]);
						mergedNodes[name] = loc;
					});
				}
				else
				{
					// var loc = new Store(null, type);
					var locName = "__loc" + locIndex.toString();
					locIndex++;
					beforeStr += "var " + locName + " = new Store(null, " + typeToJson(type) + ");\n";
					var loc = new Var(locName + ".get()", locName, type);
					mergedNodes[subSlot[0]] = loc;
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
	else if("accessSet" in actionGraph)
	{
		type = "accessSet";
		paramGraph = actionGraph.accessSet;
	} else if("set" in actionGraph)
	{
		type = "set";
		paramGraph = actionGraph.set;
	} else // seq
	{
		type = "seq";
	}
	
	var param = null;
	if(paramGraph != undefined)
	{
		// FIXME : type
		// Si l'action est une affectation et que le parametre est une reference, il devra etre clone
		var cloneIfRef =  (type == "set");
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
			// return new IfElseParam(param, thenSlot, elseSlot);
			beforeStr += param.getBeforeStr() + thenSlot.getBeforeStr();
			// var str = "new IfElseParam(" + param.getNode() + ", " + thenSlot.getNode();
			// if(elseSlot != null)
			// {
			// 	str += ", " + elseSlot.getNode();
			// 	beforeStr += elseSlot.getBeforeStr();
			// }
			// str += ")";
			var str = "if(" + param.getVal() + ") {\n" + thenSlot.getNode() + "}\n"
			if(elseSlot != null)
			{
				str += " else {\n" + elseSlot.getNode() + "}\n";
				beforeStr += elseSlot.getBeforeStr();
			}
			return new Action(str, beforeStr);
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
			beforeStr += param.getBeforeStr() + slot.getBeforeStr();
			var str = "while(" + param.getVal() + ") {\n" + slot.getNode() + "}\n";
			return new Action(str, beforeStr);
		}
		else
		{
			return new While(slot);
		}
	} else
	{
		var slots = compileSlots(actionGraph.slots, localNodes, connections);
		
		if(type == "accessSet")
		{
			function AccessAffectation(slots, param, key) {
			    this.slots = slots;
			    this.param = param;
			    this.id = nodeId;
			    this.key = key;
			    nodeId++;
				this.signal = function(rootAndPath)
			    {
					var val = this.param.get();
					var keyVal = this.key.get();						
					for(var i = 0; i < this.slots.length; i++)
					{
						var slot = this.slots[i];
						var dict = slot.get();
						dict[keyVal] = val;
						slot.dirty([]);
					}
			    };
			}
			// var node = new AccessAffectation(slots, param, makeExpr(actionGraph.indexOrKey, localNodes));

			var indexOrKey = makeExpr(actionGraph.indexOrKey, localNodes);
			var str = "";
			str += _.map(slots, function(slot)
			{
				beforeStr += slot.getBeforeStr();
				return slot.getVal() + "[" + indexOrKey.getVal() + "] = " + param.getVal() + ";\n";				
			}).join("");
			return new Action(str, beforeStr + param.getBeforeStr());
		}
		else if(type == "set")
		{
			// var node = new Send(slots, param);
			var str = newVar(param.getVal());
			var valName = getVar();
			str += _.map(slots, function(slot)
			{
				beforeStr += slot.getBeforeStr();
				if(slot.isStructAccess)
				{
					str = slot.rootNode + ".setPath(" + valName + ", " + slot.path +");\n";
					return str;
				}
				return slot.getNode() + ".set(" + valName + ");\n";
			}).join("");
			return new Action(str, beforeStr + param.getBeforeStr());
		} else // Seq
		{
			if(slots.length == 1)
			{
				return new Action(slots[0].getNode(), slots[0].getBeforeStr());
			}
			str = _.map(slots, function(slot)
			{
				beforeStr += slot.getBeforeStr();
				return slot.getNode();
			}).join("");
			return new Action(str, beforeStr);
		}

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

function __Obj(structDef, params, type, signals)
{
	this.structDef = structDef;
	this.type = type;
	this.fields = {};
	_.each(params, function(param, i)
	{
		this.fields[structDef.params[i]] = param;
	}, this);
	this.signals = signals;

	this.get = function()
	{
		var struct = {};
		_.each(this.fields, function(field, key)
		{
			struct[key] = field.get();
		});
		struct.__type = type;
		struct.__views = {};
		_.each(this.signals, function(action, key)
		{
			struct[key] = action;
		});
		if(globalRefs.length > 0)
		{
			struct.__refs = globalRefs;
			struct.__referencedNodes = globalReferencedNodes;
		}
		return struct;
	}

	this.getPath = function(path)
	{
		var field = this.fields[path[0]].get();
		if(path.length > 1)
		{
			return getPath(field, path.slice(1));
		}
		return field;
	}

	this.getType = function()
	{
		return this.type;
	}

	this.addSink = function(sink)
	{
		_.each(this.fields, function(field)
		{
			field.addSink(sink);
		});
	}
};

var structId = 0;

function makeStruct(structGraph, inheritedFields, superClassName, typeParamsInstances)
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

	var signalSlotAndFieldGraph = inheritedFields.concat(structGraph.fields ? structGraph.fields : []);

	var node = {};
	if(concreteName in library.nodes)
	{
		node = library.nodes[concreteName];
	} else
	{
		library.nodes[concreteName] = node;
	}
	
	var fieldsGraph = [];
	var signalAndSlotsGraph = [];
	var signalsParams = {};
	_.each(signalSlotAndFieldGraph, function(item)
	{
		// A field
		if(_.isArray(item))
		{
			fieldsGraph.push(_.clone(item));
		}
		else
		{
			signalAndSlotsGraph.push(item);
			if("signal" in item)
			{
				signalsParams[item.signal] = item.params; 
			}
		}
	});

	var fieldsOperators = {};
	for(var i = 0; i < fieldsGraph.length; i++)
	{
		var fieldType = fieldsGraph[i][1];
		// Generic structure case
		if(typeParamsInstances)
		{
			// Recursively replace generic types by their instances
			function replaceGenericTypes(fieldType)
			{
				// Simple type 
				if(isString(fieldType))
				{
					// find if it is one of the type params
					var found = _.find(typeParamsInstances, function(genericType)
					{
						return (genericType[0] === fieldType);
					});
					// If yes, replace it by the type instance
					if(found)
					{
						return found[1];
					}
					// Else return the type as is
					return fieldType;
				}
				// A generic type : apply recursively
				return mt(fieldType.base, _.map(fieldType.params, replaceGenericTypes));
			}
			
			fieldType = replaceGenericTypes(fieldType);
			fieldsGraph[i][1] = fieldType;
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

	var instanceIndex = 0;
	
	function makeBuilder()
	{
		function builder(fields) 
		{	
			this.fields = {
				__type : type,
				__views : {}
			};
			this.operators = library.nodes[concreteName].operators;
			this.signals = {};
			this.built = false;
			this.needsNodes = false;
			this.addsRefs = false;
			var paramStr = "[";
			var signalStr = "[";
			this.instanceName = concreteName + instanceIndex.toString();
			instanceIndex++;

			var firstField = true;
			var firstSignal = true;
			var beforeStr = "";
			for(var i = 0; i < signalSlotAndFieldGraph.length; i++)
			{
				var field = signalSlotAndFieldGraph[i];
				
				if(_.isArray(field))
				{
					var fieldName = field[0];
					var fieldVal = fields[fieldName];
					if(fieldVal == undefined)
					{
						error("Field " + fieldName + " not found in parameters of " + concreteName + " constructor");
					}
					if(fieldVal.needsNodes)
					{
						this.needsNodes = true;
					}
					this.fields[fieldName] = fieldVal;

					if(firstField)
					{
						var comma = "";
						firstField = false;
					}
					else
					{
						var comma = ",\n";
					}
					if(fieldVal.isConstant)
					{
						paramStr += comma + "new Store(" + fieldVal.getVal() + ", " + typeToJson(fieldVal.getType()) + ")";						
					}
					else
					{
						paramStr += comma + fieldVal.getNode();						
					}
					beforeStr += fieldVal.getBeforeStr();
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

					if(firstSignal)
					{
						var comma = "";
						firstSignal = false;
					}
					else
					{
						var comma = ", ";
					}
					signalStr += "function " + signalGraph.signal + "(){}, ";
				}
			};
			paramStr += "]";
			signalStr += "]";

			this.getBeforeStr = function()
			{
				return beforeStr;
			}

			this.getNode = function()
			{
				signalStr = "{\n";
				var firstField = true;
				_.each(this.fields, function(field, key)
				{
					if(key == "__signals")
					{
						_.each(field, function(signal, key)
						{
							if(firstField)
							{
								var comma = "";
								firstField = false;
							}
							else
							{
								var comma = ",\n\t";
							}
							if(signal.nodes != undefined)
							{
								var localNodes = _.clone(signal.nodes);
								var signalParams = signalsParams[key];
								var signalParamStr = _.map(signalParams, function(param)
								{
									var node =  new Var(param[0] + ".get()", param[0], param[1],  "");
									localNodes[param[0]] = node;
									return param[0];
								}).join(", ");
								var action = makeAction(signal.action, localNodes);

								signalStr += comma + key + " : function(" + signalParamStr + "){" + action.getBeforeStr() + action.getNode() + "}";
							} else
							{
								signalStr += comma + key + " : function(){}";
							}
						}, this);
					}
				});
				signalStr += "}";
				this.nodeStr = "new __Obj(" + concreteName + ", " + paramStr +  ", \"" + concreteName + "\", " + signalStr + ")";
				return this.nodeStr;
			}

			this.getVal = function()
			{
				this.valStr = "{\n";
				var firstField = true;
				_.each(this.fields, function(field, key)
				{
					if(firstField)
					{
						var comma = "\t";
						firstField = false;
					}
					else
					{
						var comma = ",\n\t";
					}
					
					if(key == "__signals")
					{
						_.each(field, function(signal, key)
						{
							if(signal.nodes != undefined)
							{
								var localNodes = _.clone(signal.nodes);
								var signalParams = signalsParams[key];
								var signalParamStr = _.map(signalParams, function(param)
								{
									var node =  new Var(param[0] + ".get()", param[0], param[1],  "");
									localNodes[param[0]] = node;
									return param[0];
								}).join(", ");
								var action = makeAction(signal.action, localNodes);

								this.valStr += comma + key + " : function(" + signalParamStr + "){" + action.getBeforeStr() + action.getNode() + "}";
							} else
							{
								this.valStr += comma + key + " : function(){}";
							}
						}, this);
					} 
					else if(key == "__type")
					{
						this.valStr += comma + "__type : " + typeToJson(field);
					}
					else if(key == "__views")
					{
						this.valStr += comma + "__views : " + typeToJson(field);
					}
					else
					{
						this.valStr += comma + key + " : " + field.getVal();
					}
				}, this);
				this.valStr += "}";
				return this.valStr;
			}

			this.getSignals = function()
			{
				return this.fields.__signals;
			};

			this.get = function()
			{
				var ret = _.mapValues(this.fields, function(field, key){
					// TODO : ameliorer
					return ((key == "__type") || (key == "__signals") || (key == "__views")) ? field :  field.get();
				});
				ret.__id = structId++;
				if("__signals" in this.fields && "onBuilt" in this.fields.__signals)
				{
					// this.built = true;
					this.operators.signal(ret, "onBuilt", [], [], this);
					// this.built = false;
					// signal : function(struct, id, params, path, node, callFromSlot)
				}
				return ret;
			};	

			this.getField = function(fieldName)
			{
				this.fields[fieldName].get();
			};
			this.getType = function()
			{
				return type;
			};
			this.addSink = function(sink)
			{
				_.each(this.fields, function(field, key)
				{
					if((key != "__type") && (key != "__signals") && (key != "__views"))
					{
						field.addSink(sink);
					}
				});				
			};
			this.signal = function(id, params, path)
			{
				this.operators.signal(this.get(), id, params, path, this);
			}
			if("__signals" in this.fields && "onBuilt" in this.fields.__signals)
			{
				var a = "t";
			}
		}

		return builder;
	}
	
	_.merge(node, {
		fields : fieldsGraph,
		hiddenFields : [["__views", mt("dict", ["UiView"])]],
		builder : makeBuilder(),
		fieldsOp : fieldsOperators,
		operators : {
			slots : {}			
		},
		subClasses : [],
		superClass : superClassName
	});
	
	var paramStr = "";
	var slotStr = "";
	var beforeStr = "";
	var firstField = true;
	_.each(signalSlotAndFieldGraph, function(item)
	{
		// A field
		if(_.isArray(item))
		{
			if(firstField)
			{
				firstField = false;
				var comma = "";
			}
			else
			{
				var comma = ", ";
			}
			paramStr += comma + "\"" + item[0] + "\"";
		}
		else
		{
			if("slot" in item)
			{
				var slotGraph = item;
				var localNodes = {"self" : new Var("self.get()", "self", type,  "")};
				var slotParamStr = _.map(slotGraph.params, function(param)
				{
					var node =  new Var(param[0] + ".get()", param[0], param[1],  "");
					localNodes[param[0]] = node;
					return param[0];
				}).join(", ");
				var action = makeAction(slotGraph.action, localNodes);
				// beforeStr += action.getBeforeStr();
				slotStr += slotGraph.slot + " : function(self, " + slotParamStr + "){\n" + action.getBeforeStr() + action.getNode() + "\n},\n";
			} else
			{
				var signalGraph = item;
				var signalParamStr = _.map(signalGraph.params, function(param)
				{
					return param[0];
				}).join(", ");
				// beforeStr += action.getBeforeStr();
				slotStr += signalGraph.signal + " : function(self";
				if(signalParamStr.length > 0)
				{
					slotStr += ", " + signalParamStr;
				}
				slotStr += "){\nvar __selfVal = self.get();\nvar __pushedRefs = [];\nif(\"__refs\" in __selfVal)\n{\n_.each(__selfVal.__refs, function(ref, i){\n";
				slotStr += "ref.push(__selfVal.__referencedNodes[i]);\n__pushedRefs.push(ref);\n});\n}\n"
				slotStr += "__selfVal." + signalGraph.signal + "(" + signalParamStr + ");\n";
				slotStr += "_.each(__pushedRefs, function(ref, i)\n{\nref.pop();\n});\n},\n";
			}
		}
	});
	var str = beforeStr + "var " + concreteName + " = {params : [" + paramStr + "],\n" + slotStr + "};\n";

	// Why do we need to use the same store.
	// Problem with this code is the type, because operators are only those of the root type
	// node.operators.selfStore = superClassName ? library.nodes[superClassName].operators.selfStore : new FuncInput(type);
	// node.operators.selfStore = new SubStore(name);
	
	if(superClassName)
		library.nodes[superClassName].subClasses.push(concreteName);
	
	for(var i = 0; i < signalAndSlotsGraph.length; i++)
	{
		var field = signalAndSlotsGraph[i];
		if("slot" in field)
		{
			// var slotGraph = field;
			// var localNodes = {"self" : node.operators.selfStore};
			// var inputs = [];
			// _.each(slotGraph.params, function(param)
			// {
			// 	var node = new FuncInput(param[1]);
			// 	localNodes[param[0]] = node;
			// 	inputs.push(node);
			// });
			// node.operators.slots[field.slot] = {
			// 	action : makeAction(slotGraph.action, localNodes),
			// 	inputs : inputs
			// };
		} else
		{
			function StructSignal(id) {
				this.id = id;
				this.selfStore = node.operators.selfStore;
				this.signal = function(rootAndPath)
				{
					var node = this.selfStore.get();
					var slots = node.__signals[this.id];
					for(var i = 0; i < slots.length; i++)
					{
						slots[i].signal();
					}
				};
			}
			var signalGraph = field;
			var inputs = [];
			var localNodes = {"self" : new Var("self.get()", "self", type,  "")};
			_.each(signalGraph.params, function(param)
			{
				var node = new Var(param[0] + ".get()", param[0], param[1],  "")
				localNodes[param[0]] = node;
				// inputs.push(node);
			});
								
			node.operators.slots[signalGraph.signal] =  {
				action : new StructSignal(signalGraph.signal),
				inputs : inputs,
				localNodes : localNodes
			};
		}
	}

	return str;
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
		// We clone because fields will be instantiated, and we want to keep template version
		makeStruct(_.clone(this.classGraph, true), this.inheritedFields, superConcreteName, typeParamsInstances);
		
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
	}).join("$");
}

function FunctionInstance(classGraph)
{
	this.name = classGraph.id;
	this.params = classGraph["in"];
	this.expr = null;
	this.needsNodes = false;
	this.beforeStr = "";
	this.beforeUpdate = "";

	this.getBeforeStr = function()
	{
		return this.beforeStr;
	}

	this.getBeforeUpdate = function()
	{
		return this.beforeUpdate;
	}

	this.getStr = function(params)
	{
		var str = "";
		_.each(params, function(param, index)
		{
			str += param;
			if(index < params.length - 1)
			{
				str += ", ";
			}
		});
		return this.name + "(" + str + ")";
	}

	this.getStrRef = function(params)
	{
		var str = "";
		_.each(params, function(param, index)
		{
			str += param;
			if(index < params.length - 1)
			{
				str += ", ";
			}
		});
		return this.name + "(" + str + ")";
	}

	this.func = function(params) 
	{	
		_.each(params, function(param, i)
		{
			// this.inputNodes[i].pushVal(node);
			this.inputNodes[i].pushVal(param);
		}, this);
		
		var result = this.expr.get(true);
		
		_.each(params, function(node, i)
		{
			// this.inputNodes[i].popVal();
			this.inputNodes[i].popVal();
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
		
		if(this.expr.addsRefs)
		{
			result.__referencedNodes = paramNodes.concat(result.__referencedNodes);
			result.__refs = this.__refs.concat(result.__refs);
		} else
		{
			result.__referencedNodes = paramNodes.slice(0);
			result.__refs = this.__refs.slice(0);
		}

		_.each(paramNodes, function(node, i)
		{
			this.inputNodes[i].pop();
		}, this);
		
		return result;
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
	return _
		.filter(paramsDecl, function(decl) {return _.isArray(decl);})
		.map(function(decl){return decl[1];});
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
			instance.needsNodes = true;
		}

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

		var fullFuncName = classGraph.id + "$" + key;
		instance.name = fullFuncName;		
		this.cache[key] = instance;
		
		instance.internalNodes = {};
		instance.inputNodes = [];
		
		
		_.each(classGraph["in"], function(paramAndType)
		{
			// Replace template declarations by their instances:

			var type = instantiateTemplates(paramAndType[1], templateNameToInstances);
			if(instance.needsNodes)
			{
				var node = new Var(paramAndType[0] + ".get()", paramAndType[0], type);
			}
			else
			{
				var node = new Var(paramAndType[0], "new Store(" + paramAndType[0] + ", " + typeToJson(paramAndType[1]) + ")", type);
			}
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

		var paramStr = _.map(classGraph["in"], function(paramAndType)
			{
				return paramAndType[0];
			}).join(", ");
		
		instance.beforeStr += "function " + fullFuncName + "(" + paramStr + "){\n";
		// instance.beforeStr += "function " + classGraph.id + "(" + paramStr + "){\n";
		instance.beforeStr += instance.expr.getBeforeStr();
		instance.beforeStr += "return " + instance.expr.getVal() + ";\n};\n";
		
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

	this.dirty = function()
	{
		if(this.condition.get())
		{
			this.action.signal();
		}
	}	
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

function setLibrary(lib)
{
	library = lib;
}

function compileGraph(graph, lib, previousNodes) 
{
	// globals init
	var nodes = previousNodes != undefined ? previousNodes : {};
	msgIndex = 0;
	library = lib;
	connections = [];
	connectionsAllowed = false;
	src = "var float = {};\n";
	src += "var int = {};\n";
	src += "var string = {};\n";

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
							func.needsNodes = true;
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
							// version when function gets ref 
							if(func.needsNodes)
							{
								var node = new Var(paramAndType[0] + ".get()", paramAndType[0], type);
							}
							else
							{
								var node = new Var(paramAndType[0], "new Store(" + paramAndType[0] + ", " + typeToJson(paramAndType[1]) + ")", paramAndType[1]);
							}
							// var node = new Var(paramAndType[0] + ".get()", paramAndType[0], paramAndType[1]);
							// var node = new Var(paramAndType[0], "new Store(" + paramAndType[0] + ", " + typeToJson(paramAndType[1]) + ")", paramAndType[1]);
							node.func = funcGraph.id;
							func.inputNodes.push(node);
							// func.internalNodes[paramAndType[0]] = node;
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
						var paramStr = _.map(funcGraph["in"], function(paramAndType)
						{
							return paramAndType[0];
							
						}).join(", ");
						src += "\nfunction " + funcGraph.id + "(" + paramStr + "){\n";
						src += func.expr.getBeforeStr();
						src += "return " + func.expr.getVal() + ";\n};\n";
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
						src += "\n" + makeStruct(structGraph, []);

						function makeSubs(subs, inheritedFields, superClassName)
						{
							if(subs)
							{
								for(var i = 0; i < subs.length; i++)
								{
									var subStructGraph = subs[i];
									src += "\n" + makeStruct(subStructGraph, inheritedFields, superClassName);
									makeSubs(subStructGraph.subs, inheritedFields.concat(subStructGraph.fields), subStructGraph.name);
								}
							}
						}
						
						makeSubs(structGraph.subs, structGraph.fields, structGraph.name);
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
					var node = new Store(param[1]);
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
					return new Store(param[1]);
				});
			}
			
			nodes[id[0]] = new Action(id[0], "");
			// src += "var " + id[0] + " = new ActionParams(null, null);\n";
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
				var node = makeNode(nodeGraph, nodes, connectionsGraph);
				if("var" in nodeGraph)
				{
					// TODO : virer les dependances du node

					src += node.getBeforeStr();
					src += "var " + id + " = new Store(" + node.getVal() + ", " + typeToJson(node.getType()) + ");\n";
					nodes[id] = new Var(id + ".get()", id, node.getType(), "", id);
				} else if("cache" in nodeGraph)
				{
					src += node.getBeforeStr();
					src += "var " + id + " = new Cache(" + node.getUpdateNode() + ");\n";
					src += node.getAddSinkStr(id);
					nodes[id] = new Var(id + ".get()", id, node.getType(), "", id);
				} else
				{
					src += node.getBeforeStr();
					src += "var " + id + " = " + node.getNode() + ";\n";
					nodes[id] = new Def(id + ".get()", id, node.getType(), "", node);
				}
			}
			// catch(err) // For release version only
			// {
				// console.log(err);
				// error("Cannot build node " + id);
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
			// var mergedNodes = _.clone(nodes);
			// _.merge(mergedNodes, slots[connection.signal].localNodes);
			// signals[connection.signal].push(makeAction(connection.action, mergedNodes));
		});
	});
	
	return src;
}
