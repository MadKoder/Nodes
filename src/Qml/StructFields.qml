import QtQuick 2.0
import "../Qml"
import "../JsEngine/Library.js" as Library

Column
{
	id : fields
	spacing : 4
	property variant context : null
	property variant currentValue : null
	property variant types : {}
	property int	nbFields : 0
	visible : nbFields > 0
	property variant fieldMap : null
	
	signal itemSelected(variant item)
	
	signal changeModel(variant path, string func, variant param);

	function modelChanged(path, func, value)
	{
		if(path.length == 0)
		{			
			repeaterModel.clear();
			nbFields = 0;
			var myMap = {};				
			for(var key in value)
			{
				currentValue = value[key];
				repeaterModel.append(
					{
						"fieldId" : key,
						"type" : (types && (key in types)) ? types[key] : "Float"
					}
				);
				var newFieldEdit = children[nbFields];
				myMap[key] = newFieldEdit;
				newFieldEdit.fieldId = key;
				// console.log("field " + key+" type " + newFieldEdit.type);
				nbFields += 1;
			}
			fieldMap = myMap;
		}
		else
		{	
			var key = path[0];
			for(var i = 0; i < repeater.count; i++)
			{
				// console.log("repeaterModel.get(i).fieldId " + repeaterModel.get(i).fieldId);
				// console.log("key " + key);
				if(repeater.itemAt(i).fieldId == key)
				{
					// console.log("item " + i + " value " + value);
					repeater.itemAt(i).modelChanged(path.slice(1), func, value);
				}
			}
		}
	}	
	
	
	Repeater
	{
		id : repeater
		delegate : StructField
		{
			z : -index
			context : fields.context
			// anchors.horizontalCenter : parent.horizontalCenter

			
			Component.onCompleted : 
			{
				modelChanged([], "set", fields.currentValue);
			}
			
			onChangeModel : 
			{
				fields.changeModel(path, func, param);
			}
			
			onItemSelected :		
			{
				fields.itemSelected(item);
			}

		}
		model : ListModel
		{
			id : repeaterModel
		}
	}
}
