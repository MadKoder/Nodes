import QtQuick 2.0
import "Autocompletion.js" as Autocompletion

ListView{
	id: listView
	width: parent.width
	anchors.top: parent.bottom

	property variant textEdit : null
	property string delegateItemBorderColor: "black"
	property string delegateItemColor: "white"
	property int delegateHeight : 15
	property string domain : ""
	property variant availableStrings : []
	
	highlightFollowsCurrentItem : false
	
	height : model ? delegateHeight * model.length : 0
	
	function textChange()
	{
		if(textEdit != null)
		{
			if((availableStrings != null) && availableStrings.length > 0)
			{
				model = Autocompletion.getTextListFromAvailable(textEdit.text, availableStrings);
			}
			else
			{
				model = Autocompletion.getTextList(textEdit.text, domain);
			}
		}
	}

	function up()
	{
		decrementCurrentIndex();
		console.log(currentIndex);
	}
	
	function down()
	{
		incrementCurrentIndex();
		console.log(currentIndex);
	}
	
	Keys.onEnterPressed :
	{
		textEdit.text = delegateItem.ListView.view.model[delegateItem.ListView.view.currentIndex];
		textEdit.focus = false;
	}

	delegate : Rectangle
	{
		id: delegateItem
		width: parent.width
		height:  listView.delegateHeight
		border.color: delegateItemBorderColor		
		color : ListView.isCurrentItem  ? 
			"black" : 
			(mouseArea.containsMouse ? "gray" : "white")
			
		Text 
		{
			anchors.fill: parent
			anchors.leftMargin: 5
			text : modelData
			renderType: Text.NativeRendering
			color : (delegateItem.ListView.isCurrentItem || mouseArea.containsMouse) ? "white" : "black"
		}
		MouseArea
		{
			id : mouseArea
			anchors.fill:  parent
			hoverEnabled : true
			onClicked: 
			{
				// == Setting text when an item is selected from the autocomplete list == //
				textEdit.setText(modelData);
				textEdit.focus = false;
			}
		}
	}

	ListView.onAdd: NumberAnimation { target: listView.delegate; property: "height"; duration: 500; easing.type: Easing.OutInQuad}
	ListView.onRemove: NumberAnimation { target: listView.delegate; property: "height";  duration: 250; easing.type: Easing.InOutQuad }

}
