syntax = (function() {

function pushBlock(blockStack, type, indent) {
    blockStack.push({
        type : type,
        indent : indent
    });
}

function getIndent(line)
{
    var match = /^(\s*)\S+/.exec(line);
    if(match != null)
        return match[1].length;
    return 0;
}

// Tells if line ends with do, ignoring whitespaces 
function endsWithDo(line) {
    var match = /\sdo\s*$/.exec(line);
    return match != null;
}

// Tells if line ends with do and open brace, ignoring whitespaces 
function endsWithDoBrace(line) {
    var match = /\sdo\s*{\s*$/.exec(line);
    return match != null;
}

function splitCodeAndComment(line) {
    var split = /([^#]*)(#.*)/.exec(line);
    if(split != null)
        return [split[1], split[2]];
    return [line, ""];
}

function convert(input) {
    var inputLines = input.split(/\r\n|\r|\n/);
    var blockStack = [0];
    var outputLines = [];
    for(var i = 0; i < inputLines.length; i++) {
        var inputLine = inputLines[i];
        var block = blockStack[blockStack.length - 1];
        var blockIndent = block;
        var codeAndComment = null;
        try {
            var codeAndComment = commentParser.parse(inputLine);
            var code = codeAndComment.code;
            var comment = codeAndComment.comment;
        } catch(e) {
            outputLines.push("NOT PARSED");
        }
        indent = getIndent(code);
        var firstLineOfBlock = false;
        var outputLine = "";
        if(indent > blockIndent) {
            blockStack.push(indent);
            outputLine += ";$>   ";
        } else if(indent < blockIndent) {
            var nbDedent = 0;
            var dedentArray = [];
            while(indent < blockIndent){
                blockStack.pop();
                block = blockStack[blockStack.length - 1];
                blockIndent = block;
                nbDedent++;
                dedentArray.push("");
            }
            if(nbDedent == 1) {
                outputLine += "$<;  ";
            } else if(nbDedent == 2) {
                outputLine += "$<$<;";
            } else {
                outputLine += dedentArray.join("$<");
                outputLine += ";";
            }
            if(indent > blockIndent)
            {
                throw "Error, indent not correct";
            }
        } else {
            outputLine += ";    ";
        }
        outputLine += inputLine;
        outputLines.push(outputLine);
    }
    return outputLines.join("\n");
}

function convert2(input) {
    var inputLines = input.split(/\r\n|\r|\n/);
    var blockStack = [{
        type : "prog",
        indent : -1
    }];
    var outputLines = [];
    for(var i = 0; i < inputLines.length; i++) {
        var inputLine = inputLines[i];
        var block = blockStack[blockStack.length - 1];
        var blockIndent = block.indent;
        indent = getIndent(inputLine);
        var firstLineOfBlock = false;
        var outputLine = "";
        // If we are at the first line of a new block, the indent of
        // this block is defined by the indent of its first line
        if(blockIndent < 0) {
            var previousBlock = blockStack[blockStack.length - 2];
            // First line is already the end of the block (e.g empty {})
            if(previousBlock != undefined && indent <= previousBlock.indent) {
                blockStack.pop();
            } else {
                blockIndent = indent;
                block.indent = indent;
                firstLineOfBlock = true;
            }
        } else if(indent < blockIndent) {
            // If we ended a do block, adds a }
            if(block.type == "do") {
                outputLine += "}";
            }
            blockStack.pop();
            block = blockStack[blockStack.length - 1];
        }
        // Split between code and comment
        var codeAndComment = null;
        try {
            var codeAndComment = commentParser.parse(inputLine);
            var code = codeAndComment.code;
            var comment = codeAndComment.comment;
        } catch(e) {
            outputLines.push("NOT PARSED");
        }
        if(codeAndComment != null) {
            // var debug = true;
            var debug = false;
            if(debug){
                outputLines.push(code);
                outputLines.push(comment);
                outputLines.push(indent);
                outputLines.push(endsWithDo(code));
            } else {
                // Adds a separator if we are at the same indent than the block,
                // the line is not empty and it's not the first line of the block
                if(indent == block.indent && code.trim().length > 0 && !firstLineOfBlock) {
                    if(block.type == "do" || block.type == "doBrace" || block.type == "prog") {
                        outputLine = outputLine + ";";
                    }
                }
                outputLine += code;
                if(endsWithDo(code)) {
                    outputLine += " {";
                    pushBlock(blockStack, "do", -1);
                } else if(endsWithDoBrace(code)) {
                    pushBlock(blockStack, "doBrace", -1);
                }
                outputLine += comment;
                outputLines.push(outputLine);
            }
        }
    }
    return outputLines.join("\n");
}

return {
    convert : convert
};

})();
