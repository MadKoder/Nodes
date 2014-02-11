import QtQuick 2.0
import "../Qml"
import "../JsEngine/Engine.js" as Engine

SelectableStruct
{
	id : connection
	width : group.width + 4
	height : group.height + 12

	map : 
	{
		"source" : sourceEdit,
		"sinks" : sinkList
	}
	
	signal requestAddConnection();
	
	Row
	{	
		id : group
		spacing : 2
		x : 2
		y : 10
		
		TextEdit
		{
			id : sourceEdit			
			
			onChangeModel :
			{
				connection.changeModel(["source"].concat(path), func, param);
			}
		}
		
		SlotList
		{
			id : sinkList

			onChangeModel :
			{
				connection.changeModel(["sinks"].concat(path), func, param);
			}
		}
	}
	
	/*Rectangle
	{
		anchors.fill: parent
		border.color : connection.selected ? "red" : "black"
		border.width : 2
		color : "transparent"
		z : 1
	}*/
}