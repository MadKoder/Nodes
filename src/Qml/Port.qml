import QtQuick 2.0
import "../Qml"
import "../JsEngine/Engine.js" as Engine

TextEdit
{
	id : port
	property variant currentProperty : null
	
	function update(value)
	{
		if (typeof value == 'string' || value instanceof String)
		{
			text = value;
		}
		else if(value instanceof Array)
		{
			text = value.join(".");			 
		}
		else
		{
			text = value["id"] + " : " + value["source"];
		}
	}
	
	function modelChanged(path, func, value)
	{
		update(value);
	}	
}