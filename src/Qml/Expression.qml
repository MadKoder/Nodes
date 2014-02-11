import QtQuick 2.0
import "Shared.js" as Shared
import "../Qml"
import "../JsEngine/Engine.js" as Engine
import "../JsEngine/Tools.js" as Tools
import "Graph.js" as Graph

Selectable
{
	id : expression
	width : group.width + 4 
	height : group.height + 4
	property bool initialised : false
	property variant context : null
	property string type : (model && model.type) ? model.type : ""
	
	function structFieldChangeModel(path, func, param)
	{	
		changeModel(["fields"].concat(path), func, param);
	}
	
	function funcOrArrayChangeModel(path, func, param)
	{	
		changeModel(path, func, param);
	}
	
	function funcSelected()
	{
		select();
	}
	
	function set(value)
	{
		if (Tools.isNumber(value))
		{
			// console.log("lit");
			textFieldValue.text = value;
			textFieldValue.visible = true;
		}
		else if(Tools.isString(value))
		{
			textFieldValue.text = '"'+value+'"';
			textFieldValue.visible = true;
		}
		else if(Tools.isArray(value))
		{
			// console.log("node");
			listEditLoader.visible = true;
			listEditLoader.setSource("ListEdit.qml");
			listEditLoader.item.type = Graph.getTemplate(type);
			listEditLoader.item.modelChanged([], "set", value);
			listEditLoader.item.changeModel.connect(funcOrArrayChangeModel);
			listEditLoader.item.editable = true;
			//listEditLoader.item.itemSelected.connect(itemSelected);
		}
		else
		{
			if("fields" in value)
			{
				// console.log("node");
				structFieldLoader.visible = true;
				structFieldLoader.setSource("StructFields.qml");
				structFieldLoader.item.context = context;
				structFieldLoader.item.modelChanged([], "set", value.fields);
				structFieldLoader.item.changeModel.connect(structFieldChangeModel);
				structFieldLoader.item.itemSelected.connect(itemSelected);
			} else if("params" in value)
			{
				// console.log("func");
				funcEditLoader.visible = true;
				funcEditLoader.setSource("FuncEdit.qml");
				// console.log("context"+context);
				funcEditLoader.item.context = context;
				funcEditLoader.item.modelChanged([], "set", value);
				funcEditLoader.item.changeModel.connect(funcOrArrayChangeModel);
				funcEditLoader.item.itemSelected.connect(itemSelected);
				funcEditLoader.item.funcSelected.connect(funcSelected);
				funcEditLoader.item.expression = expression;
				
				
			} else if("get" in value)
			{
				// console.log("get");
				textFieldValue.set(value.get);
				textFieldValue.type = "get";
				textFieldValue.visible = true;
			}
		}
		initialised = true;
	}	
	
	function reset()
	{
		initialised = false;
		structFieldLoader.visible = false;
		funcEditLoader.visible = false;
		listEditLoader.visible = false;
		textFieldValue.set("");
		textFieldValue.visible = false;
	}
	
	function modelChanged(path, func, value)
	{
		if(!initialised)
			set(value);
			
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
	
	signal changeModel(variant path, string func, variant param);
	
	function isFunc(param)
	{
		return /(\D(?:\w*))\(([^)]*)\)/.test(param);
	}
	
	function parseParam(param)
	{
		if(/^\d.*$/.test(param))
		{
			return param;
		} else if(/^"(.*)"$/.test(param))
		{
			return RegExp.$1;
		}
		else if(isFunc(param))
		{
			return 	{
				"func" : func,
				"params" : parseParams(RegExp.$2.replace(/\s/g,"").split(","))
			}
		}
		{
			return 	{
				"get" : param
			}
		}
	}
	
	function parseParams(params)
	{
		var paramList = [];
		for(var i = 0; i < params.length; i++)
		{
			paramList.push(parseParam(params[i]));
		}
		return paramList;
	}
	
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
			availableStrings : Shared.typeToNode[expression.type]
			
			onChangeModel :
			{
				// var isFunc = /(\D(?:\w*))\(((?:\s*\w+\s*,)*)\s*(\w*)\s*\)/.test(param);
				// var isFunc = /(\D(?:\w*))\(([^)]*)\)/.test(param);
				// console.log("func ? "+isFunc);
				if(isFunc(param))
				{
					var func = RegExp.$1;
					// console.log("func "+RegExp.$1);
					// console.log("RegExp.$2 "+RegExp.$2);
					var params = RegExp.$2.replace(/\s/g,"").split(",");
					expression.reset();
					expression.changeModel([], "set", 
					{
						"func" : func,
						"params" : parseParams(params)
						
					});
				}
				else
				{
					if(type == "lit")
					{
						if(/^\d.*$/.test(param))
						{
							// console.log("param "+param);
							// console.log("parseFloat(param) "+parseFloat(param));
							expression.changeModel([], func, parseFloat(param.replace(/,/,".")));
						}
						else
						{
							expression.changeModel([], func, param);
						}
					}
					else if(type == "get")
					{
						// Si ce n'est pas un chiffre, tente la decomposition en chemin
						if(!/^\d.*$/.test(param))
						{
							var array = param.split(".");
							if(array.length > 1)
							{
								expression.changeModel(["get"], func, array);
								return;
							}
						}
						expression.changeModel(["get"], func, param);
					}
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