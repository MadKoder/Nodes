import QtQuick 2.0

Rectangle
{
	default property alias items : group.children
	property alias spacing : group.spacing
	property alias children : group.children
	id : groupRect
	border.color : "black"
	width : group.width + 10
	height : group.height + 10
	border.width : 2
	Row
	{
		spacing : 5
		id : group
		anchors.top : groupRect.top
		anchors.topMargin: 5
		anchors.left : groupRect.left
		anchors.leftMargin: 5				
	}				
}