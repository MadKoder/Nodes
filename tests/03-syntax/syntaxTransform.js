$(document).ready(function ()
{

var $input = $("#input");
var $output = $("#output");

var inputText = $input.val();
$output.html(syntax.convert(inputText));

$input.keyup(function() {
    var inputText = $input.val();
    $output.html(syntax.convert(inputText));
});
})