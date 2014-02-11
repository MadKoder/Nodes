import QtQuick 2.0
import "../Qml"
import "../JsEngine/Engine.js" as Engine
import "../JsEngine/Tools.js" as Tools

Selectable
{
	id : expression
	width : group.width + 4 
	height : group.height + 4
	property bool initialised : false
	property string type : ""
	
	function structFieldChangeModel(path, func, param)
	{	
		changeModel(["fields"].concat(path), func, param);
	}
	
	function funcOrArrayChangeModel(path, func, param)
	{	
		console.log("funcOrArrayChangeModel " + path);
		changeModel(path, func, param);
	}
	
	//signal itemSelected(variant item)
	function funcSelected()
	{
		select();
	}

	function set(value)
	{
		if(Tools.isArray(value))
		{
			// console.log("node");
			listEditLoader.setSource("ListEdit.qml");
			listEditLoader.item.modelChanged([], "set", value);
			listEditLoader.item.changeModel.connect(funcOrArrayChangeModel);
			//listEditLoader.item.itemSelected.connect(itemSelected);
		} else if (Tools.isString(value))
		{
			// console.log("lit");
			textFieldValue.text = value;
			textFieldValue.visible = true;
			type = "string"
		} else if(Tools.isNumber(value))
		{
			textFieldValue.text = value;
			textFieldValue.visible = true;
			type = "number"
		} else if("type" in value)
		{
			// console.log("node");
			structFieldLoader.setSource("StructFields.qml");
			structFieldLoader.item.modelChanged([], "set", value.fields);
			structFieldLoader.item.changeModel.connect(structFieldChangeModel);
			structFieldLoader.item.itemSelected.connect(itemSelected);
		} else if("func" in value)
		{
			// console.log("func");
			funcEditLoader.setSource("FuncEdit.qml");
			funcEditLoader.item.modelChanged([], "set", value);
			funcEditLoader.item.changeModel.connect(funcOrArrayChangeModel);
			funcEditLoader.item.itemSelected.connect(itemSelected);
			funcEditLoader.item.funcSelected.connect(funcSelected);
		} else if("get" in value)
		{
			// console.log("get");
			textFieldValue.set(value.get);
			textFieldValue.type = "get";
			textFieldValue.visible = true;
		}
		initialised = true;
	}	
	
	function modelChanged(path, func, value)
	{
		if(!initialised)
			set(value);
		else
		{
			// console.log("path " + path);
			// console.log("value " + value);
			if(path.length == 0)
			{
				set(value);
			}
			else if(textFieldValue.type == "get")
			{			
				textFieldValue.set(value);
				textFieldValue.visible = true;
			}
			else
			{
				if(structFieldLoader.item != null)
				{
					structFieldLoader.item.modelChanged(path.slice(1), func, value);
					
				} 
				else if(listEditLoader.item != null)
				{
					listEditLoader.item.modelChanged(path, func, value);
				}
				else
				{
					funcEditLoader.item.modelChanged(path, func, value);
				}
			}
		}
	}	
	
	signal changeModel(variant path, string func, variant param);
	
	Row
	{
		id : group
		spacing: 2
		x : 2
		y : 2
	
		TextEdit
		{
			id : textFieldValue
			text : ""
			visible:false
			
			onChangeModel :
			{
				if(type == "lit")
				{
					expression.changeModel([], func, param);
				}
				else if(type == "get")
				{
					expression.changeModel(["get"], func, param);
				}
			}
			
			onSelected : 
			{
				expression.select();
			}
		}
		
		Loader
		{
			id : listEditLoader		
		}
		
		Loader
		{
			id : structFieldLoader		
		}
		
		Loader
		{
			id : funcEditLoader		
		}
	}
}