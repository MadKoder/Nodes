import QtQuick 2.0
import "../Qml"
import "../JsEngine/Engine.js" as Engine

ControlViewList
{
	id : connectionList
	width : group.width + 4
	height : group.height + 4

	function getChild(i)
	{
		return group.children[i];
	}
	
	signal itemSelected(variant item)
	
	Column
	{	
		id : group
		spacing : 2
		
		Repeater
		{
			id : repeater
			delegate : Connection
			{
				Component.onCompleted : 
				{
					modelChanged([], "set", connectionList.currentModel);
				}
				
				onChangeModel : 
				{
					connectionList.changeModel([model.index].concat(path), func, param);
				}
				onItemSelected : connectionList.itemSelected(item)
				/*onRequestAddConnection : 
				{
					newNode.x = x;
					newNode.y = y + height;
					newNode.ask();
				}*/
			}
			model : ListModel
			{
				id : repeaterModel
			}
		}
	}
	
	/*NewNodeEdit
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
			group.children[group.children.length - 2].selected = true;
			group.children[group.children.length - 2].selectIdEdit();
		}
	}*/
}