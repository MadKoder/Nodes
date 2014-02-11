import QtQuick 2.0
import "../Qml"
import "../JsEngine/Engine.js" as Engine

ControlViewList
{
	id : actionList
	width : group.width + 4
	height : group.height + 4
	property variant context : null

	signal itemSelected(variant item)
	signal askingForNewNode();
	
	Column
	{	
		x : 2
		y : 2
		id : group
		spacing : 2
		
		Repeater
		{
			id : repeater
			delegate : Action
			{
				context : actionList.context;
				
				Component.onCompleted : 
				{
					modelChanged([], "set", actionList.currentModel);
				}
				
				onChangeModel : 
				{
					actionList.changeModel([model.index].concat(path), func, param);
				}
				onItemSelected : actionList.itemSelected(item)				
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
				// focus = true;
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
			action : true
			// visible : true
			
			onNewNode : 
			{
				var val 
				actionList.changeModel
				(
					[], 
					"push", 
					value
				);
				repeater.itemAt(repeater.count - 1).selected = true;
				repeater.itemAt(repeater.count - 1).selectIdEdit();
			}
		}
	}
}