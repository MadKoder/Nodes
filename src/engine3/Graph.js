
//var _=null;
function setLodash(l)
{
	_=l;
}

function write(str, val)
{
	if(val != undefined)
	{
		console.log(str + " : " + val);
	}
	else
	{
		console.log(str);
	}
}

function typeToString(type)
{
	if(isString(type))
	{
		return type;
	}
	var str = type.base + "<";
	for(var i = 0; i < type.params.length; i++)
	{
		str += typeToString(type.params[i]);
		if(i < type.params.length - 1)
		{
			str += ", "
		}
	}
	str += ">";
	return str;
}

function getTemplates(type)
{
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

var functionList =
{
	"typeToString" : typeToString
};

function apply(func, val)
{
	return functionList[func](val);
}

function getPath(path)
{
	var pathStr = "[";
	for(var i = 0; i < path.length; i++)
	{
		pathStr += path[i] + " ";
	}
	pathStr += "]";
	return pathStr;
}

//function applyFunc(parent, index, func, param)
function applyFunc(graph, path, func, param)
{
	var index = path[path.length - 1];
	var parent = getLastParent(graph, path.slice(0));
	console.log("applyFunc " + func);
	if(func == "remove")
	{
		parent.splice(index, 1);
	}
	else if(func == "set")
	{
		parent[index] = param;
	}
	else if(func == "push")
	{
		parent[index].push(param);
	}
	return graph;
}

function getLastParent(struct, path)
{	
	if(path.length > 1)
	{
		var indexOrKey = path.shift();
		//console.log("indexOrKey " + indexOrKey);
		return getLastParent(struct[indexOrKey], path);
	}
	else
	{
		return struct;
	}
}

function getLastElementInStruct(struct, path)
{	
	if(path.length > 0)
	{
		var indexOrKey = path.shift();
		//console.log("indexOrKey " + indexOrKey);
		return getLastElementInStruct(struct[indexOrKey], path);
	}
	else
	{
		return struct;
	}
}

function getLastElement(graph, path)
{
	return getLastElementInStruct(graph, path);
}

/*function print(graph)
{
	var constants = graph.constants;
    var nodes = {};
    for(var i = 0; i < constants.length; i++)
	{
		var constant = constants[i];
        nodes[constant.id] = new Cst(constant.val);
    }
    
	var graphNodes = graph.nodes;
    for(var i = 0; i < graphNodes.length; i++)
	{
		var nodeRow = graphNodes[i];
		for(var j = 0; j < nodeRow.length; j++)
		{
			var node = nodeRow[j];
			var sources = node["in"].map
			(
				function(x)
				{
					return nodes[x];
				}
			);
			nodes[node.id] = new classes[node.type].builder(sources);
		}
    }
   
} */

//var fileName = "../Data/HtmlBuilder/makeXml.json";
// var fileName = "../Data/testActions.json";
// var fileName = "../Data/test.json";
// var fileName = "../Data/testNewEngine.json";
// var fileName = "../Data/testFunction.json";
// var fileName = "../HtmlNodes/04-Interaction/test.json";
var fileName = "../HtmlNodes/05-NewModel/test0.json";
var saveFileName = "../HtmlNodes/04-Interaction/testEdit.json";

function convert(graph) 
{   
	var nodes = {};
	console.log(graph);
	var constants = graph.constants;
	console.log("----------------");
	console.log(constants);
	for(var i = 0; i < constants.length; i++)
	{
		var constant = constants[i];
        nodes[constant.id] = 
		{
			"type": 
			{
				"template": "Store",
				"params":
				{
					"type": constant.type
				}
			},			
			"val": constant.val
		};
    }
    	
	var graphNodes = graph.nodes;
    for(var i = 0; i < graphNodes.length; i++)
	{
		var nodeRow = graphNodes[i];
		for(var j = 0; j < nodeRow.length; j++)
		{
			var node = nodeRow[j];
			var newNode = 
			{
				"type": node.type
			};
			
			var inputs = ["first", "second", "third"];			
			for(var k = 0; k < node["in"].length; k++)
			{
				newNode[inputs[k]] = node["in"][k];
			};
			nodes[node.id] = newNode;
		}
    }
		
	return nodes;
	
	var graphActions = graph.actions;
    for(var i = 0; i < graphActions.length; i++)
	{
		var action = graphActions[i];
		nodes[action.id] = makeAction(action, nodes);
    }
	
	var connections = {};
	var graphConnections = graph.connections;
    for(var i = 0; i < graphConnections.length; i++)
	{
		var connection = graphConnections[i];
		var sinks = [];
		for(var j = 0; j < connection.sinks.length; j++)
		{
			sinks.push(nodes[connection.sinks[j]]);
		}
		
		connections[connection.source] = new Connection(sinks);
    }
	
    connections.main.send(null);
}

function parseExpr(str, library, parser)
{
	var expr;
	var type = "";
	if(/^\s*$/.test(str))
	{
		return {
			"expr" : "",
			"type" : ""
		};
	}
	if(/"^([^"]*)$"/.test(str))
	{
		write("String !!!");
		expr = RegExp.$1;
		type = "String";
	} else
	{
		
		write("val",str);
		write("val.length",str.length);
		expr = parser.parse(str);
		if(isNumber(expr))
		{
			write("isNumber")
			type = "Float";
		}
	}
	return {
		"expr" : expr,
		"type" : type
	};
}

function getNbTabs(str)
{
	var match = /^\t*/.exec(str);
	if(match != null)
		return match[0].length;
	return 0;
}

function commented(line)
{
	return /#.*/.test(line.trim());
}

function empty(line)
{
	return line.trim().length == 0;
}

function makeValStr(lines, i, state)
{
	var valStr = "";
	var baseIndent = getNbTabs(lines[i]);
	var previousIndent = baseIndent;
	var previousDeltaIndent = 0;
	var firstLineIndex = lineIndex = i;
	var openBraces = 0;
	var addBraces = _.range(20).map(function(){return false;});
	while(lineIndex < lines.length)
	{	
		var line = lines[lineIndex];
		var trimedLine = line.trim();
		if(!(commented(line) ||empty(line)))
		{
			var currentIndent = getNbTabs(line);
			if((currentIndent <= baseIndent) && (lineIndex != firstLineIndex))
				break;
			var deltaIndent = currentIndent - baseIndent
			
			if((currentIndent > previousIndent) && addBraces[deltaIndent])
			{
				valStr += "(";
				openBraces++;
			} else for(var i = previousDeltaIndent; i > deltaIndent; i--)
			{
				if(addBraces[i])
				{
					valStr += ")";
					openBraces--;
				}
			}
			if(currentIndent <= previousIndent && addBraces[deltaIndent])
				valStr += ",";
			addBraces[deltaIndent + 1] = /.*:$/.test(trimedLine) || /.*=>$/.test(trimedLine);
			if(/.*:$/.test(trimedLine))
			{
				valStr += " " + trimedLine.slice(0, -1);	
			}
			else
			{
				valStr += " " + trimedLine;
			}
			previousIndent = currentIndent;
			previousDeltaIndent = deltaIndent
		}
		lineIndex++;
	}
	for(var i = 0; i < openBraces; i++)
	{
		valStr += ")";
	}
	if(i != lineIndex-1)
	{
		i = lineIndex-1;
	}
	valStr = state + " " + valStr;
	return [valStr, i];
}

function codeToGraph(code, library, parser)
{
	// var lines = code.split(/\r\n|\r|\n/);
	var lines = code.split(/\r\n|\r|\n/);
	write("Line number", lines.length);
	var actionRegEx = /\s*([a-zA-Z]\w*)\s+([a-zA-Z]\w*)\s+/g;
	var paramRegEx = /\s*([a-zA-Z]\w*)\s+([a-zA-Z]\w*)\s+/g;
	var nodes = [];
	var actions = [];
	var structsAndFuncs =[];
	var events =[];
	var state = "nodes";
	// for(var key in library.classes)
	// {
		// write("class",key);
	// }
	for(var i = 0; i < lines.length; i++)
	{
		var line = lines[i].trim();
		if(/actions\s*:/.test(line))
		{
			state = "actions"
		} else if(/nodes\s*:/.test(line))
		{
			state = "nodes"
		} else if(/functions\s*:/.test(line))
		{
			state = "functions"
		} else if(/structs\s*:/.test(line))
		{
			state = "structs"
		} else if(/events\s*:/.test(line))
		{
			state = "events"
		}  else if(/trees\s*:/.test(line))
		{
			state = "trees"
		} 
		else
		{
			if(commented(line) || empty(line))
				continue;
			var typeIdAndParams = line.split(":");
			var valStr = typeIdAndParams.length > 1 ? typeIdAndParams.slice(1).join(":").trim() : null;
			
			var typeAndId = typeIdAndParams[0].trim().split(/\s+/);
			var type = ""
			var id = typeAndId[0];
			if(typeAndId.length > 1)
			{
				type = typeAndId[0];
				id = typeAndId[1];
			}

			var res = makeValStr(lines, i, state);
			valStr = res[0];
			i = res[1];
			
			var node = {};
			if(valStr != undefined)
			{
				//valStr = "nodes " + valStr;
				try
				{
					parsed = parser.parse(valStr);
				}
				catch(e)
				{
					console.log("Parse error\n---------------------------");
					console.log("Line " + e.line + ", column " + e.column);
					console.log(e.message);
					console.log(valStr);
					throw "Parsing error " + valStr;
				}
				if(state == "functions")
					structsAndFuncs.push({"func" : parsed});
				else if(state == "structs")
					structsAndFuncs.push({"struct" : parsed});
				else if(state == "trees")
					structsAndFuncs.push({"tree" : parsed});
				else if(state == "events")
					events.push(parsed)
				else if(state == "nodes")
				{
					if(type.length == 0)
					{
						if("type" in node)
						{
							type = node.type;
						}
					}						
					nodes.push([parsed]);
				}
				else if(state == "actions")
					actions.push(parsed);
				
			}					
		}
	}
	
	return {
		//functions: functions,
		"constants": [],
		"nodes": nodes,
		"actions" : actions,
		"connections": [],
		structsAndFuncs : structsAndFuncs,
		events : events
	}
}

function loadCode(fileName, library, parser)
{
	var code = interf.load(fileName);
	return codeToGraph(code, library, parser);
}

function load(library, parser)
{
	console.log("Load --------------------------------------------------- ");
	var loaded = interf.load(fileName);
	var graph = JSON.parse(loaded);
	// interf.save(JSON.stringify(convert(graph), undefined, 4), "../Data/test2.json");
	//var graph = loadCode("../HtmlNodes/04-Interaction/text4.txt", library, parser);
	return graph;
}

function save(graph)
{
	interf.save(JSON.stringify(graph, undefined, 4), saveFileName);
}
