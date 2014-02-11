import QtQuick 2.0
import "../Qml"
import "../JsEngine/Library.js" as Library

Column
{
	id : ports
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
			ports.children[index].modelChanged(path, func, value);
		}
	}	
	
	signal changeModel(variant path, string func, variant param);
	
	Repeater
	{
		id : repeater
		delegate : Port
		{
			z : -index
			
			availableStrings : []
			// ports.nodeType.length > 0 ?  
				// (
					// (ports.context.typeToNode != null && Library.getInputTypes(ports.nodeType)[index] in ports.context.typeToNode) ? 
						// ports.context.typeToNode[Library.getInputTypes(ports.nodeType)[index]] : 
						// []
				// ) :
				// []
				
				
			
			Component.onCompleted : 
			{
				update(ports.currentPortValue);
			}
			
			onChangeModel : 
			{
				ports.changeModel([index].concat(path), func, param);
			}
		}
		model : ListModel
		{
			id : repeaterModel
		}
	}
}
