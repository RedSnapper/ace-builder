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

ace.define("ace/mode/advanced_highlight_rules",["require","exports","module","ace/lib/oop","ace/mode/text_highlight_rules"], function(require, exports, module) {

"use strict";

var oop = require("../lib/oop");
var TextHighlightRules = require("./text_highlight_rules").TextHighlightRules;

var AdvancedHighlightRules = function() {
	var internals = ["iAppend","iBase64","iBirth","iConsole","iContent","iDate","iDeath","iDecode","iDigest","iEmbed","iEncode","iEq","iEqFamily","iEqNode","iEqSibs","iEval","iExistContent","iExistMedia","iExistNode","iExists","iExistSimilar","iField","iForAncestry","iForIndex","iForNodes","iForPeers","iForQuery","iForSibs","iForSimilar","iForSubs","iForTax","iForTaxNodes","iFullBuild","iGet","iHex","iID","iIndex","iKV","iLang","iLangID","iLayout","iLayoutName","iLeft","iLength","iLink","iLinkRef","iLower","iMath","iMedia","iMid","iNull","iNumChildren","iNumGen","iNumGens","iNumPage","iNumPages","iNumSib","iPosition","iPreview","iRegex","iRembr","iRembrp","iReplace","iReset","iRight","iSegmentName","iSet","iSetCache","iShortTitle","iSig","iSuffix","iTax","iTeam","iTech","iTiming","iTitle","iTrim","iUnHex","iUpper","iUrlEncode","iUse"];

	function macroToken(value,prefix){
        if(value === 'comment') {
            this.nextState = prefix + "comment";
            return "comment.documentation";
        }
        var regex = /^w[A-Z]/;
        if(regex.test(value)) {
            this.nextState = prefix + "tag";
            return "meta.tag";
        }
        if (internals.indexOf(value) !== -1) {
            this.nextState = prefix + "internal";
            return "function.buildin";
        }
        return "function";
    }

	var macro = {
		regex: /⌽(\w+)\(/,
		token : function (value) {
			this.nextState = "macro";
			return macroToken.call(this,value,"");
		},
		push: "macro"
	},
    bmacro= {
        regex: /⌽(\w+)❪/,
        token : function (value) {
            this.nextState = "bmacro";
            return macroToken.call(this,value,"b");
        },
        push: "bmacro"
    },
	illegal = {
		token : "invalid.illegal",
		regex: /⌽\S*/,
		merge: false
	},
	mbrace = {
		regex : /⎡/,
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
	},
	parameter = {
		regex: /⍟(\d+|\((:?\d+\+?|[kjni]|p\d?|ps)\))/,
		token: "variable.language"
	};

	var defaultRules = [macro,bmacro,illegal,parameter];
	var macroRules = [defaultRules,mcomma,mbrace,mbracket];


	this.$rules = {
		"start" : [
			defaultRules
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
        "bmacro" : [
            macroRules,
            {
                token : "function",
                regex : /❫/,
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
        "bcomment" : [
            macroRules,
            {
                token : "comment.documentation",
                regex : /❫/,
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
        "binternal" : [
            macroRules,
            {
                token : "function.buildin",
                regex : /❫/,
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
        "btag" : [

            macroRules,
            {
                token : "meta.tag",
                regex : /❫/,
                merge: false,
                next: "pop"
            },
            {defaultToken: "variable"}
        ],

		"bracket": [
			defaultRules,
			mbracket,
			{
				regex : /\)/,
				token: "variable",
				next: "pop"
			},
			{
				defaultToken: "variable"
			}
		],


		"mbrace": [
			defaultRules,
			mbrace,
			{
				regex : /⎤/,
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

oop.inherits(AdvancedHighlightRules, TextHighlightRules);

exports.AdvancedHighlightRules = AdvancedHighlightRules;
});

ace.define("ace/mode/advanced",["require","exports","module","ace/lib/oop","ace/mode/text","ace/tokenizer","ace/mode/matching_brace_outdent","ace/mode/behaviour/css","ace/mode/advanced_highlight_rules","ace/range"], function(require, exports, module) {
"use strict";

var oop = require("../lib/oop");
var TextMode = require("./text").Mode;
var Tokenizer = require("../tokenizer").Tokenizer;
var MatchingBraceOutdent = require("./matching_brace_outdent").MatchingBraceOutdent;
var CssBehaviour = require("./behaviour/css").CssBehaviour;
var AdvancedHighlightRules = require("./advanced_highlight_rules").AdvancedHighlightRules;
var Range = require("../range").Range;

var Mode = function() {
    this.HighlightRules = AdvancedHighlightRules;
    this.$outdent = new MatchingBraceOutdent();
    this.$behaviour = new CssBehaviour();
};
oop.inherits(Mode, TextMode);

(function() {
    this.$id = "ace/mode/advanced";
    this.getNextLineIndent = function(state, line, tab) {
        return this.$getIndent(line);
    };

}).call(Mode.prototype);

exports.Mode = Mode;
});
