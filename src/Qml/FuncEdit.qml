import QtQuick 2.0
import "../Qml"
import "../JsEngine/Engine.js" as Engine
import "Shared.js" as Shared

Row
{
	id : funcEdit
	spacing: 2
	property variant context : parent ? parent.context : null
	property variant expression : null

	property variant map : 
	{
		"params" : paramsEdit,
		"type" : funcNameEdit
	}
	
	function modelChanged(path, func, value)
	{
		// console.log("path " + path);
		// console.log("value " + value);
		if(path.length == 0)
		{
			for(var key in value)
			{
				// console.log("struct key " + key);

				map[key].modelChanged(path, func, value[key]);
			}
		}
		else
		{
			var key = path.shift();
			map[key].modelChanged(path, func, value);
		}
	}	
	
	signal changeModel(variant path, string func, variant param);
	
	signal itemSelected(variant item);
	
	signal funcSelected();
	
	Keys.onPressed:
	{
		event.accepted = true;
		if(selected && ((event.key == Qt.Key_Enter) || (event.key == Qt.Key_Return)))
		{
			console.log("enter------------------");
			paramsEdit.children[0].select();
		}
	}
		
	TextEdit
	{
		id : funcNameEdit
		text: ""
		anchors.verticalCenter : parent.verticalCenter
		availableStrings : Shared.availableFunctions.concat(expression.type in Shared.typeToNode ? Shared.typeToNode[expression.type] : [])

		onChangeModel :
		{
			// var arity = funcEdit.context.library[param].in.length;
			if(param in Shared.library.functions)
			{
				var arity = Shared.library.functions[param].in.length;
				console.log("Function arity "+arity);
				if(arity > paramsEdit.nbElements)
				{
					for(var i = paramsEdit.nbElements; i < arity; i++)
					{
						funcEdit.changeModel(["params"], "push", 0);
					}
				} else if(arity < paramsEdit.nbElements)
				{
					for(var i = arity; i < paramsEdit.nbElements; i++)
					{
						var path = ["params"];
						path.push(i);
						funcEdit.changeModel(path, "remove", null);
					}
				}
			} 
			else 
			{
				var nodeFound = false;
				console.log("type "+expression.type);
				var nodes = Shared.typeToNode[expression.type];
				console.log("nodes "+nodes);
				console.log("nodes[i] "+nodes[i]);
				console.log("----------------------- ");
				if(nodes != undefined)
				{
					for(var i = 0; i < nodes.length; i++)
					{
						console.log("nodes[i] "+nodes[i]);
				
						if(nodes[i] == param)
						{
							console.log("Found!!!!!!!!!!!!!!!!!!!!!!!!");
							expression.reset();
							funcEdit.changeModel([], "set", 
							{
								"get" : param
							});
							nodeFound = true;
							break;
						}
					}
				}
				if(!nodeFound)
				{
					// funcEdit.changeModel(["func"], func, param);
				}
			}
		}
		
		onSelected :
		{
			funcEdit.funcSelected();
		}
		
		onFocusChanged:
		{
			funcEdit.focus = true;
		}
	}

	ListEdit
	{
		id : paramsEdit
		nodeType : typeEdit.text
		context : funcEdit.context

		onChangeModel :
		{
			funcEdit.changeModel(["params"].concat(path), func, param);
		}
		
		onItemSelected :
		{
			funcEdit.itemSelected(item);
		}
	}

}