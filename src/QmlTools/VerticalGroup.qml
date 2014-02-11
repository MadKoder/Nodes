import QtQuick 2.0

Rectangle
{
	default property alias items : group.children
	property alias spacing : group.spacing
	property alias children : group.children
	property int margin : 5
	id : groupRect
	border.color : "black"
	width : group.width + margin
	height : group.height + margin
	border.width : 2
	property variant context : parent.context
	
	Column
	{
		spacing : 5
		id : group
		x : groupRect.margin / 2
		y : groupRect.margin / 2
	}				
}