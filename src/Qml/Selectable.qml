import QtQuick 2.0


Rectangle
{
	id : selectable
	property bool	selected : false
	property bool	deletable : true
	property alias	dragActive : mouseArea.dragActive
	property int	targetPos : 0
	property int	newIndex : 0
	property variant context : parent ? parent.context : null
	border.color : selected ? "red" : "black"
	border.width : 2
	color : "transparent"
	
	signal itemSelected(variant item)
	signal itemDropped(variant item)
	signal mouseEntered(variant item)
	signal itemDragging(variant item, variant mouse)
	
	function select()
	{
		selectable.selected = true;
	}
	
	onSelectedChanged :
	{
		if(selected)
		{
			focus = true;
			itemSelected(selectable);
		}
	}
	
	MouseArea 
	{
		id : mouseArea
		anchors.fill: parent
		drag.target : parent
		drag.axis  : Drag.YAxis
		drag.filterChildren : true
		property bool	dragActive : drag.active
		//hoverEnabled : true

		onPressed  :
		{
			// console.log("Selectable pressed");
			selectable.selected = true;
			mouse.accepted = true;
			selectable.focus = true;
			selectable.targetPos = selectable.y + selectable.height / 2;
			selectable.newIndex = index;
		}
		
		onReleased :
		{
			if(drag.active)
			{
				itemDropped(selectable);
				selectable.y = selectable.targetPos - selectable.height / 2;
			}
		}
		
		onEntered :
		{
			mouseEntered(selectable);
		}
		
		onPositionChanged :
		{
			if(drag.active)
			{
				itemDragging(selectable, mouse);
			}
		}
	}
}