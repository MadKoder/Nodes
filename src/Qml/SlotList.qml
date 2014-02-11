import QtQuick 2.0
import "../Qml"
import "../JsEngine/Engine.js" as Engine

Row
{
	id : slots
	spacing : 2
	property variant context : null
	property variant currentPortValue : null
	property string nodeType : ""
	property int	nbPorts : 0
	visible : nbPorts > 0
	
	function modelChanged(path, func, value)
	{
		if(path.length == 0)
		{			
			repeaterModel.clear();
			nbPorts = 0;
			for(var i = 0; i < value.length; i++)
			{
				currentPortValue = value[i];
				repeaterModel.append({index : i});
				nbPorts += 1;
			}
		}
		else
		{
			var index = path.shift();
			slots.children[index].modelChanged(path, func, value);
		}
	}	
	
	signal changeModel(variant path, string func, variant param);
	
	Repeater
	{
		id : repeater
		delegate : Slot
		{
			z : -index
			
			/*availableStrings : slots.nodeType.length > 0 ?  
				(
					(slots.context.typeToNode != null && Engine.getInputTypes(slots.nodeType)[index] in slots.context.typeToNode) ? 
						slots.context.typeToNode[Engine.getInputTypes(slots.nodeType)[index]] : 
						[]
				) :
				[] */
				
				
			
			Component.onCompleted : 
			{
				modelChanged([], "set", slots.currentPortValue);
			}
			
			onChangeModel : 
			{
				slots.changeModel([index].concat(path), func, param);
			}
		}
		model : ListModel
		{
			id : repeaterModel
		}
	}
}
