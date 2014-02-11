import QtQuick 2.0
import "../Qml"
import "../JsEngine/Engine.js" as Engine
import "Graph.js" as Graph

ControlViewList
{
	id : nodeRow
	width : group.width + 10
	height : group.height + 10
	property variant context : null
		
	function getChild(i)
	{
		return group.children[i];
	}
	
	signal itemSelected(variant item);
	
	signal askingForNewNode();
	
	Column
	{	
		id : group
		spacing : 5
		
		Repeater
		{
			id : repeater
			
			delegate : Node
			{
				context : nodeRow.context
				
				Component.onCompleted : 
				{
					type = Graph.typeToString(nodeRow.currentModel.type);
					modelChanged([], "set", nodeRow.currentModel);
				}
				
				onChangeModel : 
				{
					console.log("onChangeModel " + path + " " + func);
					nodeRow.changeModel([model.index].concat(path), func, param);
				}
				onItemSelected : nodeRow.itemSelected(item)
				onRequestAddNode : 
				{
					newNode.x = x;
					newNode.y = y + height;
					newNode.ask();
				}
			}
			model : ListModel
			{
				id : repeaterModel
			}
		}
		Button
		{
			id : addButton
			z : -1
			text : "Add"
			// enabled : false
			// visible : false
			onClicked : 
			{
				focus = true;
				// newNode.x = x;
				// newNode.y = y + height;
				askingForNewNode();
				newNode.ask();
			}
		}
		
		NewNodeEdit
		{
			id : newNode
			z : 1
			context : nodeRow.context
			
			onNewNode : 
			{
				nodeRow.changeModel
				(
					[], 
					"push", 
					value
				);
				repeater.itemAt(repeater.count - 1).selected = true;
				repeater.itemAt(repeater.count - 1).selectIdEdit();
			}
		}
		
		// TextEdit
		// {
			// id : newNode
			// z : 1
			// visible : false
			
			// function ask()
			// {
				// visible = true;
				// selectWithText();
			// }
			
			// onChangeModel :
			// {
				// nodeRow.changeModel
				// (
					// [], 
					// "push", 
					// param
				// );
				// group.children[group.children.length - 2].selected = true;
				// group.children[group.children.length - 2].selectIdEdit();
			// }
		// }
	}
	
	
	
	// NewNodeEdit
	// {
		// id : newNode
		// z : 1
		// context : nodeRow.context
		
		// onNewNode : 
		// {
			// nodeRow.changeModel
			// (
				// [], 
				// "push", 
				// value
			// );
			// group.children[group.children.length - 2].selected = true;
			// group.children[group.children.length - 2].selectIdEdit();
		// }
	// }
	
	
}