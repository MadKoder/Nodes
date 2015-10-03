function getBaseType(type)
{
	return type.base;
}

function getTypeParams(type)
{
	return type.params;
}

function makeBaseType(typeStr)
{
	return {
		base : typeStr,
		args : []
	}
}


/////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////

function typeToString(type)
{
	var baseType = getBaseType(type);
	var typeParams = getTypeParams(type);
	if(typeParams.length == 0)
	{
		return baseType;
	}
	return baseType + "<" + _.map(typeParams, typeToString).join(",") + ">";
}

function typeToCompactString(type)
{
	var baseType = getBaseType(type);
	var typeParams = getTypeParams(type);
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

function isSameOrSubType(checkedType, refType)
{
	var checkedBaseType = getBaseType(checkedType);
	var refBaseType = getBaseType(refType);
	if(checkedBaseType != refBaseType)
	{
		if(refBaseType == "float" && checkedBaseType == "int")
		{
			return true;
		}
		if(checkedType in library.nodes)
		{
			return isStrictSubType(checkedType, refType);
		}
		return false;
	}
	var checkedTypeParams = getTypeParams(checkedType);
	var refTypeParams = getTypeParams(refType);
	if(checkedTypeParams.length != refTypeParams.length)
	{
		return false;
	}

	// Empty list is always sub-type of any other list type
	if((checkedBaseType == "list") && (checkedTypeParams[0] == ""))
	{
		return true
	}

	// Empty dict is always sub-type of any other dict type
	if((checkedBaseType == "dict") && (checkedTypeParams[1] == ""))
	{
		return true
	}

	if(!(_(checkedTypeParams).zip(refTypeParams).map(function(types)
	{
		return isSameOrSubType(types[0], types[1]);
	}).every()))
	{
		return false;
	}
	return true;
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

function getCommonSuperClass(fstType, scdType)
{
	// return the most generic of the two types
	if(isSameOrSubType(fstType, scdType))
		return scdType;
	if(isSameOrSubType(scdType, fstType))
		return fstType;
	var commonAncestor = findCommonSuperClass(fstType, scdType)
	if(commonAncestor != undefined)
		return commonAncestor;
	error("Type parameters are not compatible : " + typeToString(fstType) + " and " + typeToString(scdType))
	// return undefined;
}

function sameTypes(firstType, secondType)
{
	if(_.isString(firstType))
	{
		return _.isString(secondType) && firstType == secondType;
	}
	if(_.isString(secondType))
		return false;
	var firstTemplates = getTypeParams(firstType);
	var secondTemplates = getTypeParams(secondType);
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