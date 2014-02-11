.pragma library

var library = {}

var availableFunctions = [];

function updateAvailableFunctions()
{
	availableFunctions = [];
	for(var key in library.functions)
	{
		availableFunctions.push(key);
	}
}

function setLibrary(lib)
{
	library = lib;
	updateAvailableFunctions();
}

var graph = {};
var typeToNode = {};

function addNodeToType(node, type)
{
	if(!(type in typeToNode))
	{
		typeToNode[type] = []
	}
	typeToNode[type].push(node);
}		

function addFieldsTypes(path, type)
{
	if(type in library.classes)
	{
		var fields = library.classes[type].fields
		if(fields != undefined)
		{
			for(var key in fields)
			{
				var fieldType = fields[key];
				var fieldPath = path+"."+key;
				addNodeToType(fieldPath, fieldType);
				addFieldsTypes(fieldPath, fieldType);
			}
		}
	}
}

function updateTypeToNode()
{
	//console.log("type -> nodes");
	typeToNode = {};
	var constants = graph.constants;
    for(var i = 0; i < constants.length; i++)
	{
		var constant = constants[i];
		var type = "string";
		if("type" in constant)
		{
			type = constant.type;
		}
        if(!(type in typeToNode))
		{
			typeToNode[type] = []
		}
		typeToNode[type].push(constant.id);
		//console.log(type + " : " + constant.id);
    }
    
	var graphNodes = graph.nodes;
    for(var i = 0; i < graphNodes.length; i++)
	{
		var nodeRow = graphNodes[i];
		for(var j = 0; j < nodeRow.length; j++)
		{
			var node = nodeRow[j];
			var type = node.type;
			addNodeToType(node.id, type);
			addFieldsTypes(node.id, type);
			//console.log(type + " : " + node.id);
		}
    }
	for(var key in typeToNode)
	{
		console.log("type "+key+" nodes "+typeToNode[key]);
	}
}

function setGraph(g)
{
	graph = g;
	updateTypeToNode();
}

