import QtQuick 2.0


EditZone
{
	id : editZone
	text : ""
	function modelChanged(path, func, value)
	{
		// assert path.length == 0
		// assert func == "set"
		//console.log("modelChanged " + value);
		text = value;
	}
	
	//signal setModel(variant path, variant value);
	signal changeModel(variant path, string func, variant param);
	
	onTextChange :
	{
		editZone.changeModel([], "set", text);
	}
}
