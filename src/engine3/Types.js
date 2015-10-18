function getBaseType(type)
{
	return type.base;
}

function getTypeArgs(type)
{
	return type.args;
}

function makeBaseType(typeStr)
{
	return {
		base : typeStr,
		args : []
	}
}

function makeType(typeStr, args)
{
	return {
		base : typeStr,
		args : args
	}
}

function typeGraphToCompact(typeGraph) {
	if(typeGraph.type == "Id") {
		return makeBaseType(typeGraph.name);
	} else {
		return makeType(
			typeGraph.base,
			_.map(typeGraph.args, typeGraphToCompact)
		);
	}
}

function instanciateType(genericType, genericToInstanceDict){
	var genericBase = genericType.base;
	if(genericBase in genericToInstanceDict) {
		return genericToInstanceDict[genericBase];
	}
	
	var args = _.map(genericType.args, function(resultArgType) {
		return instanciateType(
			resultArgType,
			genericToInstanceDict
		);
	});

	return {
		base : genericBase,
		args : args
	};
}

function instanciateFunctionType(genericType, kwTypeArgs){
	return {
		inputs : _.map(genericType.inputs, function(input) {
			return instanciateType(input, kwTypeArgs);
		}),
		output : instanciateType(genericType.output, kwTypeArgs)
	};
}

function makeFunctionType(paramsType, returnType)
{
	return {
		inputs : paramsType,
		output : returnType
	};
}

function isSubType(checkedType, refType)
{
	var checkedBaseType = getBaseType(checkedType);
	var refBaseType = getBaseType(refType);
	if(checkedBaseType != refBaseType)
	{
		if(refBaseType == "Float" && checkedBaseType == "Int")
		{
			return true;
		}
		// if(checkedType in library.nodes)
		// {
		// 	return isStrictSubType(checkedType, refType);
		// }
		return false;
	}
	var checkedTypeArgs = getTypeArgs(checkedType);
	var refTypeArgs = getTypeArgs(refType);
	if(checkedTypeArgs.length != refTypeArgs.length)
	{
		return false;
	}

	// Empty list is always sub-type of any other list type
	if((checkedBaseType == "list") && (checkedTypeArgs[0] == ""))
	{
		return true
	}

	// Empty dict is always sub-type of any other dict type
	if((checkedBaseType == "dict") && (checkedTypeArgs[1] == ""))
	{
		return true
	}

	if(!(_(checkedTypeArgs).zip(refTypeArgs).map(function(types)
	{
		return isSubType(types[0], types[1]);
	}).every()))
	{
		return false;
	}
	return true;
}

function isSameType(first, second) {
	return (
		(first.base === second.base) && (
			((first.args.length === 0) && (second.args.length === 0)) ||
			_.zip(first.args, second.args)
				.map(function(firstTypeParam, secondTypeParam) {
					return isSameType(firstTypeParam, secondTypeParam);
				})
				.all()
		)
	);
}

function getCommonSuperClass(fstType, scdType)
{
	// return the most generic of the two types
	if(isSubType(fstType, scdType))
		return scdType;
	if(isSubType(scdType, fstType))
		return fstType;
	var commonAncestor = findCommonSuperClass(fstType, scdType)
	if(commonAncestor != undefined)
		return commonAncestor;
	error("Type parameters are not compatible : " + typeToString(fstType) + " and " + typeToString(scdType))
	// return undefined;
}

function getTypeParamsToParamsPaths(typeParams, paramsType)
{
	// For all parameters types, recursively add paths to leaf types (typeParams), with leaf types at the end
	// e.g. : [list<list<T>>, pair<F,G>, int] -> [[0, 0, 0, T], [1, 0, F], [1, 1, G], [2, int]]
	function getTypePaths(paramsType, parentPath)
	{
		return _.reduce
		(
			paramsType, 
			function(paths, type, index)
			{
				var typeParams = type.args;
				if(typeParams.length == 0)
				{
					return paths.concat(
						[parentPath.concat([index, type])]
					);
				}
				return paths.concat(
					getTypePaths(
						typeParams, 
						parentPath.concat([index])
					)
				);
			},
			[]
		);
	}
	var paramsTypePaths = getTypePaths(paramsType, []);
	
	// Dict associant a chaque typeParam les chemins dans les parametres qui l'utilisent
	// Sert pour deviner les typeParams a partir des types des parametres
	var typeParamsToParamsPaths = _.zipObject(
		_.map(typeParams, function(typeParam) {return typeParam.name;}),
		_.map(Array(typeParams.length), function(){return [];})
	);

	// For each path, if leaf type is a typeParam, adds the path to the typeParams param paths array
	_.each(paramsTypePaths, function(typePath)
	{
		var last = _.last(typePath);
		if(last.base in typeParamsToParamsPaths)
		{
			// The leaf type is a typeParam, use the map to find the index, and adds the path without leaf type
			typeParamsToParamsPaths[last.base].push(_.first(typePath, typePath.length - 1));
		}
	});

	return typeParamsToParamsPaths;
}

function getParamsType(params) {
	return _.map(params, function(param) {
		return typeGraphToCompact(param.type)}
	);
}

function makeGuessTypeArgs(typeParamsToParamsPaths, typeParams) {
	return function(params)
	{
		// Guess templates types from params types
		var paramsType = getParamsType(params);
		return _.zipObject(
			typeParams,
			_.map(typeParamsToParamsPaths, function(paths, typeParam)
			{
				function getTypeArgFromPath(type, path)
				{
					if(path.length == 1)
						return type.params[path[0]];
					var subPath = path.slice(0);
					var index = subPath.shift();	
					return getTypeArgFromPath(type.params[index], subPath);
				}

				var typeArgsInPaths = _.map(paths, function(path)
				{
					if(path.length == 1)
						return paramsType[path[0]];
					var subPath = path.slice(0);
					var index = subPath.shift();
					try
					{
						return getTypeArgFromPath(paramsType[index], subPath);
					}
					catch(err)
					{
						console.log(err)
						error("Type mismatch of param " + funcGraph.params[index].id.name + " for function " + funcGraph.id.name);
					}
				});
				var firstTypeArg = typeArgsInPaths[0];
				_.each(typeArgsInPaths, function(typeArg)
				{
					// If typeArg type is used at different places of parameters types, the instances must be of the same type
					// e.g. if paramsType = [list<T>, pair<T, U>], we can have [list<int>, pair<int, float>] but not [list<int>, pair<float, int>]
					var st = isSameType(typeArg, firstTypeArg);
					if(!st)
						throw "Type params not the same for different params : " + firstTypeArg + " vs " + typeArg;
				});
				return firstTypeArg;
			})
		);
	};
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////

function typeToString(type)
{
	var baseType = getBaseType(type);
	var typeParams = getTypeArgs(type);
	if(typeParams.length == 0)
	{
		return baseType;
	}
	return baseType + "<" + _.map(typeParams, typeToString).join(",") + ">";
}

function typeToCompactString(type)
{
	var baseType = getBaseType(type);
	var typeParams = getTypeArgs(type);
	if(typeParams.length == 0)
	{
		return baseType;
	}
	var ret = baseType + "$" + (_.map(typeParams, typeToCompactString)).join("$");
	return ret;
}

function isStrictSubType(checkedType, refType)
{
	var classDef = library.nodes[checkedType];
	var superClass = classDef.superClass;
	if(superClass)
	{
		if(superClass == refType)
		{
			return true;
		}
		return isStrictSubType(superClass, refType);
	}
}

function findCommonSuperClass(fstType, scdType)
{
	var fstBaseType = getBaseType(fstType);
	var classDef = library.nodes[fstBaseType];
	if(classDef)
	{
		var superClass = classDef.superClass;
		if(superClass)
		{
			if(isStrictSubType(scdType, superClass))
			{
				return superClass;
			}
			return findCommonSuperClass(superClass, scdType);
		}
	}
}


function sameTypes(firstType, secondType)
{
	if(_.isString(firstType))
	{
		return _.isString(secondType) && firstType == secondType;
	}
	if(_.isString(secondType))
		return false;
	var firstTemplates = getTypeArgs(firstType);
	var secondTemplates = getTypeArgs(secondType);
	if(firstTemplates.length != secondTemplates.length)
		return false;
	_(firstTemplates).zip(secondTemplates).each(function(types)
	{
		if(!sameTypes(types[0], types[1]))
			return false;
	});
	return firstType.base == secondType.base;
}

function checkSameTypes(firstType, secondType)
{
	check(sameTypes(firstType, secondType), "Template types are different : " + typeToString(firstType) + " and " + typeToString(secondType));
}