import QtQuick 2.0


Rectangle
{
	id : editZone
	width : 80
	height : 20
	border.color : "white"
	border.width : 0
	
	property alias text : textInput.text
	property alias textInput : textInput
	property alias inBorder : editRectangle.border
	property alias enabled : mouseArea.enabled
	property alias textFocus : textInput.activeFocus
	property Item previous : null
	property Item next : null
	property Item up : null
	property Item down : null 
	property Item rightItem : null
	property Item leftItem : null 
	property alias domain : autocomplete.domain
	property alias availableStrings : autocomplete.availableStrings
	property bool selected : false

	signal signalSelected(variant zone);
	signal textChange();
	signal escaped();
	
	function select()
	{
		//editZone.focus = true;
		signalSelected(editZone);
	}
	
	function selectWithText()
	{
		select();
		textInput.focus = true;
		textInput.initialText = textInput.text;
		textInput.selectAll();	
	}
	
	function unSelect()
	{
		focus = false;
		textInput.focus = false;
	}
	
	Keys.onUpPressed :
	{
		if(textInput.focus)
		{
			editRectangle.autocmp.up();
		}
		else if(up)
			up.select();
	}
	
	Keys.onDownPressed :
	{
		if(textInput.focus)
		{
			editRectangle.autocmp.down();
		}
		else if(down)
			down.select();
	} 
	
	Keys.onRightPressed :
	{
		if(rightItem)
			rightItem.select();
	}

	Keys.onLeftPressed :
	{
		if(leftItem)
			leftItem.select();
	}

	Keys.onTabPressed :
	{
		if(next)
			next.selectWithText();
	}

	Keys.onBacktabPressed  :
	{
		if(previous)
			previous.selectWithText();
	}

	Keys.onEscapePressed :
	{
		if(textInput.focus)
		{
			textInput.text = textInput.initialText;
			editZone.focus = true;
			escaped();
		}
	}
	
	Keys.onPressed:
	{
		if(event.key == Qt.Key_F2)
		{
			selectWithText();
		}
	}

	Rectangle
	{
		property variant autocmp : autocomplete
		
		id : editRectangle
		anchors.fill: parent
		anchors.margins : 2
		border.color : editZone.selected ? "pink" : "blue"
		border.width : editZone.selected ? 2 : 1

		TextInput 
		{
			property string initialText : ""
			id : textInput
			anchors.fill: parent
			anchors.leftMargin : 5
			text : "property"
			selectByMouse : true
			renderType: Text.NativeRendering
			activeFocusOnPress : true
			
			onAccepted :
			{
				if(autocomplete.model.length > 0)
				{
					text = autocomplete.model[autocomplete.currentIndex];
				}
				// console.log("onAccepted");
				editZone.focus = true;
				editZone.textChange();
			}
			onTextChanged :
			{
				autocomplete.textChange();
			}
			
			function setText(t)
			{
				text = t;
				console.log(text);
				editZone.focus = true;
				editZone.textChange();
			}
		}
		
		AutocompleteLineEdit
		{
			id : autocomplete
			visible : textInput.focus
			textEdit : textInput
		}
	}
	
	MouseArea 
	{
		id : mouseArea
		anchors.fill: parent
		//enabled : editZone.selected ? false : true
		enabled : false
		//hoverEnabled : true
		onClicked : 
		{
			console.log("EditZone clicked");
			//select();
			selectWithText();		
			editZone.focus = true;
			
		}
		// onPressed : 
		// {
			// //select();
			// //editZone.focus = true;
			// console.log("EditZone onPressed");
			// selectWithText();		
		// }
		onDoubleClicked :
		{
			selectWithText();
		}
	}
}