function isString(val)
{
	return (typeof val == 'string' || val instanceof String);
}

function isNumber(val)
{
	return (typeof val == 'number' || val instanceof Number);
}

function isLiteral(val)
{
	return (typeof val == 'string' || val instanceof String || typeof val == 'number' || val instanceof Number);
}

function isArray(val)
{
	return val instanceof Array;
}	

function getBaseType(type)
{
	if(isString(type))
	{
		return type;
	}
	return type.base;
}