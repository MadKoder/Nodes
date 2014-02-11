import QtQuick 2.0

Rectangle {
    height: 30;
    color: "#00000000";

    property alias labelText: label.text
    property alias fontColor: label.color
    property alias textAlign: label.horizontalAlignment
    property alias verticalAlign: label.verticalAlignment
    property int fontSize: 22

    Text {
        id: label
        text: "Label"
        height: parent.height
        font.pixelSize: parent.fontSize
        color: "#626567"
        width: parent.width;
        horizontalAlignment: Text.AlignLeft
        verticalAlignment: Text.AlignVCenter
        smooth: true
    }
}
