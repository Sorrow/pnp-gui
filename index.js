var createGeometry = require("gl-geometry")
var createShader = require("gl-shader")
var mat4 = require("gl-mat4")
var fontInfo = require("./font_info.js")
var fontAtlas = require("./font_atlas.js")
var shaders = require("./shaders.js")
var createTexture = require('gl-texture2d')

/*
 Constructor
 */
function GUI(gl) {

    this.allGuiGeometry = createGeometry(gl)
    this.shader = createShader(gl, shaders.vert, shaders.frag)

    // distance from window-borders to the widgets.
    this.windowSpacing = 19;

    // the vertical spacing between the widgets.
    this.widgetSpacing = 11;

    // the horizontal and vertical spacing between the button border and its text label.
    this.buttonSpacing = 3;
    this.buttonColor =  [0.6, 0.0, 0.0];

    this.windowPosition = [50, 50];
    this.windowSize = [200, 400];
    this.windowColor = [0.25, 0.25, 0.25];

    this.fontAtlasTexture = createTexture(gl, fontAtlas)
    this.fontAtlasTexture.magFilter = gl.LINEAR;
    this.fontAtlasTexture.minFilter = gl.LINEAR;

    this.textScale = 1.0;
}

GUI.prototype._getCharDesc = function (char) {
    return fontInfo.chars[char.charCodeAt(0) - 32];
}

/*
 PRIVATE
 */
GUI.prototype._addIndex = function (index) {
    this.indexBuffer[this.indexBufferIndex++] = index;
}

/*
 PRIVATE
 */
GUI.prototype._addPosition = function (position) {
    this.positionBuffer[this.positionBufferIndex++] = position[0];
    this.positionBuffer[this.positionBufferIndex++] = position[1];
}

/*
 PRIVATE
 */
GUI.prototype._addColor = function (color) {
    this.colorBuffer[this.colorBufferIndex++] = color[0];
    this.colorBuffer[this.colorBufferIndex++] = color[1];
    this.colorBuffer[this.colorBufferIndex++] = color[2];
}

GUI.prototype._addUv = function (uv) {
    this.uvBuffer[this.uvBufferIndex++] = uv[0];this.uvBuffer[this.uvBufferIndex++] = uv[1];
}

/*
 Get width and height of a text string.
 */
GUI.prototype._getTextSizes = function (str) {

    var width = 0;
    var height = 0; // the height of the highest character.

    for (var i = 0; i < str.length; ++i) {
        var ch = str[i];
        var cd = this._getCharDesc(ch);

        width += (cd.xadvance) * this.textScale;

        var y0 = (cd.yoff) * this.textScale;
        var y1 = (cd.yoff2) * this.textScale;
        var h = y1 - y0;

        if (height < h) {
            height = h;
        }

    }

    return [ width, height];
}


/*
 render text
 */
GUI.prototype._text = function (position, str) {

    var x = position[0];
    var y = position[1];

    /*
    Width of a single pixel in the font atlas.
     */
    var ipw = 1.0 / 256;
    var iph = 1.0 / 256;

    for (var i = 0; i < str.length; ++i) {

        var ch = str[i];

        // char desc
        var cd = this._getCharDesc(ch);

        /*
        We will render a single character as a quad.
        First we gather all information needed to render the quad:
         */

        var x0 = (x + cd.xoff) * this.textScale;
        var y0 = (y + cd.yoff) * this.textScale;
        var x1 = (x + cd.xoff2) * this.textScale;
        var y1 = (y + cd.yoff2) * this.textScale;


        var s0 = (cd.x0 * ipw);
        var t0 = (cd.y0 * iph);
        var s1 = (cd.x1 * ipw);
        var t1 = (cd.y1 * iph);

        // render text as white.
        var whiteColor = [1, 1, 1]


        /*
        Now we have all the information. Now render the quad as two triangles:
         */

        var baseIndex = this.positionBufferIndex / 2;

        // top left
        this._addPosition([x0, y0]);this._addColor(whiteColor);this._addUv([s0, t0]);

        // bottom left
        this._addPosition([x0, y1]);this._addColor(whiteColor);this._addUv([s0, t1]);

        // top right
        this._addPosition([x1, y0]);this._addColor(whiteColor);this._addUv([s1, t0]);


        // bottom right
        this._addPosition([x1, y1]);this._addColor(whiteColor);this._addUv([s1, t1]);

        // triangle 1
        this._addIndex(baseIndex + 0);this._addIndex(baseIndex + 1);this._addIndex(baseIndex + 2);

        // triangle 2
        this._addIndex(baseIndex + 1);this._addIndex(baseIndex + 2);this._addIndex(baseIndex + 3);



        // finally, advance the x-coord, in preparation of rendering the next character.
        x += (cd.xadvance) * this.textScale;

    }
}

/*
 PRIVATE
 */
GUI.prototype._box = function (position, size, color) {

    // top-left, bottom-left, top-right, bottom-right corners
    var tl = position;
    var bl = [position[0]          , position[1] + size[1]];
    var tr = [position[0] + size[0], position[1]          ];
    var br = [position[0] + size[0], position[1] + size[1]];

    var baseIndex = this.positionBufferIndex / 2;

    // at this uv-coordinate, the font atlas is entirely white.
    var whiteUv = [0.95, 0.95]

    // vertex 1
    this._addPosition(tl);this._addColor(color);this._addUv(whiteUv);

    // vertex 2
    this._addPosition(bl);this._addColor(color);this._addUv(whiteUv);

    // vertex 3
    this._addPosition(tr);this._addColor(color);this._addUv(whiteUv);

    // vertex 4
    this._addPosition(br);this._addColor(color);this._addUv(whiteUv);


    // triangle 1
    this._addIndex(baseIndex + 0);this._addIndex(baseIndex + 1);this._addIndex(baseIndex + 2);

    // triangle 2
    this._addIndex(baseIndex + 1);this._addIndex(baseIndex + 2);this._addIndex(baseIndex + 3);

}

/*
Given a box with position `p`, width `s[0]`, height `[1]`,
return whether the point with the position `x` is inside the box.
 */
function inBox(p, s, x) {
    var minX = p[0];
    var minY = p[1];

    var maxX = p[0] + s[0];
    var maxY = p[1] + s[1];


    //console.log(minX, maxX, minY, maxY, x, y)


    return (
        minX <= x[0] && x[0] <= maxX &&
        minY <= x[1] && x[1] <= maxY
    );
}

GUI.prototype.button = function (str) {

    /*
    BUTTON RENDERING
     */

    var buttonPosition = this.windowCaret;

    var textSizes = this._getTextSizes(str);

    // button size is text size, plus the spacing around the text.
    var buttonSizes = [
        textSizes[0] + this.buttonSpacing * 2,
        textSizes[1] + this.buttonSpacing * 2
    ];

    this._box(
        buttonPosition,
        buttonSizes, this.buttonColor)

    // Render button text.
    this._text([buttonPosition[0] + this.buttonSpacing,
        buttonPosition[1] + buttonSizes[1] - this.buttonSpacing], str);

    // move down window caret.
    this.windowCaret = [this.windowCaret[0], this.windowCaret[1] + this.widgetSpacing + buttonSizes[1]]



    /*
    BUTTON IO
    If button is pressed, return true;
    Otherwise, return false.
     */


    if(this.io.mouseLeftPressed) {
        // check if mouse pressed this button:

        if(inBox(buttonPosition, buttonSizes, this.io.mousePosition) ) {
            return true; // button press!
        }

    }

    return false;
}


GUI.prototype.begin = function (io) {

    this.indexBuffer = [];
    this.positionBuffer = [];
    this.colorBuffer = [];
    this.uvBuffer = [];

    this.indexBufferIndex = 0;
    this.positionBufferIndex = 0;
    this.colorBufferIndex = 0;
    this.uvBufferIndex = 0;


    this.io = io;


    // render window.
    this._box(this.windowPosition, this.windowSize, this.windowColor)

    // setup the window-caret. The window-caret is where we will place the next widget in the window.
    this.windowCaret = [this.windowPosition[0] + this.windowSpacing, this.windowPosition[1] + this.windowSpacing]

}

GUI.prototype.end = function (gl, canvasWidth, canvasHeight) {

    // create GUI geometry.
    this.allGuiGeometry
        .attr("aPosition", this.positionBuffer, {size: 2})
        .attr("aColor", this.colorBuffer, {size: 3})
        .attr("aUv", this.uvBuffer, {size: 2})
        .faces(this.indexBuffer);


    this.shader.bind()

    /*
    Setup matrices.
     */
    var projection = mat4.create()
    mat4.ortho(projection, 0, canvasWidth, canvasHeight, 0, -1.0, 1.0)


    this.shader.uniforms.uProj = projection;
    this.shader.uniforms.uFontAtlas = this.fontAtlasTexture.bind()



    gl.enable(gl.BLEND)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)

    // render gui geometry.
    this.allGuiGeometry.bind(this.shader)
    this.allGuiGeometry.draw()

    gl.disable(gl.BLEND)

}


module.exports = GUI;
