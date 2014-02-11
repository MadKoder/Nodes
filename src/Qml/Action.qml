import QtQuick 2.0
import "../Qml"
import "Graph.js" as Graph
import "../JsEngine/Engine.js" as Engine

SelectableStruct
{
	id : action
	width : group.width + 8
	height : group.height + 4
	property variant context : null
	z : -model.index

	map : 
	{
		"id" : idEdit,
		"type" : 
		{
			"item" : typeEdit,
			"func" : "typeToString"
		},
		"param" : paramEdit,
		"slots" : slots,
		"if" : ifSlots,
		"else" : elseSlots
	}
	
	function selectIdEdit()
	{
		idEdit.selectWithText();
	}
	
	Keys.onPressed: 
	{
		if(event.key == Qt.Key_Delete)
		{
			event.accepted = true;
			action.changeModel([], "remove", null);
		}
		else if(event.key == Qt.Key_Insert)
		{
			requestAddNode();
		}
	}
	
	Column
	{
		x : 2
		y : 2
		id : group
		spacing : 2
		
		TextEdit
		{
			id : idEdit			
			anchors.horizontalCenter : parent.horizontalCenter
			// visible : text.length > 0
			
			//width : group.width
			onChangeModel :
			{
				action.changeModel(["id"].concat(path), func, param);
			}
		}
		
		Row
		{	
			//height : slots.nbPorts > 0 ? slots.height : idEdit.MinHeight			
			x : 2
			y : 2
			spacing : 2
		
			TextEdit
			{
				id : typeEdit			
				anchors.verticalCenter : parent.verticalCenter
			
				onChangeModel :
				{
					action.changeModel(["type"].concat(path), func, param);
				}
			}

			Expression
			{
				id : paramEdit			
				anchors.verticalCenter : parent.verticalCenter
				context : actionList.context;
				type : Graph.getTemplate(typeEdit.text)
				
				onItemSelected :		
				{
					action.itemSelected(item);
				}
				
				onChangeModel :
				{
					action.changeModel(["param"].concat(path), func, param);
				}
			}
			
			SlotList
			{
				id : slots
				anchors.verticalCenter : parent.verticalCenter
				nodeType : typeEdit.text
				context : action.context
				
				onChangeModel :
				{
					action.changeModel(["slots"].concat(path), func, param);
				}
			}
			
			SlotList
			{
				id : ifSlots
				anchors.verticalCenter : parent.verticalCenter
				nodeType : typeEdit.text
				context : action.context
				
				onChangeModel :
				{
					action.changeModel(["if"].concat(path), func, param);
				}
			}
			
			SlotList
			{
				id : elseSlots
				anchors.verticalCenter : parent.verticalCenter
				nodeType : typeEdit.text
				context : action.context
				
				onChangeModel :
				{
					action.changeModel(["else"].concat(path), func, param);
				}
			}
		}
	}
}