import QtQuick 2.0
import "../Qml"
import "../JsEngine/Engine.js" as Engine
import "../JsEngine/Tools.js" as Tools

Column
{
	id : structField
	property alias fieldId : fieldIdEdit.text
	spacing: 2
	property variant fieldPath : [fieldId]
	property variant context : null
	property alias type : expression.type
	width : childrenRect.x + childrenRect.width
	
	signal itemSelected(variant item);
	
	signal changeModel(variant path, string func, variant param);
	
	function modelChanged(path, func, value)
	{
		expression.modelChanged(path, func, value);
	}
	
	TextEdit
	{
		id : fieldIdEdit
		text : model.fieldId
		// anchors.verticalCenter : parent.verticalCenter
		// anchors.horizontalCenter : parent.horizontalCenter
		readOnly : true
	}
	
	Expression
	{
		id : expression
		context : structField.context
		x : 20
		
		onChangeModel :
		{
			// console.log("structField ChangeModel " + path);
			structField.changeModel(fieldPath.concat(path), func, param);
		}
		
		onItemSelected :
		{
			structField.itemSelected(item);
		}
	}
}