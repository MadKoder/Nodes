import Qt 4.7
import "../Common"

Rectangle {
	width: 50
	height: 10

	Button
	{
		text : "Refresh"
		onClicked : 
		{
			interf.refresh()
		}
	}
}