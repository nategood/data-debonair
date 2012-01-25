// TODO
//  - Support negative values :-)
//  - Clean up to support better POOP style
//  - Continue to break things out
//  - Line chart
//  - Bar chart groups: allow for a single label on a group (e.g. use first dataset's labels by default)
//  - Bar charts: other shapes?  blocks instead of solid columns? DONE

var Debonair = {
    // general graph specifics
    graph: {
        w: $(window).width(),
        h: $(window).height()
    },
    normalized: {},
    margin: 100, // margin around graph
    grid: false, // todo grid line support
    sets: [],
    animation: {
        speed: 3000,
        method: "elastic"
    },
    _max: function(a, max, start) {
        max = max || 0; start = start || 0;
        if (start == a.length) return max;
        return Debonair._max(a, a[start] > max ? a[start] : max, start + 1);
    },
    // It gets the people going
    init: function(data, settings) {
        Debonair.paper = Raphael(0, 0, Debonair.graph.w, Debonair.graph.h);

        Debonair.maxLength = 0; // todo get the longest data set
        Debonair.maxValue  = 0; // todo get max
        // Turn bare bones arrays into dataset objects
        Debonair.data = $.map(data, function(v, k) {
            var d = $.isArray(v) ? {data:v} : v;
            // Max Length
            if (d.data.length > Debonair.maxLength) Debonair.maxLength = d.data.length;
            // Max Value
            var max = Debonair._max(d.data);
            if (max > Debonair.maxValue) Debonair.maxValue = max;
            return d;
        });
    }
};

Debonair.coloring = {
    method: "tealscale", // default
    mode: 1, // 0:group, 1:single
    colors: {
        highlight: "#fff",
        lowlight: "#111"
    },
    helpers: {
        // Creates a function that will return a shade
        // based on the initial hue/saturation given.
        // The result is a dark-to-light incremental effect.
        // hue: 0 to 1
        // saturation: 0 to 1
        // softener: 0 to 1 (how varied of a range to you want, 0 results in greatest variation)
        shades: function(hue, saturation, softener) {
            return function(i, v) {
                var ratio = i/Debonair.maxLength;
                // Make it a range from 0.2 to 0.8 instead of 0.0 to 1.0
                var soften = (softener || 0.2) * (i - Debonair.maxLength / 2) / (Debonair.maxLength / 2);
                return Raphael.color(Raphael.hsl(hue, saturation, ratio - soften));
            }
        },
        // Get a range of the spectrum (0 to 1 will give you a "rainbow" effect)
        // start: 0 to 1
        // end: 0 to 1 (must be greater than start)
        // saturation: 0 to 1 (default 0.75)
        // lightness: 0 to 1 (default 0.5)
        range: function(start, end, saturation, lightness) {
            var range = end - start;
            return function(i, k) {
                var ratio = start + (i/Debonair.maxLength) * range
                return Raphael.color(Raphael.hsl(ratio, saturation || 0.75, lightness || 0.5));
            }
        }
    }
};

// Coloring methods.  Easy to create custom ones
// and even easier to create variations based on 
// "helper" methods in Debonair.coloring.
Debonair.coloring.methods = {
    rainbow: Debonair.coloring.helpers.range(0, 1),
    burnt: Debonair.coloring.helpers.range(0, 0.2),
    grass: Debonair.coloring.helpers.range(0.2, 0.4),
    cool: Debonair.coloring.helpers.range(0.5, 0.7),
    grayscale: Debonair.coloring.helpers.shades(0, 0),
    tealscale: Debonair.coloring.helpers.shades(.5, .5)
};

Debonair.bar = {
    gap: 2, // margin between bars
    groupGap: 20, // gap between bar groups
    singleLabelMode: true,
    init: function(data, settings) {
        Debonair.init(data, settings);
        Debonair.normalized.h   = (Debonair.graph.h - 2 * Debonair.margin) / Debonair.maxValue; // max height of a bar
        Debonair.bar.step       = ((Debonair.graph.w - 2 * Debonair.margin) - Debonair.data.length * Debonair.bar.groupGap) / (Debonair.maxLength * Debonair.data.length); // dx for each individual bar
        Debonair.bar.groupStep  = (Debonair.graph.w - 2 * Debonair.margin) / Debonair.maxLength; // dx for each data set
        Debonair.normalized.w   = Debonair.bar.step - Debonair.bar.gap; // w of each bar
    },
    draw: function() {
        var me = Debonair;
        $.each(Debonair.data, function(setK, setV) {
            me.paper.setStart();
            $.each(setV.data, function(k, v) {
                var x =     Debonair.margin + Debonair.bar.gap / 2 + Debonair.bar.groupStep * k + Debonair.bar.step * setK;
                var y =     Debonair.graph.h - Debonair.margin;
                var cr =    k/Debonair.maxLength;

                // Looks weird because y axis is inverted in Raphael/CSS/DOM (0,0) is the top left corner.
                var h = Debonair.graph.h - Debonair.margin - Debonair.normalized.h * v;
                var r =     me.paper.rect(x, y, Debonair.normalized.w, 0);

                // var color = Debonair.coloring[Debonair.coloring.method](k, v);
                var colorMode = Debonair.coloring.mode ? setK : k;
                var color = Debonair.coloring.methods[Debonair.coloring.method](colorMode, v);
                r.attr("fill", color);
                r.attr("stroke-width", 0);

                // Labels
                // Are we in single label mode? If so, we only draw
                // one label (the first data set's label) and we center
                // it within the group.
                if (Debonair.bar.singleLabelMode === false || setK == 0) {
                    var tx = Debonair.bar.singleLabelMode ? x + (Debonair.bar.step * (Debonair.data.length / 2)) : x + Debonair.bar.step / 2;
                    var label = $.isArray(Debonair.data[setK].labels) && Debonair.data[setK].labels[k] || 
                        typeof Debonair.data[setK].labels == "string" && Debonair.data[setK].labels || 
                        v;
                    var t = me.paper.text(tx, y + 10, label);
                    t.attr("fill", Debonair.bar.singleLabelMode ? Debonair.coloring.colors.highlight : color);
                }

                // Timing gives it a wave effect
                r.animate({height: Debonair.normalized.h * v, y: h}, 
                    Debonair.animation.speed * ((k+1) / (Debonair.maxLength+1)), 
                    Debonair.animation.method, 
                    function() {
                        // Add in Labels
                        if (h + 20 >= y) return; // skip if too small?
                        var lh = h + 20 >= y ? y - 10 : h + 10;
                        l = me.paper.text(x + Debonair.bar.step / 2, lh, v);
                        l.attr("fill", Debonair.coloring.colors.lowlight);
                });

                r.meta = {color: color, data: v, height: h, label: t};

                // States
                r.mouseover(function() {
                    this.animate({fill: Debonair.coloring.colors.highlight}, 100);
                });
                r.mouseout(function() {
                    this.animate({fill: this.meta.color}, 500);
                });
            });
            var set = me.paper.setFinish();
            Debonair.sets.push(set);
        });
    }
};

// TODO
Debonair.line = {
    r: 5, // radius of dot
    t: 1, // thickness of line
};