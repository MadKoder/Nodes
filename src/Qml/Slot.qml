import QtQuick 2.0
import "../Qml"
import "../JsEngine/Engine.js" as Engine
import "../JsEngine/Tools.js" as Tools

Row
{
	id : slot
	property variant currentProperty : null
	
	function modelChanged(path, func, value)
	{
		if (Tools.isString(value) || Tools.isArray(value))
		{
			ref.set(value);
		}
		else
		{
			actionLoader.source = "Action.qml";
			while(actionLoader.status == Loader.Loading)
			{}
			actionLoader.item.modelChanged([], func, value); 
		}
	}
	
	signal changeModel(variant path, string func, variant param);
	
	TextEdit
	{
		id : ref
		visible : text.length > 0
		text : ""
		
		onChangeModel :
		{
			slot.changeModel([], func, param);
		}
	}
	
	Loader
	{
		id : actionLoader
	}
}