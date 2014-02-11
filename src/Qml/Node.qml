import QtQuick 2.0
import "Shared.js" as Shared
import "../Qml"
import "../JsEngine/Engine.js" as Engine
import "Graph.js" as Graph

SelectableStruct
{
	id : node
	width : group.width + 4 
	height : group.height + 12
	property variant currentPortName : null
	property variant currentPortModel : null	
	property bool anonymous:false
	property variant context : null
	property string type : ""
	
	signal requestAddNode();
	
	function selectIdEdit()
	{
		idEdit.selectWithText();
	}
	
	map : 
	{
		"val" : valEdit,
		"in" : ports,
		"id" : idEdit,
		"type" : 
		{
			"item" : typeEdit,
			"func" : "typeToString"
		},
		"fields" : fieldsEdit,
	}
	
	function update(value)
	{
		idEdit.text = value["id"];
		if ("val" in value)
		{
			valEdit.text = value.val;
			valEdit.visible = true;
		}		
		if ("type" in value)
		{
			typeEdit.text = value.type;
		}
		else
		{
			typeEdit.text = "string";
		}		
	}

	Keys.onPressed: 
	{
		if(event.key == Qt.Key_Delete)
		{
			event.accepted = true;
			node.changeModel([], "remove", null);
		}
		else if(event.key == Qt.Key_Insert)
		{
			requestAddNode();
		}
	}
	
	Column
	{
		id : group
		y : 10
		x : 2
		spacing: 2
		
		Row
		{
			spacing: 2
		
			anchors.horizontalCenter : parent.horizontalCenter			
				
			TextEdit
			{
				id : idEdit
				visible: !anonymous
				
				onSelected:
				{
					node.selected = true;			
				}

				onChangeModel :
				{
					node.changeModel(["id"].concat(path), func, param);
				}
			}
			
			TextEdit
			{
				id : typeEdit
				visible : typeEdit.text.length > 0 && !node.anonymous
				text: ""
				readOnly: true
				
				onSelected:
				{
					node.selected = true;			
				}
				
				onChangeModel :
				{
					node.changeModel(["type"].concat(path), func, param);
				}
			}
		}

		
		
		PortList
		{
			id : ports
			nodeType : typeEdit.text
			context : node.context
			anchors.left : parent.left
		
			onChangeModel :
			{
				node.changeModel(["in"].concat(path), func, param);
			}
		}
		
		Expression
		{
			id : valEdit
			visible: true
			anchors.horizontalCenter : parent.horizontalCenter
			context : node.context
			type : node.type
						
			onItemSelected :		
			{
				node.itemSelected(valEdit);
			}
			
			onChangeModel :
			{
				node.changeModel(["val"].concat(path), func, param);
			}
		}
		
		StructFields
		{
			id:fieldsEdit
			//anchors.horizontalCenter : parent.horizontalCenter
			x : 0
			context : node.context
			types : ((node.type in Shared.library.classes) && ("fields" in Shared.library.classes[node.type])) ? Shared.library.classes[node.type].fields : {};

			onChangeModel :
			{
				node.changeModel(["fields"].concat(path), func, param);
			}

			onItemSelected :		
			{
				node.itemSelected(item);
			}
		}
	}
}