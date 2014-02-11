import QtQuick 2.0
import "../Qml"
import "../JsEngine/Engine.js" as Engine

Row
{
	id : nodeSet
	spacing : 0
	property variant currentNodeRowModel : null
	property variant context : null
			
	function modelChanged(path, func, value)
	{
		if(path.length == 0)
		{
			repeaterModel.clear();
			for(var i = 0; i < value.length; i++)
			{
				currentNodeRowModel = value[i];
				repeaterModel.append({index : i});
			}
		}
		else
		{
			var index = path.shift();
			console.log("modelChanged " + index);
			children[index].modelChanged(path, func, value);
		}
	}	
	
	signal itemSelected(variant item)
	signal changeModel(variant path, string func, variant param);
	signal askingForNewNode();
	
	Repeater
	{
		id : repeater
		delegate : NodeRow
		{
			context : nodeSet.context
			
			Component.onCompleted : 
			{
				modelChanged([], "set", nodeSet.currentNodeRowModel);				
			}
			
			onChangeModel :
			{
				nodeSet.changeModel([index].concat(path), func, param);
			}
			
			onAskingForNewNode:
			{
				nodeSet.askingForNewNode();
			}
			
			onItemSelected : nodeSet.itemSelected(item)
		}
		model : ListModel
		{
			id : repeaterModel
		}
	}
}