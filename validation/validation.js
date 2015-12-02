$(document).ready(function ()
{

var baseFileNames = [
	"basics"
	,"dependencies"
	,"objects"
];

fileNames = _.map(_.clone(baseFileNames), function(fileName) {
	return "nodes/" + fileName + ".nodes";
});

var textArray = [];



var validArray = [
	basics
	,dependencies
	,objects
]

var startGroupIndex = 0;
function validate() {

	for(var i in textArray) {
		// Jump test groups before start index
		if(i < startGroupIndex) {
			continue;
		}
		var nodeSrc = textArray[i];
		// appendText(nodeSrc);

		(function () {
			validArray[i](nodeSrc);
			var testName = baseFileNames[i];
			if(!validated) {
				$validation.append("<div class='failed group'> Test group " + testName + " failed </div>");
			} else {
				$validation.append("<div class='succeeded group'> Test group " + testName + " succeeded </div>");
			}
		}) ();
	}
}

function loadAllFiles(fileNames) {
	if(fileNames.length > 0) {
		var nextFileName = fileNames.shift();
		$.get(nextFileName, function(text) {
			textArray.push(text);
			loadAllFiles(fileNames);
		}
		, "text" // Commenter pour lire du json
		);	
	} else {
		validate();
	}
}

loadAllFiles(fileNames);

})