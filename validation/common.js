var $validation = null;

function appendText(text) {
    $validation.append("<div>" + text + "</div>");     
}

function buildValidationDiv() {
    if($validation === null) {
        $validation = $("#validation");
    }
}
var failedTests = [];
var validated = true;
function assertEqual(a, b, testName)
{
    buildValidationDiv();

    if(a === b)
    {
        // $validation.append("<div> " + testName + " OK </div>");
    }
    else
    {
        failedTests.push();
        $validation.append("<div class='failed'>" + testName + " test failed</div>");
        $validation.append("<div class='failed'>" + a + " != " + b + "</div>");
        validated = false;
    }
}

function eqArray(a0, a1)
{
    // if the other array is a falsy value, return
    if(!a0 || !a1)
        return false;

    // compare lengths - can save a lot of time 
    if (a0.length != a1.length)
        return false;

    for (var i = 0, l=a0.length; i < l; i++) {
        // Check if we have nested arrays
        if (a0[i] instanceof Array && a1[i] instanceof Array) {
            // recurse into the nested as
            if (!eqArray(a0[i], a1[i]))
                return false;       
        }           
        else if (a0[i] != a1[i]) { 
            // Warning - two different object instances will never be equal: {x:20} != {x:20}
            return false;   
        }           
    }       
    return true;
}

function assertArrayEquals(a, b, testName)
{
    if(eqArray(a, b))
    {
        // $validation.append("<div> " + testName + " OK </div>");
    }
    else
    {
        failedTests.push();
        $validation.append("<div>" + testName + " test failed</div>");
        $validation.append("<div>" + a + " != " + b + "</div>");
        validated = false;
    }
}

var library =
{
    nodes : {},
    functions : functions,
    actions : actions,
    classes : {},
    types : {},
    attribs : {},
    slots : {}
};

function makeJsSrc(nodeSrc) {
    var canonicalStr = syntax.convert(nodeSrc);
    var codeGraph = parser.parse(canonicalStr);
    var prog = compileGraph(codeGraph, library);
    var src = escodegen.generate(prog);
    return src;
}
