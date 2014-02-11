import QtQuick 2.0

BorderImage {
    id: button

    property string color : ""
	property alias text : textElem.text
	
    signal clicked

    source: "Images/button-" + color + ".png"
	clip: true
    border { left: 10; top: 10; right: 10; bottom: 10 }
	
	width : 80
	height : 30
	
	Rectangle 
	{
        id: shade
        anchors.fill: button; radius: 10; color: "black"; opacity: 0
    }
	
	MouseArea 
	{
		id : mouseArea
		anchors.fill: parent
		onClicked :
		{
			mouse.accepted = true;
			button.clicked()
		}
	}
	Text 
	{
		id : textElem
		anchors.centerIn: parent
		text: "Run"
	}
	states: State {
		name: "pressed"
		when: mouseArea.pressed == true
		PropertyChanges 
		{
			target: shade
			opacity: .4
		}
		PropertyChanges 
		{ 
			target: textElem
			color: "#FFFFFF" 
			font.bold : true
		}
     }
}