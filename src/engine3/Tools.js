function error(str)
{
	throw "Compilation error : " + str;
}

function check(test, str)
{
	if(!test)
		throw "Compilation error. " + str;
}

function isInArray(value, array) {
	return array.indexOf(value) > -1;
}

function isNumber(expr)
{
	return isInArray(expr.type, ["Int", "Float"]);
}

function getNbProperties(object) {
	return Object.keys(object).length;
}

var storeId = 0;
function Store(v, type) 
{
	this.val = v;
	this.type = type;

	this.sinks = [];
	
	// DEBUG
	this.id = storeId;
	storeId++;

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
