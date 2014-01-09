/*
 * maketext.js
 * https://github.com/paymill/maketext.js
 * GPL licensed
 *
 * Copyright (C) 2009 Coma-systems Co. Ltd.
 * Copyright (C) 2013 PAYMILL GmbH
 */

'use strict';

function Lit(str) {
    this.str = String(str);
}

Lit.prototype.compile = function() {
    return '"' + this.str.replace(/(["\\\b\f\n\r\t\v\u2028\u2029])/g, function(c) {
        switch (c) {
        case "\b":
            return "\\b";
        case "\f":
            return "\\f";
        case "\n":
            return "\\n";
        case "\r":
            return "\\r";
        case "\t":
            return "\\t";
        case "\v":
            return "\\v";
        case "\u2028":
            return "\\u2028";
        case "\u2029":
            return "\\u2029";
        default:
            return "\\" + c;
        }
    }) + '"';
};

function Seq(arr) {
    this.seq = arr || [];
}

Seq.prototype = {
    add: function() {
        return this.seq.push.apply(this.seq, arguments);
    },

    concat: function(that) {
        return new Seq(this.seq.concat(that.seq));
    },

    compile: function() {
        var buf = [];
        for (var i = 0; i < this.seq.length; i++) {
            buf.push(this.seq[i].compile());
        }
        return "[" + buf.join(",") + "].join('')";
    }
};

function Ref(idx) {
    this.idx = Number(idx) || 0;
}

Ref.prototype.compile = function() {
    if (this.idx < 0) {
        return "arguments[arguments.length + " + this.idx + "]";
    } else {
        return "arguments[" + this.idx + "]";
    }
};

function Call(name, args) {
    this.name = String(name);
    this.args = args || [];
}

Call.prototype = {
    add: function() {
        this.args.push.apply(this.args, arguments);
    },

    compile: function() {
        var buf = ["this"];
        for (var i = 0; i < this.args.length; i++) {
            buf.push(this.args[i].compile());
        }
        return "this." + this.name + "(" + buf.join(",") + ")";
    }
};

var Parser = function Parser(str, pos, val) {
    this.str = String(str);
    this.pos = Number(pos) || 0;
    this.val = val;
};

Parser.prototype = {

    toString: function() {
        return this.str.slice(0, this.pos) + " <-- HERE --> " + this.str.slice(this.pos);
    },

    error: function(msg) {
        throw new SyntaxError(msg + ": " + this.toString());
    },

    isEOS: function() {
        return this.pos >= this.str.length;
    },

    stepTo: function(pos) {
        return new Parser(this.str, Number(pos) || 0, this.val);
    },

    stepBy: function(pos) {
        return new Parser(this.str, this.pos + Number(pos) || 0, this.val);
    },

    charAt: function(pos) {
        pos = Number(pos);
        if (isNaN(pos)) pos = this.pos;
        return this.str.charAt(pos);
    },

    value: function(v) {
        return new Parser(this.str, this.pos, v);
    },

    match: function(regex) {
        if (!(regex instanceof RegExp)) regex = new RegExp(regex, "g");
        regex.lastIndex = this.pos;
        var m = regex.exec(this.str);
        if (m) {
            return this.stepBy(m[0].length).value(m);
        } else {
            return this.value(m);
        }
    },

    parse: function() {
        var seq = new Seq();
        var ctx = this;
        while (!ctx.isEOS()) {
            ctx = ctx.match(/[^\[~]*(?:~[\[\],~]?[^\[~]*)*/g);
            var str = ctx.val[0];
            if (str) {
                seq.add(new Lit(this.unescape(str)));
            }
            ctx = ctx.parse_bracket();
            if (ctx.val) seq.add(ctx.val);
        }
        return ctx.value(seq);
    },

    parse_bracket: function() {
        if (this.charAt() !== '[') return this.value(null);
        var ctx = this.stepBy(1);
        ctx = ctx.parse_method();
        var bracket = ctx.val;
        while (ctx.charAt() === ',') {
            ctx = ctx.stepBy(1).parse_arg();
            bracket.add(ctx.val);
        }
        if (ctx.charAt() !== ']') {
            this.error("unmatched `['");
        }
        ctx = ctx.stepBy(1);
        if (bracket instanceof Seq && bracket.seq.length === 0) {
            return ctx.value(null);
        }
        return ctx.value(bracket);
    },

    parse_method: function() {
        var ctx = this.match(/_(-?\d+)|_\*|\*|\#|[a-zA-Z_$]\w*|/g);
        var m = ctx.val;
        switch (ctx.str.charAt(ctx.pos)) {
            case ',':
            case ']':
                break;
            default:
                ctx.error("unknown context");
        }
        if (m[1]) {
            return ctx.value(new Seq([new Ref(m[1])]));
        } else {
            switch (m[0]) {
                case "":
                    return ctx.value(new Seq());
                case "_*":
                    ctx.error("`_*' is not supported");
                    break;
                case "*":
                    return ctx.value(new Call("quant"));
                case "#":
                    return ctx.value(new Call("numf"));
                default:
                    return ctx.value(new Call(m[0]));
            }
        }
    },

    parse_arg: function() {
        var arg = new Seq();
        var ctx = this;
        while (!ctx.isEOS()) {
            ctx = ctx.match(/[^\[\],~]*(?:~[\[\],~]?[^\[\],~]*)*/g);
            var str = ctx.val[0];
            if (str) {
                var m;
                if (m = str.match(/^_(-?\d+)$/)) {
                    arg.add(new Ref(m[1]));
                } else if (str === "_*") {
                    throw new SyntaxError("`_*' is not supported");
                } else {
                    arg.add(new Lit(this.unescape(str)));
                }
            }
            switch (ctx.charAt()) {
            case '[':
                ctx = ctx.parse_bracket();
                if (ctx.val) arg.add(ctx.val);
                break;
            case ',':
            case ']':
                return arg.seq.length === 0 ? ctx.value(new Lit("")) :
                    arg.seq.length === 1 ? ctx.value(arg.seq[0]) :
                    ctx.value(arg);
            }
        }
        ctx.error("unmatched `['");
    },

    unescape: function(s) {
        return String(s).replace(/~([\[\],~])/g, "$1");
    }
};