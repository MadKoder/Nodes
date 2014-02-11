import QtQuick 2.0
import QtQuick.Controls 1.0
import QtQuick.Layouts 1.0
import "../Qml"
import "../JsEngine/Library.js" as Library
import "Graph.js" as Graph
import "TypeToNode.js" as TypeToNode
import "Shared.js" as Shared
import "../JsEngine/Tools.js" as Tools
import "../JsEngine/UserLibrary.js" as UserLibrary
import "../JsEngine/Engine.js" as Engine
import "../JsEngine/Parser.js" as Parser
import "../../libs/lodash.js" as Lodash
import "Selectable.js" as Selectable

Column
{
	id : main
	anchors.left : parent.left
	anchors.right : parent.right
	spacing : 10
	property variant context : 
	{
		"typeToNode" : {},
		"library" : {}
	}
	property variant graph : null
	property variant library : null
	
	property variant map :
	{
		"constants" : constants,
		"nodes" : nodes,
		"actions" : actions,
		"connections" : connections
	}
		
	function changeModel(path, func, param)
	{
		console.log("changeModel : " + func + " " + param + " at " + Graph.getPath(path));
		if(path.length > 0)
		{
			var lastIndex = path[path.length - 1];
			var lastParent = Graph.getLastParent(graph, path.slice(0));
			graph = Graph.applyFunc(graph, path, func, param);
		}
		else
		{
			Graph.modelChangedFuncOnRoot(func, param);
		}
		context.typeToNode = TypeToNode.getTypeToNode(graph);
		
		if(func == "remove" || func == "push")
		{	
			var value;
			if(func == "remove")
			{
				value = Graph.getLastParent(graph, path.slice(0));
				path.pop();
			}
			else
			{
				value = Graph.getLastElement(graph, path.slice(0));
			}
			map[path[0]].modelChanged(path.slice(1), "set", value);
			Shared.setGraph(graph);
		}
		else
		{
			map[path[0]].modelChanged(path.slice(1), func, param);
		}
	}
	
	function update()
	{
		constants.modelChanged([], "set", graph.constants);
		nodes.modelChanged([], "set", graph.nodes);
		actions.modelChanged([], "set", graph.actions);
		connections.modelChanged([], "set", graph.connections);
		context.typeToNode = TypeToNode.getTypeToNode(graph);
	}
	
	Component.onCompleted : 
	{
		// var wrapped = Lodash._([1, 2, 3]);
		// console.log("\n-----------", wrapped.reduce(function(sum, num) {
				  // return sum + num;
				// }));
		Graph.setLodash(Lodash._);
		// Object.getOwnPropertyNames(Lodash).forEach(function(key){
			// console.log('Lodash.' + key + '=' + Lodash[key]);
		// });


		
		library = 
		{
			"classes" : Library.classes,
			"functions" : Library.functions,
			"actions" : Library.actions
		};
		library = UserLibrary.incLibrary(library);
		context.library = library;
		Shared.setLibrary(library);
		graph = Graph.load(library, Parser.parser);
		Shared.setGraph(graph);
		update();
		nodesView.focus = true;
	}
	
	Keys.onPressed: 
	{
		if(event.key == Qt.Key_F5)
		{
			Nodes.buildFinalNodes(resultZone);
		}
	}

	function run()
	{
		var lib = 
		{
			"classes" : Library.classes,
			"functions" : Library.functions,
			"actions" : Library.actions
		};
		lib = UserLibrary.incLibrary(lib);
		Engine.run(graph, lib);
	}
	
	Row
	{
		Button
		{
			text : "Run"
			onClicked : 
			{
				run();
			}
		}
		
		Button
		{
			text : "Save"
			onClicked : 
			{
				Graph.save(graph);
			}
		}
		
		Button
		{
			text : "Load"
			onClicked : 
			{
				Graph.load(library, Parser.parser);
				update();
			}
		}
		
		Button
		{
			text : "Export"
			onClicked : 
			{
				Graph.exportGraph(graph);
			}
		}
	}
	
	SplitView
	{
		orientation: Qt.Vertical
		anchors.left : parent.left
		anchors.right : parent.right
		// anchors.bottom : parent.bottom
		// height : 800
	
		
		ScrollView
		{
			id : nodesView
			Layout.minimumHeight: 100
			height : 400
			anchors.left : parent.left
			anchors.right : parent.right
			clip : true
			flickableItem.contentWidth : nodesRow.width
			flickableItem.contentHeight : nodesRow.height
			flickableItem.interactive : true
		
			
			Row
			{
				id : nodesRow
				height : constants.height > nodes.height ? constants.height : nodes.height
				
				onHeightChanged :
				{
					nodesView.flickableItem.contentY = height;
				}
				
				NodeRow
				{
					id : constants
					context : main.context
					
					onChangeModel :
					{
						main.changeModel(["constants"].concat(path), func, param);
					}
					
					onItemSelected : Selectable.itemSelected(item)
				}
				
				NodeSet
				{
					id : nodes
					context : main.context
					
					onChangeModel :
					{
						main.changeModel(["nodes"].concat(path), func, param);
					}
					
					onAskingForNewNode:
					{
						nodesView.focus = true;
					}
					
					onItemSelected : Selectable.itemSelected(item)
				}
			}
		}
		
		ScrollView
		{
			id : actionsView
			Layout.minimumHeight: 100
			height : 500
			flickableItem.contentWidth : actions.width
			flickableItem.contentHeight : actions.height
			flickableItem.interactive : true
			
			ActionList
			{
				id : actions
				
				context : main.context
				clip : true
				
				onChangeModel :
				{
					main.changeModel(["actions"].concat(path), func, param);
				}
				
				onItemSelected : Selectable.itemSelected(item)
				
				onAskingForNewNode:
				{
					actionsView.focus = true;
				}
				
				onHeightChanged :
				{
					actionsView.flickableItem.contentY = height;
				}
			}
		}
		
		ConnectionList
		{
			id : connections
			height : 300
			// width : 800
			
			onChangeModel :
			{
				main.changeModel(["connections"].concat(path), func, param);
			}
			
			onItemSelected : Selectable.itemSelected(item)
		}
	}
}