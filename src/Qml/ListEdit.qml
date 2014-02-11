import QtQuick 2.0
import "../Qml"
import "../JsEngine/Library.js" as Library

Column
{
	id : listEdit
	spacing : 2
	property variant context : null
	property variant currentElementValue : null
	property string nodeType : ""
	visible : repeater.count > 0
	property bool editable : false
	property string type : ""
	
	function modelChanged(path, func, value)
	{
		if(path.length == 0)
		{	
			if(func == "set")
			{
				// console.log("list type ----"+getTemplate(type));
				repeaterModel.clear();
				for(var i = 0; i < value.length; i++)
				{
					currentElementValue = value[i];
					repeaterModel.append(
						{
							index : i,
							"type" : type
						}
					);
				}
			}
			else if(func == "push")
			{
				// console.log("list type ----"+type);
				currentElementValue = value;
				repeaterModel.append(
					{
						index : repeater.count,
						"type" : type
					}
				);
			}
		}
		else
		{
			var index = path.shift();
			// console.log("index " + index);
			repeater.itemAt(index).modelChanged(path, func, value);
		}
	}	
	
	signal changeModel(variant path, string func, variant param);
	
	signal itemSelected(variant item);
	
	Repeater
	{
		id : repeater
		delegate : Expression
		{
			// anchors.verticalCenter : listEdit.verticalCenter
			//anchors.verticalCenter : listEdit.verticalCenter
			type : listEdit.type;
			
			Component.onCompleted : 
			{
				modelChanged([], "set", listEdit.currentElementValue);
			}
			
			onChangeModel : 
			{
				console.log("listEdit item " + index);
				listEdit.changeModel([index].concat(path), func, param);
			}
			
			onItemSelected :
			{
				listEdit.itemSelected(item);
			}
		}
		model : ListModel
		{
			id : repeaterModel
		}
	}
	
	Component.onCompleted :
	{
		addButton.visible = editable;
		addButton.enabled = editable;
	}
	
	onEditableChanged :
	{
		addButton.visible = editable;
		addButton.enabled = editable;
	}
	
	Button
	{
		id : addButton
		z : -1
		text : "Add"
		enabled : false
		visible : false
		onClicked : 
		{
			listEdit.changeModel([], "push", {
						"get" : "cube"
					});
		}
	}
}
