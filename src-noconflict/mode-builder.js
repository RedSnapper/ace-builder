ace.define("ace/mode/matching_brace_outdent",["require","exports","module","ace/range"], function(require, exports, module) {
"use strict";

var Range = require("../range").Range;

var MatchingBraceOutdent = function() {};

(function() {

    this.checkOutdent = function(line, input) {
        if (! /^\s+$/.test(line))
            return false;

        return /^\s*\}/.test(input);
    };

    this.autoOutdent = function(doc, row) {
        var line = doc.getLine(row);
        var match = line.match(/^(\s*\})/);

        if (!match) return 0;

        var column = match[1].length;
        var openBracePos = doc.findMatchingBracket({row: row, column: column});

        if (!openBracePos || openBracePos.row == row) return 0;

        var indent = this.$getIndent(doc.getLine(openBracePos.row));
        doc.replace(new Range(row, 0, row, column-1), indent);
    };

    this.$getIndent = function(line) {
        return line.match(/^\s*/)[0];
    };

}).call(MatchingBraceOutdent.prototype);

exports.MatchingBraceOutdent = MatchingBraceOutdent;
});

ace.define("ace/mode/behaviour/css",["require","exports","module","ace/lib/oop","ace/mode/behaviour","ace/mode/behaviour/cstyle","ace/token_iterator"], function(require, exports, module) {
"use strict";

var oop = require("../../lib/oop");
var Behaviour = require("../behaviour").Behaviour;
var CstyleBehaviour = require("./cstyle").CstyleBehaviour;
var TokenIterator = require("../../token_iterator").TokenIterator;

var CssBehaviour = function () {

    this.inherit(CstyleBehaviour);

    this.add("colon", "insertion", function (state, action, editor, session, text) {
        if (text === ':') {
            var cursor = editor.getCursorPosition();
            var iterator = new TokenIterator(session, cursor.row, cursor.column);
            var token = iterator.getCurrentToken();
            if (token && token.value.match(/\s+/)) {
                token = iterator.stepBackward();
            }
            if (token && token.type === 'support.type') {
                var line = session.doc.getLine(cursor.row);
                var rightChar = line.substring(cursor.column, cursor.column + 1);
                if (rightChar === ':') {
                    return {
                       text: '',
                       selection: [1, 1]
                    };
                }
                if (!line.substring(cursor.column).match(/^\s*;/)) {
                    return {
                       text: ':;',
                       selection: [1, 1]
                    };
                }
            }
        }
    });

    this.add("colon", "deletion", function (state, action, editor, session, range) {
        var selected = session.doc.getTextRange(range);
        if (!range.isMultiLine() && selected === ':') {
            var cursor = editor.getCursorPosition();
            var iterator = new TokenIterator(session, cursor.row, cursor.column);
            var token = iterator.getCurrentToken();
            if (token && token.value.match(/\s+/)) {
                token = iterator.stepBackward();
            }
            if (token && token.type === 'support.type') {
                var line = session.doc.getLine(range.start.row);
                var rightChar = line.substring(range.end.column, range.end.column + 1);
                if (rightChar === ';') {
                    range.end.column ++;
                    return range;
                }
            }
        }
    });

    this.add("semicolon", "insertion", function (state, action, editor, session, text) {
        if (text === ';') {
            var cursor = editor.getCursorPosition();
            var line = session.doc.getLine(cursor.row);
            var rightChar = line.substring(cursor.column, cursor.column + 1);
            if (rightChar === ';') {
                return {
                   text: '',
                   selection: [1, 1]
                };
            }
        }
    });

};
oop.inherits(CssBehaviour, CstyleBehaviour);

exports.CssBehaviour = CssBehaviour;
});

ace.define("ace/mode/builder_highlight_rules",["require","exports","module","ace/lib/oop","ace/mode/text_highlight_rules"], function(require, exports, module) {

"use strict";

var oop = require("../lib/oop");
var TextHighlightRules = require("./text_highlight_rules").TextHighlightRules;

var BuilderHighlightRules = function() {
	var internals = ["iAppend","iBase64","iBirth","iConsole","iContent","iDate","iDeath","iDecode","iDigest","iEmbed","iEncode","iEq","iEqFamily","iEqNode","iEqSibs","iEval","iExistContent","iExistMedia","iExistNode","iExists","iExistSimilar","iField","iForAncestry","iForIndex","iForNodes","iForPeers","iForQuery","iForSibs","iForSimilar","iForSubs","iForTax","iForTaxNodes","iFullBuild","iGet","iHex","iID","iIndex","iKV","iLang","iLangID","iLayout","iLayoutName","iLeft","iLength","iLink","iLinkRef","iLower","iMath","iMedia","iMid","iNull","iNumChildren","iNumGen","iNumGens","iNumPage","iNumPages","iNumSib","iPosition","iPreview","iRegex","iRembr","iRembrp","iReplace","iReset","iRight","iSegmentName","iSet","iSetCache","iShortTitle","iSig","iSuffix","iTax","iTeam","iTech","iTiming","iTitle","iTrim","iUnHex","iUpper","iUrlEncode","iUse"];

	var macro = {
		regex: /@(\w+)\(/,
		token : function (value) {
			this.nextState = "macro";
			if(value == 'comment') {
				this.nextState = "comment";
				return "comment.documentation";
			}
			var regex = /^w[A-Z]/;
			if(regex.test(value)) {
				this.nextState = "tag";
				return "meta.tag";
			}
			if (internals.indexOf(value) != -1) {
				this.nextState = "internal";
				return "function.buildin";
			}
			return "function";
		},
		push: "macro"
	},
	brace = {
		regex: /{/,
		token: "support.type",
		push: "brace"
	},
	mbrace = {
		regex : /{/,
		token: "variable.parameter",
		push: "mbrace"
	},
	mcomma = {
		regex: /,/,
		onMatch: function(value,state,stack) {
			var retval;
			switch(state) {
				case "comment": retval="comment.documentation"; break;
				case "internal": retval="function.buildin"; break;
				case "tag": retval="meta.tag"; break;
				default: retval="function";
			}
			return retval;
		},
		merge: false
	},
	mbracket = {
		regex: /\(/,
		push: "bracket",
		token: "variable"
	};
	
	var literal = (function(){

		var inside = false;
		var open = function(){
			var obj = {};
			if(!inside){
				inside = true;
				obj = {
					regex : /{\|/,
					token: "comment",
					push: "literal"
				}
			}
			return obj;
		}
		var close = function(){
			var obj ={ 
				regex : /\|}/,
				token: "comment",
				next: "pop"
			}
			inside = false;
			return obj;
		}

		return {
			open: open,
			close: close
		}

	})();


	var defaultRules = [macro,literal.open()];
	var macroRules = [defaultRules,mcomma,mbrace,mbracket];

	this.$rules = {
		"start" : [
			defaultRules,brace
		],
		"macro" : [
			macroRules,
			{
				token : "function",
				regex : /\)/,
				merge: false,
				next:	"pop"
			},
			{defaultToken: "variable"}
		],

		"comment" : [
			macroRules,
			{
				token : "comment.documentation",
				regex : /\)/,
				merge: false,
				next:	"pop"
			},
			{defaultToken: "comment.documentation"}
		],

		"internal" : [
			macroRules,
			{
				token : "function.buildin",
				regex : /\)/,
				merge: false,
				next: "pop"
			},
			{defaultToken: "variable"}
		],

		"tag" : [

			macroRules,
			{
				token : "meta.tag",
				regex : /\)/,
				merge: false,
				next: "pop"
			},
			{defaultToken: "variable"}
		],

		"literal": [
			literal.open(),
			literal.close(),
			{
				defaultToken: "comment"
			}
		],

		"bracket": [
			defaultRules,
			mbracket,
			brace,
			{
				regex : /\)/,
				token: "variable",
				next: "pop"
			},
			{
				defaultToken: "variable"
			}
		],

		"brace": [
			defaultRules,
			brace,
			{
				regex : /}/,
				token: "support.type",
				next: "pop"
			},{
				defaultToken: "support.type"
			}
		],

		"mbrace": [
			defaultRules,
			mbrace,
			{
				regex : /}/,
				token: "variable.parameter",
				next: "pop",
			},
			{
				defaultToken: "variable.parameter"
			}

		]
	};
	this.normalizeRules();
};

oop.inherits(BuilderHighlightRules, TextHighlightRules);

exports.BuilderHighlightRules = BuilderHighlightRules;
});

ace.define("ace/mode/builder",["require","exports","module","ace/lib/oop","ace/mode/text","ace/tokenizer","ace/mode/matching_brace_outdent","ace/mode/behaviour/css","ace/mode/builder_highlight_rules","ace/range"], function(require, exports, module) {
"use strict";

var oop = require("../lib/oop");
var TextMode = require("./text").Mode;
var Tokenizer = require("../tokenizer").Tokenizer;
var MatchingBraceOutdent = require("./matching_brace_outdent").MatchingBraceOutdent;
var CssBehaviour = require("./behaviour/css").CssBehaviour;
var BuilderHighlightRules = require("./builder_highlight_rules").BuilderHighlightRules;
var Range = require("../range").Range;

var Mode = function() {
    this.HighlightRules = BuilderHighlightRules;
    this.$outdent = new MatchingBraceOutdent();
    this.$behaviour = new CssBehaviour();
};
oop.inherits(Mode, TextMode);

(function() {
    this.$id = "ace/mode/builder";
    this.getNextLineIndent = function(state, line, tab) {
        return this.$getIndent(line);
    };

}).call(Mode.prototype);

exports.Mode = Mode;
});
