import QtQuick 2.0
Rectangle 
{
    id: radioBtn
	width : 80
    height: 20
    color: "#00FFFFFF"
    property alias buttonWidth: radioBtn.width
    property alias text: btnText.text
    property alias buttonBorderSrc: btnBorder.source
	property variant radioButtonGroup
	property bool	selected : state == "selected"
	property alias state : radioBtn.state
	property alias defaultOn : timer.running
	signal pressed
    
	function select()
	{
		if (radioBtn.radioButtonGroup.selectedBtnID != undefined )
		{
			
			radioButtonGroup.selectedBtnID.state = ""
		}
		radioButtonGroup.selectedBtnID = radioBtn;
		radioBtn.state = "selected";
	}
	
	Timer 
	{
		id : timer
		interval: 30
		running: false
		repeat: false
		onTriggered: radioBtn.select();
	}
	
	BorderImage 
	{
        id: btnBorder
        x: 0; y: 0
        anchors.fill: parent
        border.left: 10; border.right: 10
        border.top: 10; border.bottom: 10
        source: "Images/Button_default.png"
    }
    
	Text 
	{
        id: btnText
        verticalAlignment: Text.AlignVCenter
        horizontalAlignment: Text.AlignHCenter
        anchors.fill: parent
    }
	
    MouseArea 
	{
        anchors.fill: parent
        onClicked: 
		{
			radioBtn.select();
        }
    }
	
    states: 
	[
        State 
		{
            name : "selected"
			PropertyChanges 
			{ 
				target: radioBtn
				buttonBorderSrc: "Images/Button_active2.png" 
			}
            PropertyChanges 
			{ 
				target: btnText
				color: "#FFFFFF" 
				font.bold : true
			}
        }
    ]
}