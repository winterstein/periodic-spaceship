/*! Made with ct.js http://ctjs.rocks/ */

try {
    require('electron');
} catch {
    if (location.protocol === 'file:') {
        // eslint-disable-next-line no-alert
        alert('Your game won\'t work like this because\nWeb 👏 builds 👏 require 👏 a web 👏 server!\n\nConsider using a desktop build, or upload your web build to itch.io, GameJolt or your own website.\n\nIf you haven\'t created this game, please contact the developer about this issue.\n\n Also note that ct.js games do not work inside the itch app; you will need to open the game with your browser of choice.');
    }
}

const deadPool = []; // a pool of `kill`-ed copies for delaying frequent garbage collection
const copyTypeSymbol = Symbol('I am a ct.js copy');
setInterval(function cleanDeadPool() {
    deadPool.length = 0;
}, 1000 * 60);

/**
 * The ct.js library
 * @namespace
 */
const ct = {
    /**
     * A target number of frames per second. It can be interpreted as a second in timers.
     * @type {number}
     */
    speed: [60][0] || 60,
    templates: {},
    snd: {},
    stack: [],
    fps: [60][0] || 60,
    /**
     * A measure of how long a frame took time to draw, usually equal to 1 and larger on lags.
     * For example, if it is equal to 2, it means that the previous frame took twice as much time
     * compared to expected FPS rate.
     *
     * Use ct.delta to balance your movement and other calculations on different framerates by
     * multiplying it with your reference value.
     *
     * Note that `this.move()` already uses it, so there is no need to premultiply
     * `this.speed` with it.
     *
     * **A minimal example:**
     * ```js
     * this.x += this.windSpeed * ct.delta;
     * ```
     *
     * @template {number}
     */
    delta: 1,
    /**
     * A measure of how long a frame took time to draw, usually equal to 1 and larger on lags.
     * For example, if it is equal to 2, it means that the previous frame took twice as much time
     * compared to expected FPS rate.
     *
     * This is a version for UI elements, as it is not affected by time scaling, and thus works well
     * both with slow-mo effects and game pause.
     *
     * @template {number}
     */
    deltaUi: 1,
    /**
     * The camera that outputs its view to the renderer.
     * @template {Camera}
     */
    camera: null,
    /**
     * ct.js version in form of a string `X.X.X`.
     * @template {string}
     */
    version: '3.3.0',
    meta: [{"name":"Periodic Spaceship","author":"Daniel Winterstein","site":"https://winterstein.me.uk","version":"0.1.1"}][0],
    get width() {
        return ct.pixiApp.renderer.view.width;
    },
    /**
     * Resizes the drawing canvas and viewport to the given value in pixels.
     * When used with ct.fittoscreen, can be used to enlarge/shrink the viewport.
     * @param {number} value New width in pixels
     * @template {number}
     */
    set width(value) {
        ct.camera.width = ct.roomWidth = value;
        if (!ct.fittoscreen || ct.fittoscreen.mode === 'fastScale') {
            ct.pixiApp.renderer.resize(value, ct.height);
        }
        if (ct.fittoscreen) {
            ct.fittoscreen();
        }
        return value;
    },
    get height() {
        return ct.pixiApp.renderer.view.height;
    },
    /**
     * Resizes the drawing canvas and viewport to the given value in pixels.
     * When used with ct.fittoscreen, can be used to enlarge/shrink the viewport.
     * @param {number} value New height in pixels
     * @template {number}
     */
    set height(value) {
        ct.camera.height = ct.roomHeight = value;
        if (!ct.fittoscreen || ct.fittoscreen.mode === 'fastScale') {
            ct.pixiApp.renderer.resize(ct.width, value);
        }
        if (ct.fittoscreen) {
            ct.fittoscreen();
        }
        return value;
    }
};

// eslint-disable-next-line no-console
console.log(
    `%c 😺 %c ct.js game editor %c v${ct.version} %c https://ctjs.rocks/ `,
    'background: #446adb; color: #fff; padding: 0.5em 0;',
    'background: #5144db; color: #fff; padding: 0.5em 0;',
    'background: #446adb; color: #fff; padding: 0.5em 0;',
    'background: #5144db; color: #fff; padding: 0.5em 0;'
);

ct.highDensity = [true][0];
const pixiAppSettings = {
    width: [1280][0],
    height: [720][0],
    antialias: ![false][0],
    powerPreference: 'high-performance',
    sharedTicker: false,
    sharedLoader: true,
    transparent: [false][0]
};
try {
    /**
     * The PIXI.Application that runs ct.js game
     * @template {PIXI.Application}
     */
    ct.pixiApp = new PIXI.Application(pixiAppSettings);
} catch (e) {
    console.error(e);
    // eslint-disable-next-line no-console
    console.warn('[ct.js] Something bad has just happened. This is usually due to hardware problems. I\'ll try to fix them now, but if the game still doesn\'t run, try including a legacy renderer in the project\'s settings.');
    PIXI.settings.SPRITE_MAX_TEXTURES = Math.min(PIXI.settings.SPRITE_MAX_TEXTURES, 16);
    ct.pixiApp = new PIXI.Application(pixiAppSettings);
}

PIXI.settings.ROUND_PIXELS = [false][0];
ct.pixiApp.ticker.maxFPS = [60][0] || 0;
if (!ct.pixiApp.renderer.options.antialias) {
    PIXI.settings.SCALE_MODE = PIXI.SCALE_MODES.NEAREST;
}
/**
 * @template PIXI.Container
 */
ct.stage = ct.pixiApp.stage;
ct.pixiApp.renderer.autoDensity = ct.highDensity;
document.getElementById('ct').appendChild(ct.pixiApp.view);

/**
 * A library of different utility functions, mainly Math-related, but not limited to them.
 * @namespace
 */
ct.u = {
    /**
     * Get the environment the game runs on.
     * @returns {string} Either 'ct.ide', or 'nw', or 'electron', or 'browser'.
     */
    getEnvironment() {
        if (window.name === 'ct.js debugger') {
            return 'ct.ide';
        }
        try {
            if (nw.require) {
                return 'nw';
            }
        } catch (oO) {
            void 0;
        }
        try {
            require('electron');
            return 'electron';
        } catch (Oo) {
            void 0;
        }
        return 'browser';
    },
    /**
     * Get the current operating system the game runs on.
     * @returns {string} One of 'windows', 'darwin' (which is MacOS), 'linux', or 'unknown'.
     */
    getOS() {
        const ua = window.navigator.userAgent;
        if (ua.indexOf('Windows') !== -1) {
            return 'windows';
        }
        if (ua.indexOf('Linux') !== -1) {
            return 'linux';
        }
        if (ua.indexOf('Mac') !== -1) {
            return 'darwin';
        }
        return 'unknown';
    },
    /**
     * Returns the length of a vector projection onto an X axis.
     * @param {number} l The length of the vector
     * @param {number} d The direction of the vector
     * @returns {number} The length of the projection
     */
    ldx(l, d) {
        return l * Math.cos(d * Math.PI / 180);
    },
    /**
     * Returns the length of a vector projection onto an Y axis.
     * @param {number} l The length of the vector
     * @param {number} d The direction of the vector
     * @returns {number} The length of the projection
     */
    ldy(l, d) {
        return l * Math.sin(d * Math.PI / 180);
    },
    /**
     * Returns the direction of a vector that points from the first point to the second one.
     * @param {number} x1 The x location of the first point
     * @param {number} y1 The y location of the first point
     * @param {number} x2 The x location of the second point
     * @param {number} y2 The y location of the second point
     * @returns {number} The angle of the resulting vector, in degrees
     */
    pdn(x1, y1, x2, y2) {
        return (Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI + 360) % 360;
    },
    // Point-point DistanCe
    /**
     * Returns the distance between two points
     * @param {number} x1 The x location of the first point
     * @param {number} y1 The y location of the first point
     * @param {number} x2 The x location of the second point
     * @param {number} y2 The y location of the second point
     * @returns {number} The distance between the two points
     */
    pdc(x1, y1, x2, y2) {
        return Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1));
    },
    /**
     * Convers degrees to radians
     * @param {number} deg The degrees to convert
     * @returns {number} The resulting radian value
     */
    degToRad(deg) {
        return deg * Math.PI / 180;
    },
    /**
     * Convers radians to degrees
     * @param {number} rad The radian value to convert
     * @returns {number} The resulting degree
     */
    radToDeg(rad) {
        return rad / Math.PI * 180;
    },
    /**
     * Rotates a vector (x; y) by `deg` around (0; 0)
     * @param {number} x The x component
     * @param {number} y The y component
     * @param {number} deg The degree to rotate by
     * @returns {PIXI.Point} A pair of new `x` and `y` parameters.
     */
    rotate(x, y, deg) {
        return ct.u.rotateRad(x, y, ct.u.degToRad(deg));
    },
    /**
     * Rotates a vector (x; y) by `rad` around (0; 0)
     * @param {number} x The x component
     * @param {number} y The y component
     * @param {number} rad The radian value to rotate around
     * @returns {PIXI.Point} A pair of new `x` and `y` parameters.
     */
    rotateRad(x, y, rad) {
        const sin = Math.sin(rad),
              cos = Math.cos(rad);
        return new PIXI.Point(
            cos * x - sin * y,
            cos * y + sin * x
        );
    },
    /**
     * Gets the most narrow angle between two vectors of given directions
     * @param {number} dir1 The direction of the first vector
     * @param {number} dir2 The direction of the second vector
     * @returns {number} The resulting angle
     */
    deltaDir(dir1, dir2) {
        dir1 = ((dir1 % 360) + 360) % 360;
        dir2 = ((dir2 % 360) + 360) % 360;
        var t = dir1,
            h = dir2,
            ta = h - t;
        if (ta > 180) {
            ta -= 360;
        }
        if (ta < -180) {
            ta += 360;
        }
        return ta;
    },
    /**
     * Returns a number in between the given range (clamps it).
     * @param {number} min The minimum value of the given number
     * @param {number} val The value to fit in the range
     * @param {number} max The maximum value of the given number
     * @returns {number} The clamped value
     */
    clamp(min, val, max) {
        return Math.max(min, Math.min(max, val));
    },
    /**
     * Linearly interpolates between two values by the apha value.
     * Can also be describing as mixing between two values with a given proportion `alpha`.
     * @param {number} a The first value to interpolate from
     * @param {number} b The second value to interpolate to
     * @param {number} alpha The mixing value
     * @returns {number} The result of the interpolation
     */
    lerp(a, b, alpha) {
        return a + (b - a) * alpha;
    },
    /**
     * Returns the position of a given value in a given range. Opposite to linear interpolation.
     * @param  {number} a The first value to interpolate from
     * @param  {number} b The second value to interpolate top
     * @param  {number} val The interpolated values
     * @return {number} The position of the value in the specified range.
     * When a <= val <= b, the result will be inside the [0;1] range.
     */
    unlerp(a, b, val) {
        return (val - a) / (b - a);
    },
    /**
     * Re-maps the given value from one number range to another.
     * @param  {number} val The value to be mapped
     * @param  {number} inMin Lower bound of the value's current range
     * @param  {number} inMax Upper bound of the value's current range
     * @param  {number} outMin Lower bound of the value's target range
     * @param  {number} outMax Upper bound of the value's target range
     * @returns {number} The mapped value.
     */
    map(val, inMin, inMax, outMin, outMax) {
        return (val - inMin) * (outMax - outMin) / (inMax - inMin) + outMin;
    },
    /**
     * Translates a point from UI space to game space.
     * @param {number} x The x coordinate in UI space.
     * @param {number} y The y coordinate in UI space.
     * @returns {PIXI.Point} A pair of new `x` and `y` coordinates.
     */
    uiToGameCoord(x, y) {
        return ct.camera.uiToGameCoord(x, y);
    },
    /**
     * Translates a point from fame space to UI space.
     * @param {number} x The x coordinate in game space.
     * @param {number} y The y coordinate in game space.
     * @returns {PIXI.Point} A pair of new `x` and `y` coordinates.
     */
    gameToUiCoord(x, y) {
        return ct.camera.gameToUiCoord(x, y);
    },
    hexToPixi(hex) {
        return Number('0x' + hex.slice(1));
    },
    pixiToHex(pixi) {
        return '#' + (pixi).toString(16).padStart(6, 0);
    },
    /**
     * Tests whether a given point is inside the given rectangle
     * (it can be either a copy or an array).
     * @param {number} x The x coordinate of the point.
     * @param {number} y The y coordinate of the point.
     * @param {(Copy|Array<Number>)} arg Either a copy (it must have a rectangular shape)
     * or an array in a form of [x1, y1, x2, y2], where (x1;y1) and (x2;y2) specify
     * the two opposite corners of the rectangle.
     * @returns {boolean} `true` if the point is inside the rectangle, `false` otherwise.
     */
    prect(x, y, arg) {
        var xmin, xmax, ymin, ymax;
        if (arg.splice) {
            xmin = Math.min(arg[0], arg[2]);
            xmax = Math.max(arg[0], arg[2]);
            ymin = Math.min(arg[1], arg[3]);
            ymax = Math.max(arg[1], arg[3]);
        } else {
            xmin = arg.x - arg.shape.left * arg.scale.x;
            xmax = arg.x + arg.shape.right * arg.scale.x;
            ymin = arg.y - arg.shape.top * arg.scale.y;
            ymax = arg.y + arg.shape.bottom * arg.scale.y;
        }
        return x >= xmin && y >= ymin && x <= xmax && y <= ymax;
    },
    /**
     * Tests whether a given point is inside the given circle (it can be either a copy or an array)
     * @param {number} x The x coordinate of the point
     * @param {number} y The y coordinate of the point
     * @param {(Copy|Array<Number>)} arg Either a copy (it must have a circular shape)
     * or an array in a form of [x1, y1, r], where (x1;y1) define the center of the circle
     * and `r` defines the radius of it.
     * @returns {boolean} `true` if the point is inside the circle, `false` otherwise
     */
    pcircle(x, y, arg) {
        if (arg.splice) {
            return ct.u.pdc(x, y, arg[0], arg[1]) < arg[2];
        }
        return ct.u.pdc(0, 0, (arg.x - x) / arg.scale.x, (arg.y - y) / arg.scale.y) < arg.shape.r;
    },
    /**
     * Copies all the properties of the source object to the destination object.
     * This is **not** a deep copy. Useful for extending some settings with default values,
     * or for combining data.
     * @param {object} o1 The destination object
     * @param {object} o2 The source object
     * @param {any} [arr] An optional array of properties to copy. If not specified,
     * all the properties will be copied.
     * @returns {object} The modified destination object
     */
    ext(o1, o2, arr) {
        if (arr) {
            for (const i in arr) {
                if (o2[arr[i]]) {
                    o1[arr[i]] = o2[arr[i]];
                }
            }
        } else {
            for (const i in o2) {
                o1[i] = o2[i];
            }
        }
        return o1;
    },
    /**
     * Returns a Promise that resolves after the given time.
     * This timer is run in gameplay time scale, meaning that it is affected by time stretching.
     * @param {number} time Time to wait, in milliseconds
     * @returns {CtTimer} The timer, which you can call `.then()` to
     */
    wait(time) {
        return ct.timer.add(time);
    },
    /**
     * Returns a Promise that resolves after the given time.
     * This timer runs in UI time scale and is not sensitive to time stretching.
     * @param {number} time Time to wait, in milliseconds
     * @returns {CtTimer} The timer, which you can call `.then()` to
     */
    waitUi(time) {
        return ct.timer.addUi(time);
    },
    /**
     * Creates a new function that returns a promise, based
     * on a function with a regular (err, result) => {...} callback.
     * @param {Function} f The function that needs to be promisified
     * @see https://javascript.info/promisify
     */
    promisify(f) {
        // eslint-disable-next-line func-names
        return function (...args) {
            return new Promise((resolve, reject) => {
                const callback = function callback(err, result) {
                    if (err) {
                        reject(err);
                    } else {
                        resolve(result);
                    }
                };
                args.push(callback);
                f.call(this, ...args);
            });
        };
    },
    required(paramName, method) {
        let str = 'The parameter ';
        if (paramName) {
            str += `${paramName} `;
        }
        if (method) {
            str += `of ${method} `;
        }
        str += 'is required.';
        throw new Error(str);
    },
    numberedString(prefix, input) {
        return prefix + '_' + input.toString().padStart(2, '0');
    },
    getStringNumber(str) {
        return Number(str.split('_').pop());
    }
};
ct.u.ext(ct.u, {// make aliases
    getOs: ct.u.getOS,
    lengthDirX: ct.u.ldx,
    lengthDirY: ct.u.ldy,
    pointDirection: ct.u.pdn,
    pointDistance: ct.u.pdc,
    pointRectangle: ct.u.prect,
    pointCircle: ct.u.pcircle,
    extend: ct.u.ext
});

// eslint-disable-next-line max-lines-per-function
(() => {
    const killRecursive = copy => {
        copy.kill = true;
        if (copy.onDestroy) {
            ct.templates.onDestroy.apply(copy);
            copy.onDestroy.apply(copy);
        }
        for (const child of copy.children) {
            if (child[copyTypeSymbol]) {
                killRecursive(child);
            }
        }
        const stackIndex = ct.stack.indexOf(copy);
        if (stackIndex !== -1) {
            ct.stack.splice(stackIndex, 1);
        }
        if (copy.template) {
            const templatelistIndex = ct.templates.list[copy.template].indexOf(copy);
            if (templatelistIndex !== -1) {
                ct.templates.list[copy.template].splice(templatelistIndex, 1);
            }
        }
        deadPool.push(copy);
    };
    const manageCamera = () => {
        if (ct.camera) {
            ct.camera.update(ct.delta);
            ct.camera.manageStage();
        }
    };

    ct.loop = function loop() {
        ct.delta = ct.pixiApp.ticker.deltaMS / (1000 / (ct.pixiApp.ticker.maxFPS || 60));
        ct.deltaUi = ct.pixiApp.ticker.elapsedMS / (1000 / (ct.pixiApp.ticker.maxFPS || 60));
        ct.inputs.updateActions();
        ct.timer.updateTimers();
        ct.place.debugTraceGraphics.clear();

        ct.rooms.rootRoomOnStep.apply(ct.room);
        for (let i = 0, li = ct.stack.length; i < li; i++) {
            ct.templates.beforeStep.apply(ct.stack[i]);
            ct.stack[i].onStep.apply(ct.stack[i]);
            ct.templates.afterStep.apply(ct.stack[i]);
        }
        // There may be a number of rooms stacked on top of each other.
        // Loop through them and filter out everything that is not a room.
        for (const item of ct.stage.children) {
            if (!(item instanceof Room)) {
                continue;
            }
            ct.rooms.beforeStep.apply(item);
            item.onStep.apply(item);
            ct.rooms.afterStep.apply(item);
        }
        // copies
        for (const copy of ct.stack) {
            // eslint-disable-next-line no-underscore-dangle
            if (copy.kill && !copy._destroyed) {
                killRecursive(copy); // This will also allow a parent to eject children
                                     // to a new container before they are destroyed as well
                copy.destroy({
                    children: true
                });
            }
        }

        for (const cont of ct.stage.children) {
            cont.children.sort((a, b) =>
                ((a.depth || 0) - (b.depth || 0)) || ((a.uid || 0) - (b.uid || 0)) || 0);
        }

        manageCamera();

        for (let i = 0, li = ct.stack.length; i < li; i++) {
            ct.templates.beforeDraw.apply(ct.stack[i]);
            ct.stack[i].onDraw.apply(ct.stack[i]);
            ct.templates.afterDraw.apply(ct.stack[i]);
            ct.stack[i].xprev = ct.stack[i].x;
            ct.stack[i].yprev = ct.stack[i].y;
        }

        for (const item of ct.stage.children) {
            if (!(item instanceof Room)) {
                continue;
            }
            ct.rooms.beforeDraw.apply(item);
            item.onDraw.apply(item);
            ct.rooms.afterDraw.apply(item);
        }
        ct.rooms.rootRoomOnDraw.apply(ct.room);
        /*%afterframe%*/
        if (ct.rooms.switching) {
            ct.rooms.forceSwitch();
        }
    };
})();




/**
 * @property {number} value The current value of an action. It is always in the range from -1 to 1.
 * @property {string} name The name of the action.
 */
class CtAction {
    /**
     * This is a custom action defined in the Settings tab → Edit actions section.
     * Actions are used to abstract different input methods into one gameplay-related interface:
     * for example, joystick movement, WASD keys and arrows can be turned into two actions:
     * `MoveHorizontally` and `MoveVertically`.
     * @param {string} name The name of the new action.
     */
    constructor(name) {
        this.name = name;
        this.methodCodes = [];
        this.methodMultipliers = [];
        this.prevValue = 0;
        this.value = 0;
        return this;
    }
    /**
     * Checks whether the current action listens to a given input method.
     * This *does not* check whether this input method is supported by ct.
     *
     * @param {string} code The code to look up.
     * @returns {boolean} `true` if it exists, `false` otherwise.
     */
    methodExists(code) {
        return this.methodCodes.indexOf(code) !== -1;
    }
    /**
     * Adds a new input method to listen.
     *
     * @param {string} code The input method's code to listen to. Must be unique per action.
     * @param {number} [multiplier] An optional multiplier, e.g. to flip its value.
     * Often used with two buttons to combine them into a scalar input identical to joysticks.
     * @returns {void}
     */
    addMethod(code, multiplier) {
        if (this.methodCodes.indexOf(code) === -1) {
            this.methodCodes.push(code);
            this.methodMultipliers.push(multiplier !== void 0 ? multiplier : 1);
        } else {
            throw new Error(`[ct.inputs] An attempt to add an already added input "${code}" to an action "${name}".`);
        }
    }
    /**
     * Removes the provided input method for an action.
     *
     * @param {string} code The input method to remove.
     * @returns {void}
     */
    removeMethod(code) {
        const ind = this.methodCodes.indexOf(code);
        if (ind !== -1) {
            this.methodCodes.splice(ind, 1);
            this.methodMultipliers.splice(ind, 1);
        }
    }
    /**
     * Changes the multiplier for an input method with the provided code.
     * This method will produce a warning if one is trying to change an input method
     * that is not listened by this action.
     *
     * @param {string} code The input method's code to change
     * @param {number} multiplier The new value
     * @returns {void}
     */
    setMultiplier(code, multiplier) {
        const ind = this.methodCodes.indexOf(code);
        if (ind !== -1) {
            this.methodMultipliers[ind] = multiplier;
        } else {
            // eslint-disable-next-line no-console
            console.warning(`[ct.inputs] An attempt to change multiplier of a non-existent method "${code}" at event ${this.name}`);
            // eslint-disable-next-line no-console
            console.trace();
        }
    }
    /**
     * Recalculates the digital value of an action.
     *
     * @returns {number} A scalar value between -1 and 1.
     */
    update() {
        this.prevValue = this.value;
        this.value = 0;
        for (let i = 0, l = this.methodCodes.length; i < l; i++) {
            const rawValue = ct.inputs.registry[this.methodCodes[i]] || 0;
            this.value += rawValue * this.methodMultipliers[i];
        }
        this.value = Math.max(-1, Math.min(this.value, 1));
    }
    /**
     * Resets the state of this action, setting its value to `0`
     * and its pressed, down, released states to `false`.
     *
     * @returns {void}
     */
    reset() {
        this.prevValue = this.value = 0;
    }
    /**
     * Returns whether the action became active in the current frame,
     * either by a button just pressed or by using a scalar input.
     *
     * `true` for being pressed and `false` otherwise
     * @type {boolean}
     */
    get pressed() {
        return this.prevValue === 0 && this.value !== 0;
    }
    /**
     * Returns whether the action became inactive in the current frame,
     * either by releasing all buttons or by resting all scalar inputs.
     *
     * `true` for being released and `false` otherwise
     * @type {boolean}
     */
    get released() {
        return this.prevValue !== 0 && this.value === 0;
    }
    /**
     * Returns whether the action is active, e.g. by a pressed button
     * or a currently used scalar input.
     *
     * `true` for being active and `false` otherwise
     * @type {boolean}
     */
    get down() {
        return this.value !== 0;
    }
    /* In case you need to be hated for the rest of your life, uncomment this */
    /*
    valueOf() {
        return this.value;
    }
    */
}

/**
 * A list of custom Actions. They are defined in the Settings tab → Edit actions section.
 * @type {Object.<string,CtAction>}
 */
ct.actions = {};
/**
 * @namespace
 */
ct.inputs = {
    registry: {},
    /**
     * Adds a new action and puts it into `ct.actions`.
     *
     * @param {string} name The name of an action, as it will be used in `ct.actions`.
     * @param {Array<Object>} methods A list of input methods. This list can be changed later.
     * @returns {CtAction} The created action
     */
    addAction(name, methods) {
        if (name in ct.actions) {
            throw new Error(`[ct.inputs] An action "${name}" already exists, can't add a new one with the same name.`);
        }
        const action = new CtAction(name);
        for (const method of methods) {
            action.addMethod(method.code, method.multiplier);
        }
        ct.actions[name] = action;
        return action;
    },
    /**
     * Removes an action with a given name.
     * @param {string} name The name of an action
     * @returns {void}
     */
    removeAction(name) {
        delete ct.actions[name];
    },
    /**
     * Recalculates values for every action in a game.
     * @returns {void}
     */
    updateActions() {
        for (const i in ct.actions) {
            ct.actions[i].update();
        }
    }
};

ct.inputs.addAction('Press', [{"code":"pointer.Any"}]);
ct.inputs.addAction('MoveLeftRight', [{"code":"keyboard.KeyA","multiplier":-1},{"code":"keyboard.ArrowLeft","multiplier":-1},{"code":"keyboard.ArrowRight"},{"code":"keyboard.KeyD"}]);
ct.inputs.addAction('Up', [{"code":"keyboard.KeyW"},{"code":"keyboard.ArrowUp"}]);
ct.inputs.addAction('Down', [{"code":"keyboard.KeyS"},{"code":"keyboard.ArrowDown"}]);
ct.inputs.addAction('Fire', [{"code":"keyboard.Space"}]);
ct.inputs.addAction('Esc', [{"code":"keyboard.Escape"}]);
ct.inputs.addAction('VJoyX', [{"code":"vkeys.Vjoy1X"}]);
ct.inputs.addAction('VJoyY', [{"code":"vkeys.Vjoy1Y"}]);


/**
 * @typedef IRoomMergeResult
 *
 * @property {Array<Copy>} copies
 * @property {Array<Tilemap>} tileLayers
 * @property {Array<Background>} backgrounds
 */

class Room extends PIXI.Container {
    static getNewId() {
        this.roomId++;
        return this.roomId;
    }

    constructor(template) {
        super();
        this.x = this.y = 0;
        this.uid = Room.getNewId();
        this.tileLayers = [];
        this.backgrounds = [];
        this.timer1 = this.timer2 = this.timer3 = this.timer4 = this.timer5 = this.timer6 = 0;
        if (!ct.room) {
            ct.room = ct.rooms.current = this;
        }
        if (template) {
            this.onCreate = template.onCreate;
            this.onStep = template.onStep;
            this.onDraw = template.onDraw;
            this.onLeave = template.onLeave;
            this.template = template;
            this.name = template.name;
            this.isUi = template.isUi;
            this.follow = template.follow;
            if (template.extends) {
                ct.u.ext(this, template.extends);
            }
            if (this === ct.room) {
                ct.pixiApp.renderer.backgroundColor = ct.u.hexToPixi(this.template.backgroundColor);
            }
            ct.fittoscreen();
if (this === ct.room) {
    ct.place.tileGrid = {};
}

            for (let i = 0, li = template.bgs.length; i < li; i++) {
                // Need to put additional properties like parallax here,
                // so we don't use ct.backgrounds.add
                const bg = new ct.templates.Background(
                    template.bgs[i].texture,
                    null,
                    template.bgs[i].depth,
                    template.bgs[i].exts
                );
                this.addChild(bg);
            }
            for (let i = 0, li = template.tiles.length; i < li; i++) {
                const tl = new Tilemap(template.tiles[i]);
                tl.cache();
                this.tileLayers.push(tl);
                this.addChild(tl);
            }
            for (let i = 0, li = template.objects.length; i < li; i++) {
                const copy = template.objects[i];
                const exts = copy.exts || {};
                const customProperties = copy.customProperties || {};
                ct.templates.copyIntoRoom(
                    copy.template,
                    copy.x,
                    copy.y,
                    this,
                    {
                        ...exts,
                        ...customProperties,
                        scaleX: copy.scale.x,
                        scaleY: copy.scale.y,
                        rotation: copy.rotation,
                        alpha: copy.opacity,
                        tint: copy.tint
                    }
                );
            }
        }
        return this;
    }
    get x() {
        return -this.position.x;
    }
    set x(value) {
        this.position.x = -value;
        return value;
    }
    get y() {
        return -this.position.y;
    }
    set y(value) {
        this.position.y = -value;
        return value;
    }
}
Room.roomId = 0;

(function roomsAddon() {
    /* global deadPool */
    var nextRoom;
    /**
     * @namespace
     */
    ct.rooms = {
        templates: {},
        /**
         * An object that contains arrays of currently present rooms.
         * These include the current room (`ct.room`), as well as any rooms
         * appended or prepended through `ct.rooms.append` and `ct.rooms.prepend`.
         * @type {Object.<string,Array<Room>>}
         */
        list: {},
        /**
         * Creates and adds a background to the current room, at the given depth.
         * @param {string} texture The name of the texture to use
         * @param {number} depth The depth of the new background
         * @returns {Background} The created background
         */
        addBg(texture, depth) {
            const bg = new ct.templates.Background(texture, null, depth);
            ct.room.addChild(bg);
            return bg;
        },
        /**
         * Adds a new empty tile layer to the room, at the given depth
         * @param {number} layer The depth of the layer
         * @returns {Tileset} The created tile layer
         * @deprecated Use ct.tilemaps.create instead.
         */
        addTileLayer(layer) {
            return ct.tilemaps.create(layer);
        },
        /**
         * Clears the current stage, removing all rooms with copies, tile layers, backgrounds,
         * and other potential entities.
         * @returns {void}
         */
        clear() {
            ct.stage.children = [];
            ct.stack = [];
            for (const i in ct.templates.list) {
                ct.templates.list[i] = [];
            }
            for (const i in ct.backgrounds.list) {
                ct.backgrounds.list[i] = [];
            }
            ct.rooms.list = {};
            for (const name in ct.rooms.templates) {
                ct.rooms.list[name] = [];
            }
        },
        /**
         * This method safely removes a previously appended/prepended room from the stage.
         * It will trigger "On Leave" for a room and "On Destroy" event
         * for all the copies of the removed room.
         * The room will also have `this.kill` set to `true` in its event, if it comes in handy.
         * This method cannot remove `ct.room`, the main room.
         * @param {Room} room The `room` argument must be a reference
         * to the previously created room.
         * @returns {void}
         */
        remove(room) {
            if (!(room instanceof Room)) {
                if (typeof room === 'string') {
                    throw new Error('[ct.rooms] To remove a room, you should provide a reference to it (to an object), not its name. Provided value:', room);
                }
                throw new Error('[ct.rooms] An attempt to remove a room that is not actually a room! Provided value:', room);
            }
            const ind = ct.rooms.list[room.name];
            if (ind !== -1) {
                ct.rooms.list[room.name].splice(ind, 1);
            } else {
                // eslint-disable-next-line no-console
                console.warn('[ct.rooms] Removing a room that was not found in ct.rooms.list. This is strange…');
            }
            room.kill = true;
            ct.stage.removeChild(room);
            for (const copy of room.children) {
                copy.kill = true;
            }
            room.onLeave();
            ct.rooms.onLeave.apply(room);
        },
        /*
         * Switches to the given room. Note that this transition happens at the end
         * of the frame, so the name of a new room may be overridden.
         */
        'switch'(roomName) {
            if (ct.rooms.templates[roomName]) {
                nextRoom = roomName;
                ct.rooms.switching = true;
            } else {
                console.error('[ct.rooms] The room "' + roomName + '" does not exist!');
            }
        },
        switching: false,
        /**
         * Restarts the current room.
         * @returns {void}
         */
        restart() {
            ct.rooms.switch(ct.room.name);
        },
        /**
         * Creates a new room and adds it to the stage, separating its draw stack
         * from existing ones.
         * This room is added to `ct.stage` after all the other rooms.
         * @param {string} roomName The name of the room to be appended
         * @param {object} [exts] Any additional parameters applied to the new room.
         * Useful for passing settings and data to new widgets and prefabs.
         * @returns {Room} A newly created room
         */
        append(roomName, exts) {
            if (!(roomName in ct.rooms.templates)) {
                console.error(`[ct.rooms] append failed: the room ${roomName} does not exist!`);
                return false;
            }
            const room = new Room(ct.rooms.templates[roomName]);
            if (exts) {
                ct.u.ext(room, exts);
            }
            ct.stage.addChild(room);
            room.onCreate();
            ct.rooms.onCreate.apply(room);
            ct.rooms.list[roomName].push(room);
            return room;
        },
        /**
         * Creates a new room and adds it to the stage, separating its draw stack
         * from existing ones.
         * This room is added to `ct.stage` before all the other rooms.
         * @param {string} roomName The name of the room to be prepended
         * @param {object} [exts] Any additional parameters applied to the new room.
         * Useful for passing settings and data to new widgets and prefabs.
         * @returns {Room} A newly created room
         */
        prepend(roomName, exts) {
            if (!(roomName in ct.rooms.templates)) {
                console.error(`[ct.rooms] prepend failed: the room ${roomName} does not exist!`);
                return false;
            }
            const room = new Room(ct.rooms.templates[roomName]);
            if (exts) {
                ct.u.ext(room, exts);
            }
            ct.stage.addChildAt(room, 0);
            room.onCreate();
            ct.rooms.onCreate.apply(room);
            ct.rooms.list[roomName].push(room);
            return room;
        },
        /**
         * Merges a given room into the current one. Skips room's OnCreate event.
         *
         * @param {string} roomName The name of the room that needs to be merged
         * @returns {IRoomMergeResult} Arrays of created copies, backgrounds, tile layers,
         * added to the current room (`ct.room`). Note: it does not get updated,
         * so beware of memory leaks if you keep a reference to this array for a long time!
         */
        merge(roomName) {
            if (!(roomName in ct.rooms.templates)) {
                console.error(`[ct.rooms] merge failed: the room ${roomName} does not exist!`);
                return false;
            }
            const generated = {
                copies: [],
                tileLayers: [],
                backgrounds: []
            };
            const template = ct.rooms.templates[roomName];
            const target = ct.room;
            for (const t of template.bgs) {
                const bg = new ct.templates.Background(t.texture, null, t.depth, t.extends);
                target.backgrounds.push(bg);
                target.addChild(bg);
                generated.backgrounds.push(bg);
            }
            for (const t of template.tiles) {
                const tl = new Tilemap(t);
                target.tileLayers.push(tl);
                target.addChild(tl);
                generated.tileLayers.push(tl);
                tl.cache();
            }
            for (const t of template.objects) {
                const c = ct.templates.copyIntoRoom(t.template, t.x, t.y, target, {
                    tx: t.tx || 1,
                    ty: t.ty || 1,
                    tr: t.tr || 0
                });
                generated.copies.push(c);
            }
            return generated;
        },
        forceSwitch(roomName) {
            if (nextRoom) {
                roomName = nextRoom;
            }
            if (ct.room) {
                ct.rooms.rootRoomOnLeave.apply(ct.room);
                ct.room.onLeave();
                ct.rooms.onLeave.apply(ct.room);
                ct.room = void 0;
            }
            ct.rooms.clear();
            deadPool.length = 0;
            var template = ct.rooms.templates[roomName];
            ct.roomWidth = template.width;
            ct.roomHeight = template.height;
            ct.camera = new Camera(
                ct.roomWidth / 2,
                ct.roomHeight / 2,
                ct.roomWidth,
                ct.roomHeight
            );
            if (template.cameraConstraints) {
                ct.camera.minX = template.cameraConstraints.x1;
                ct.camera.maxX = template.cameraConstraints.x2;
                ct.camera.minY = template.cameraConstraints.y1;
                ct.camera.maxY = template.cameraConstraints.y2;
            }
            ct.pixiApp.renderer.resize(template.width, template.height);
            ct.rooms.current = ct.room = new Room(template);
            ct.stage.addChild(ct.room);
            ct.rooms.rootRoomOnCreate.apply(ct.room);
            ct.room.onCreate();
            ct.rooms.onCreate.apply(ct.room);
            ct.rooms.list[roomName].push(ct.room);
            
            ct.camera.manageStage();
            ct.rooms.switching = false;
            nextRoom = void 0;
        },
        onCreate() {
            if (this === ct.room) {
    const debugTraceGraphics = new PIXI.Graphics();
    debugTraceGraphics.depth = 10000000; // Why not. Overlap everything.
    ct.room.addChild(debugTraceGraphics);
    ct.place.debugTraceGraphics = debugTraceGraphics;
}
for (const layer of this.tileLayers) {
    if (this.children.indexOf(layer) === -1) {
        continue;
    }
    ct.place.enableTilemapCollisions(layer);
}

        },
        onLeave() {
            /* global ct */

if (!this.kill) {
    for (var tween of ct.tween.tweens) {
        tween.reject({
            info: 'Room switch',
            code: 1,
            from: 'ct.tween'
        });
    }
    ct.tween.tweens = [];
}
if (this === ct.room) {
    ct.place.grid = {};
}

        },
        /**
         * The name of the starting room, as it was set in ct.IDE.
         * @type {string}
         */
        starting: 'Room_Menu'
    };
})();
/**
 * The current room
 * @type {Room}
 */
ct.room = null;

ct.rooms.beforeStep = function beforeStep() {
    var i = 0;
while (i < ct.tween.tweens.length) {
    var tween = ct.tween.tweens[i];
    if (tween.obj.kill) {
        tween.reject({
            code: 2,
            info: 'Copy is killed'
        });
        ct.tween.tweens.splice(i, 1);
        continue;
    }
    var a = tween.timer.time / tween.duration;
    if (a > 1) {
        a = 1;
    }
    for (var field in tween.fields) {
        var s = tween.starting[field],
            d = tween.fields[field] - tween.starting[field];
        tween.obj[field] = tween.curve(s, d, a);
    }
    if (a === 1) {
        tween.resolve(tween.fields);
        ct.tween.tweens.splice(i, 1);
        continue;
    }
    i++;
}
ct.pointer.updateGestures();
{
    const positionGame = ct.u.uiToGameCoord(ct.pointer.xui, ct.pointer.yui);
    ct.pointer.x = positionGame.x;
    ct.pointer.y = positionGame.y;
}
ct.touch.updateGestures();

};
ct.rooms.afterStep = function afterStep() {
    
};
ct.rooms.beforeDraw = function beforeDraw() {
    
};
ct.rooms.afterDraw = function afterDraw() {
    ct.keyboard.clear();
for (const pointer of ct.pointer.down) {
    pointer.xprev = pointer.x;
    pointer.yprev = pointer.y;
    pointer.xuiprev = pointer.x;
    pointer.yuiprev = pointer.y;
}
for (const pointer of ct.pointer.hover) {
    pointer.xprev = pointer.x;
    pointer.yprev = pointer.y;
    pointer.xuiprev = pointer.x;
    pointer.yuiprev = pointer.y;
}
ct.inputs.registry['pointer.Wheel'] = 0;
ct.pointer.clearReleased();
ct.pointer.xmovement = ct.pointer.ymovement = 0;
for (const touch of ct.touch.events) {
    touch.xprev = touch.x;
    touch.yprev = touch.y;
    touch.xuiprev = touch.x;
    touch.yuiprev = touch.y;
    ct.touch.clearReleased();
}

};
ct.rooms.rootRoomOnCreate = function rootRoomOnCreate() {
    

};
ct.rooms.rootRoomOnStep = function rootRoomOnStep() {
    

};
ct.rooms.rootRoomOnDraw = function rootRoomOnDraw() {
    

};
ct.rooms.rootRoomOnLeave = function rootRoomOnLeave() {
    

};


ct.rooms.templates['Room_p-table'] = {
    name: 'Room_p-table',
    group: 'ungrouped',
    width: 1280,
    height: 720,
    objects: JSON.parse('[]'),
    bgs: JSON.parse('[{"texture":"starry-sky-2675322_1920","depth":-100,"exts":{"movementX":0,"movementY":0.5,"parallaxX":1,"parallaxY":1,"repeat":"repeat","scaleX":1,"scaleY":1,"shiftX":0,"shiftY":0}}]'),
    tiles: JSON.parse('[{"depth":1,"tiles":[],"extends":{}}]'),
    backgroundColor: '#000000',
    
    onStep() {
        
    },
    onDraw() {
        
    },
    onLeave() {
        
    },
    onCreate() {
        /* room Room_p-table — core_OnRoomStart (On room start event) */
{

console.log(ct.random);

if ( ! this.roomTilemap) {
    this.roomTilemap = ct.tilemaps.create(-1);

    for(let rowNum=0; rowNum<periodicTable.length; rowNum++) {
        let row = periodicTable[rowNum];
        for(let colNum=0; colNum<row.length; colNum++) {
            let element = row[colNum];
            if ( ! element) continue;
            let n = 1 + Math.floor(Math.random()*7);
            let tName = "room-128-"+n;
            let x = (colNum+1) * (128+8);
            let y = (rowNum+1) * (128+8);
            console.log("addTile",element,this.roomTilemap, tName, x, y);
            // ct.tilemaps.addTile(this.roomTilemap, tName, x, y);
            let tile = this.roomTilemap.addTile(tName, x+1, y+1);
            console.log(tName, tile);
            this.roomTilemap.addTile("wall-v", x, y);
            this.roomTilemap.addTile("wall-h", x, y);
            if ( ! row[colNum+1]) {
                this.roomTilemap.addTile("wall-v", x+128+8, y);
            }
            if (rowNum === periodicTable.length - 1) {
                this.roomTilemap.addTile("wall-h", x, y+128+8);
            }
            let label = new PIXI.Text(element,{fontFamily : 'Arial', fontSize: 24, fill : 0xffffff, align : 'center'});
            label.x = x+64; label.y = y+64;
            this.addChild(label);
            // let roomCopy = ct.templates.copy(tName, x, y);
        }
    }
    // this.roomTilemap.cache();
}

ct.camera.scale.x = 4;
ct.camera.scale.y = 4;

ct.tween.add({
    obj: ct.camera.scale,
    fields: {
        x: 1,
        y: 1
    },
    duration: 2000 // 0.65s
})
.then(() => {
    // When the animation is over, change this.moving to tell
    // that the copy is not moving already.
    this.moving = false;
});

// this.scale.x = 0.25;
// this.scale.y = 0.25;
}

    },
    isUi: false,
    follow: false,
    extends: {}
}
        
ct.rooms.templates['Room_Platformer'] = {
    name: 'Room_Platformer',
    group: 'ungrouped',
    width: 1280,
    height: 720,
    objects: JSON.parse('[{"x":768,"y":224,"opacity":1,"tint":16777215,"scale":{"x":1,"y":1},"rotation":0,"exts":{},"customProperties":{},"template":"chimp"}]'),
    bgs: JSON.parse('[]'),
    tiles: JSON.parse('[]'),
    backgroundColor: '#000000',
    
    onStep() {
        
    },
    onDraw() {
        
    },
    onLeave() {
        
    },
    onCreate() {
        /* room Room_Platformer — core_OnRoomStart (On room start event) */
{
 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }

// Make a room
console.log("options", this.options, roomOptions[this.name]);
// if ( ! this.options) this.options = {symbol:"He"};
let options = roomOptions[this.name];
if ( ! options) {
    options = {symbol:startSymbol};
    platform4symbol[startSymbol] = startPlatform;
    roomOptions[this.name] = options;
    console.log("START at "+options.symbol);
}
assert(options.symbol, options);
this.element = info4symbol[options.symbol];
assert(this.element && this.element.atomic_number, "No element info "+this.element);
assert(this.element.symbol, this.element);
this.atomicNumber = _optionalChain([this, 'access', _ => _.element, 'optionalAccess', _2 => _2.atomic_number]);

// Merge in a room
{
    let roomName = _optionalChain([ct, 'access', _3 => _3.rooms, 'access', _4 => _4.templates, 'access', _5 => _5["Platformer"+options.symbol], 'optionalAccess', _6 => _6.name]);
    if ( ! roomName) {
        let p = platform4symbol[options.symbol] || getRandomMember([2,3,4,5,6]);
        console.log("platform",p);
        roomName = 'Platformer'+p;
    }    
    let room2 = ct.rooms.merge(roomName);
    console.log("merged", room2, "ct.room", ct.room, "parent", ct.room.parent);
    // ct.js bug workaround Dec 2023: patch scale
    let t = ct.rooms.templates[roomName];
    console.log("TODO fix merge", t);
    if (t && room2.copies) {
        let copy4xyt = {};        
        room2.copies.forEach(copy => {
            copy4xyt[copy.x+","+copy.y+copy.template] = copy;
        });
        t.objects.forEach(copy => {
            let k = copy.x+","+copy.y+copy.template;
            let newCopy = copy4xyt[k];
            if ( ! newCopy) return;
            newCopy.scale.x = copy.scale.x;
            newCopy.scale.y = copy.scale.y;
        });
    }
}

// fade the BG
if ( ! _optionalChain([ct, 'access', _7 => _7.room, 'access', _8 => _8.backgrounds, 'optionalAccess', _9 => _9.length])) {
    if ( ! options.bgName) options.bgName = getRandomMember("backdrop wall-1 wall-2 wall-3 wall-4".split(" "));    
    const bg = ct.backgrounds.add(options.bgName);
    bg.alpha = 0.35;
}

// add UI
let roomUI = ct.rooms.append('Room_UI');
// On-screen joystick?
if (isMobile()) {
    ct.vkeys.joystick({
        key: 'Vjoy1',
        tex: 'paper', // TODOTrackPad',
        trackballTex: 'spit', // TODO
        depth: 1000,
        x: 600,
        y: 500,
        // width:200,
        // height:200,
        container: roomUI
    });
}

class Layout {
    
    
    
    
    
    
}

/**
 * You can override this by removing all-but-one tank / manhole / door
 * @returns {Layout}
 */
function layoutRoom(symbol) {
    console.log("layoutRoom", symbol);
    assert(symbol, "no symbol");
    let oldlayout = layout4symbol[symbol];
    if (oldlayout) {
        console.log("use oldlayout for "+symbol, oldlayout);
        return oldlayout;
    }
    console.log("make new layout for "+symbol);
    let layout = new Layout();
    layout.symbol = symbol;
    layout4symbol[symbol] = layout;
    let corners = "NE NW SE SW".split(" "); 
    // match existing doors
    let leftSymbol = getNextElementSymbol(symbol, -1, 0);
    let upSymbol = getNextElementSymbol(symbol, 0, -1);
    if (leftSymbol) {
        let leftLayout = layoutRoom(leftSymbol);
        assert(leftLayout.eExit, "no eExit", leftSymbol, leftLayout);
        layout.wExit = leftLayout.eExit.replace("E","W");
        remove(corners, layout.wExit);
        console.log(symbol, "has leftSymbol", leftSymbol, layout.wExit);
    }
    if (upSymbol) {
        let upLayout = layoutRoom(upSymbol);
        assert(upLayout.sExit, "no sExit in upLayout", upSymbol, upLayout);
        layout.nExit = upLayout.sExit.replace("S","N");
        remove(corners, layout.nExit);
    }
    console.log("back to layout",symbol,"corners left",corners.join(", "));
    // place the tank   
    if ( ! layout.tank) { 
        let corner = getRandomMember(corners);
        layout.tank = corner;
    }
    remove(corners, layout.tank);
    // place exits
    // assert(corners.length);
    if ( ! layout.eExit) {
        let eSymbol = getNextElementSymbol(symbol, 1, 0);
        if (eSymbol) {
            let corner = getRandomMember(corners.filter(c => c.includes("E")));
            if ( ! corner) {
                console.warn("Must now overlap for E");
                if (layout.nExit && layout.nExit.endsWith("E")) corner = layout.nExit;
                else corner = "SE";
            }
            layout.eExit = corner;
        }
    }
    if ( ! layout.sExit) {
        let sSymbol = getNextElementSymbol(symbol, 0, 1);
        if (sSymbol) {
            let corner = getRandomMember(corners.filter(c => c.includes("S")));
            if ( ! corner) {
                console.warn("Must now overlap for S");
                if (layout.eExit && layout.eExit.startsWith("S")) corner = layout.eExit;
                else corner = "SW";
            }
            // assert(corner, "no S corners", corners, symbol+ " to "+sSymbol,"layout",layout);
            layout.sExit = corner;
        } else {
            console.log("no S symbol", symbol, sSymbol);
        }
    }
    if ( ! layout.cat) {
        let corner = getRandomMember(corners);
        layout.cat = corner;
    }
    console.log("layout", symbol, layout);
    return layout;
}

/** use a fn to avoid memory leaks */
function arrangeRoom(room) {
    let roomState = roomOptions[room.name];
    if ( ! roomState) roomState = roomOptions[room.name] = {};
    console.log("arrange", room, "element", room.element, "symbol", room.symbol, "state", roomState);
    assert(room.element.symbol, room);
    const symbol = room.element.symbol;
    let doors = getTemplates(room, "door");
    let manholes = getTemplates(room, "manhole");
    let tanks = ct.templates.list['tank-2'].filter(tmp => tmp.getRoom() === room);
    // Layout
    let layout = layoutRoom(symbol);
    // ...override to fit room design?
    // ...only one down manhole?
    "N S E W".split(" ").forEach(dirn => {
        let pExits = ("NS".includes(dirn)? manholes : doors).filter(m => getCompassCorner(m).includes(dirn));
        if (pExits.length === 1) {
            console.log("fix layout",dirn,getCompassCorner(pExits[0]));
            layout[dirn.toLowerCase()+"Exit"] = getCompassCorner(pExits[0]);
        }
    });
    console.log(symbol, layout);

    let n = room.element.atomic_number % 4;
    console.log("n",n,"element",symbol);
    // let cats = ct.templates.list['cat-1'].filter(tmp => tmp.getRoom() === room);
    tanks.forEach(tank => {
        let corner = getCompassCorner(tank);
        if (layout.tank !== corner) {
            console.log("kill tank",corner,"vs layout",layout);
            tank.kill = true;
        }
    });
    console.log("doors",doors);
    // exists and locks
    manholes.forEach(manhole => {
        let cc = getCompassCorner(manhole);
        if (layout.nExit === cc || layout.sExit === cc) {
            let dy = manhole.y > 200? 1 : -1;
            let nextSymbol = getNextElementSymbol(symbol, 0, dy);
            if ( ! nextSymbol) manhole.kill = true;
            manhole.nextSymbol = nextSymbol;
            if (isUnlocked(symbol, nextSymbol)) {
                manhole.unlocked = true;
            }
        } else {
            manhole.kill = true;
        }
    });
    doors.forEach(door => {
        let cc = getCompassCorner(door);
        if (layout.eExit === cc || layout.wExit === cc) {
            let dx = door.x > 200? 1 : -1;
            let nextSymbol = getNextElementSymbol(symbol, dx, 0);
            door.nextSymbol = nextSymbol;
            if (isUnlocked(symbol, nextSymbol)) {
                door.unlocked = true;
            }
        } else {
            door.kill = true;
        }
    });

    // for(let i=1; i<cats.length; i++) {
    //     cats[i].kill = true;
    // }

    // Place the chimp    
    if (roomState.playerx) {
        let chimp = getTemplates(room, "chimp")[0];
        if (chimp) { // paranoia (maybe the chimp got killed)
            chimp.x = roomState.playerx;
            if (chimp.x < 160) chimp.x = 160;
            if (chimp.x > 860) chimp.x = 860;
            chimp.y = roomState.playery;
        }
    }
};
arrangeRoom(this);

}

    },
    isUi: false,
    follow: false,
    extends: {}
}
        
ct.rooms.templates['Room_UI'] = {
    name: 'Room_UI',
    group: 'ungrouped',
    width: 1280,
    height: 720,
    objects: JSON.parse('[{"x":1060,"y":0,"opacity":0.75,"tint":16777215,"scale":{"x":0.77,"y":0.76677316},"rotation":0,"exts":{},"customProperties":{},"template":"info-bar"},{"x":1122,"y":292,"opacity":1,"tint":16777215,"scale":{"x":1,"y":1},"rotation":0,"exts":{},"customProperties":{},"template":"coin_score"},{"x":1090,"y":318,"opacity":1,"tint":16777215,"scale":{"x":0.48275862,"y":0.27007299},"rotation":0,"exts":{},"customProperties":{"newProperty1":"","newProperty2":"","newProperty3":"","newProperty4":"","newProperty5":""},"template":"canister"},{"x":1090,"y":360,"opacity":1,"tint":16777215,"scale":{"x":0.48275862,"y":0.28467153},"rotation":0,"exts":{},"customProperties":{},"template":"canister"},{"x":1090,"y":402,"opacity":1,"tint":16777215,"scale":{"x":0.4862069,"y":0.28467153},"rotation":0,"exts":{},"customProperties":{},"template":"canister"},{"x":1090,"y":445,"opacity":0,"tint":16777215,"scale":{"x":0.48965517,"y":0.28},"rotation":0,"exts":{},"customProperties":{},"template":"canister"},{"x":1090,"y":488,"opacity":0,"tint":16777215,"scale":{"x":0.4862069,"y":0.28},"rotation":0,"exts":{},"customProperties":{},"template":"canister"},{"x":1233.49714286,"y":329.39428575,"opacity":1,"tint":16777215,"scale":{"x":0.10285714,"y":0.10285714},"rotation":0,"exts":{},"customProperties":{},"template":"empty-button"},{"x":1233.49714286,"y":373.39428575,"opacity":1,"tint":16777215,"scale":{"x":0.10285714,"y":0.10285714},"rotation":0,"exts":{},"customProperties":{},"template":"empty-button"},{"x":1233.49714286,"y":415.39428575,"opacity":1,"tint":16777215,"scale":{"x":0.10285714,"y":0.10285714},"rotation":0,"exts":{},"customProperties":{},"template":"empty-button"},{"x":1234.49714286,"y":459.39428575,"opacity":0,"tint":16777215,"scale":{"x":0.10285714,"y":0.10285714},"rotation":0,"exts":{},"customProperties":{},"template":"empty-button"},{"x":1234.49714286,"y":500.39428575,"opacity":0,"tint":16777215,"scale":{"x":0.10285714,"y":0.10285714},"rotation":0,"exts":{},"customProperties":{},"template":"empty-button"},{"x":1099,"y":192,"opacity":1,"tint":16777215,"scale":{"x":0.41310541,"y":0.13617021},"rotation":0,"exts":{},"customProperties":{},"template":"TextBlock"},{"x":1121.5,"y":251.5,"opacity":1,"tint":16777215,"scale":{"x":0.5,"y":0.5},"rotation":0,"exts":{},"customProperties":{},"template":"atom_score"},{"x":1174.49999996,"y":94.88785043,"opacity":1,"tint":16777215,"scale":{"x":1.23,"y":1.23},"rotation":0,"exts":{},"customProperties":{},"template":"magnifier"}]'),
    bgs: JSON.parse('[]'),
    tiles: JSON.parse('[]'),
    backgroundColor: '#000000',
    
    onStep() {
        
    },
    onDraw() {
        
    },
    onLeave() {
        
    },
    onCreate() {
        /* room Room_UI — core_OnRoomStart (On room start event) */
{
 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }
// Note the index so the canisters know
let pCanisters = getTemplates(this, "canister");
for(let i=0; i<pCanisters.length; i++) {
    pCanisters[i].i = i;
    // pCanisters[i].canister = canisters[i]; unstable?
}
let buttons = getTemplates(this, "empty-button");
for(let i=0; i<buttons.length; i++) {
    buttons[i].i = i;
}

let pTextBlock = getTemplates(this, "TextBlock")[0];
pTextBlock.tint = 0x333333;
let eInfo = ct.room.element;
if ( ! eInfo) {
    let symbol = _optionalChain([roomOptions, 'access', _ => _[ct.room.name], 'optionalAccess', _2 => _2.symbol]);
    eInfo = info4symbol[symbol];
}
// console.log(ct.room, "eInfo", eInfo);
if (_optionalChain([eInfo, 'optionalAccess', _3 => _3.symbol])) {
    setText(pTextBlock, eInfo.name+" "+eInfo.atomic_number, 0, 0, {center:true, verticalCenter:true, style:"Style_InfoBar"});
} else {
    setText(pTextBlock, "huh?", 0, 0, {center:true, verticalCenter:true, style:"Style_InfoBar"});
    console.warn("No symbol??",ct.room);
}


}

    },
    isUi: true,
    follow: false,
    extends: {}
}
        
ct.rooms.templates['Room_Bridge'] = {
    name: 'Room_Bridge',
    group: 'ungrouped',
    width: 1280,
    height: 720,
    objects: JSON.parse('[{"x":576,"y":192,"opacity":1,"tint":16777215,"scale":{"x":1,"y":1},"rotation":0,"exts":{},"customProperties":{},"template":"captain"}]'),
    bgs: JSON.parse('[{"texture":"DALL·E_2023-11-26_14.05.24_-_An_updated_version_of_the_backdrop_for_a_2D_game,_depicting_the_bridge_of_a_steampunk_spaceship,_now_with_more_space_for_people._Retain_the_original_r","depth":0,"exts":{"movementX":0,"movementY":0,"parallaxX":1,"parallaxY":1,"repeat":"no-repeat","scaleX":1.4,"scaleY":1.4,"shiftX":0,"shiftY":-408}}]'),
    tiles: JSON.parse('[]'),
    backgroundColor: '#000000',
    
    onStep() {
        
    },
    onDraw() {
        
    },
    onLeave() {
        
    },
    onCreate() {
        
    },
    isUi: false,
    follow: false,
    extends: {}
}
        
ct.rooms.templates['Room_Puzzle_Pipes'] = {
    name: 'Room_Puzzle_Pipes',
    group: 'ungrouped',
    width: 1280,
    height: 720,
    objects: JSON.parse('[{"x":0,"y":0,"opacity":1,"tint":16777215,"scale":{"x":1.26164875,"y":1.43426295},"rotation":0,"exts":{},"customProperties":{},"template":"modal"},{"x":998.79428571,"y":19.82285714,"opacity":1,"tint":16777215,"scale":{"x":0.4,"y":0.4},"rotation":0,"exts":{},"customProperties":{},"template":"exit-button"},{"x":605,"y":100.00000000000003,"opacity":1,"tint":16777215,"scale":{"x":1.0113960113960114,"y":2.1702127659574466},"rotation":0,"exts":{},"customProperties":{},"template":"TextBlock"},{"x":55,"y":95,"opacity":1,"tint":16777215,"scale":{"x":1.1018711,"y":1.1},"rotation":0,"exts":{},"customProperties":{},"template":"PlumbingContainer"},{"x":225,"y":640,"opacity":1,"tint":16777215,"scale":{"x":1,"y":1},"rotation":0,"exts":{},"customProperties":{},"template":"PipeColorMarker"}]'),
    bgs: JSON.parse('[]'),
    tiles: JSON.parse('[]'),
    backgroundColor: '#000000',
    
    onStep() {
        /* room Room_Puzzle_Pipes — core_OnStep (On frame start event) */
{

}

    },
    onDraw() {
        
    },
    onLeave() {
        /* room Room_Puzzle_Pipes — core_OnRoomEnd (On room end event) */
{
UI.modal = null;
}

    },
    onCreate() {
        /* room Room_Puzzle_Pipes — core_OnRoomStart (On room start event) */
{
 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }

this.puzzleType = "flow";
this.elementSymbol = roomOptions[this.name].symbol;
assert(this.elementSymbol);
this.element = info4symbol[this.elementSymbol]

// get harder
this.puzzleSize = Math.min(Math.max(10, this.element.atomic_number / 5), 5);

console.log("room", this, "roomOptions", JSON.stringify(roomOptions), "element", this.element);

UI.modal = this;

ct.rooms.append('Room_UI');

const BLANK_TEXTURE = "pipe-empty";
const EW_TEXTURE = "pipe-bit-1";
const NW_TEXTURE = "pipe-corner-NW";
const SW_TEXTURE = "pipe-corner-SW";

// container
this.sortableChildren = true;
let pContainer = getTemplates(this,"PlumbingContainer")[0];
pContainer.zIndex = 100;
// NB: x/y adjustment numbers found by random tweaking :'(
let sqWidth = Math.floor((pContainer.width - 150) / this.puzzleSize);
let offsetX = (pContainer.width - sqWidth*this.puzzleSize)/2 + 15; 
let offsetY = 20 + 32; 

// Text
let textBlock = getTemplates(this, "TextBlock")[0];
let info = info4symbol[this.elementSymbol];
addText(textBlock, info.atomic_number+": "+info.name+" ("+info.symbol+")\n"
    +"At room temperature: "+info.standard_conditions_state+"\n"
    +"Normal appearance: "+info.appearance+"\n"
    +info.interesting_fact
    // +JSON.stringify(info)
    , 10, 10, {wordWrap:true, wordWrapWidth: textBlock.width - 20});

// TODO seeds

/**
 * @returns {Pipe[]}
 */
function makePipes({w=8}) {
    let pipes = [];
    for(let i=0; i<w; i++) {
        let pipe = new Pipe();
        pipes.push(pipe);
        pipe.col = Object.keys(colour)[i];
        for(let j=0; j<w; j++) {				
            pipe.xys.push([i, j]);
        }
    }

    // mutate - move a pair of pipe ends
    for(let i=0; i<1000000; i++) {
        let pipe1 = getRandomMember(pipes);
        let pipe2 = getRandomMember(pipes);
        if (pipe1==pipe2) continue;
        let ai = getRandomChoice(0.5)? 0 : pipe1.xys.length - 1;
        let bi = getRandomChoice(0.5)? 0 : pipe2.xys.length - 1;
        let a0 = pipe1.xys[ai];
        let b0 = pipe2.xys[bi];
        if (isTouching(a0, b0)) {
            // move one end
            if (getRandomChoice(0.5)) {
                movePipe(pipe1,ai,pipe2,bi);
            } else {
                movePipe(pipe2,bi,pipe1,ai);
            }
        }
    }	
    return pipes;	
} // ./ makePipes

function movePipe(pipe1,  ai,  pipe2,  bi) {
    if (pipe1.xys.length < 4) return;
    let s = pipe1.xys[ai];
    // avoid looping back:
    if (isLoopBack(s, pipe2, pipe2.xys[bi])) {
        return;
    } else {
        pipe1.xys = pipe1.xys.filter(xy => xy !== s);
        if (bi==0) pipe2.xys.splice(bi, 0, s);
        else pipe2.xys.push(s);
    }
}

function isLoopBack(s, pipe2, b0) {
    for (let i = 0; i < pipe2.xys.length; i++) {
        let b = pipe2.xys[i];
        if (b===b0) continue;
        if (isTouching(s,b)) return true;
    }
    return false;
}

this.pipes = makePipes({w:this.puzzleSize});

console.log(this.pipes);

// render
this.grid = [];
for(let i=0; i<this.puzzleSize; i++) this.grid.push([]);
this.pipes.forEach(pipe => {
    let start = pipe.xys[0];
    let end = pipe.xys[pipe.xys.length-1];
    // pipe.xys.forEach(xy => {
    [start, end].forEach(xy => {
        let pb = new PipeBit();
        pb.col = pipe.col;
        pb.isEnd = true;
        this.grid[xy[0]][xy[1]] = pb;
    });
});
// console.log("grid", this.grid);

let modal = ct.templates.list['modal'].find(m => m.getRoom() === this);


// draw grid
let pGridLines = new PIXI.Graphics();
pGridLines.lineStyle(3, 0xcccccc, 0.5, 0.5, true);
let h = 38; // adjust for half-brick centering in tile bits
let endX = offsetX + this.puzzleSize * sqWidth - h;
let endY = offsetY + this.puzzleSize * sqWidth - h;
for(let col=0; col < this.grid.length + 1; col++) {
    pGridLines.moveTo(offsetX-35, offsetY - 38 + sqWidth*col);
    pGridLines.lineTo(endX, offsetY - 38 + sqWidth*col);
}
for(let row=0; row < this.grid.length + 1; row++) {
    pGridLines.moveTo(offsetX-38 +sqWidth*row, offsetY-38);
    pGridLines.lineTo(offsetX-38 +sqWidth*row, endY);
}
pContainer.addChild(pGridLines);

// grid to tile-grid
for(let i=0; i<this.grid.length; i++) {
    for(let j=0; j<this.grid.length; j++) { // NB: assume square
        // console.log("grid i j", i, j, this.grid[i][j], this.grid[i][j]?.col);
        let copy = ct.templates.copy("empty-tile");
        copy.zIndex = 100;
        copy.pipeColor = _optionalChain([this, 'access', _ => _.grid, 'access', _2 => _2[i], 'access', _3 => _3[j], 'optionalAccess', _4 => _4.col]);
        // let obj = new PIXI.Graphics();
        copy.gridx = j;
        copy.gridy = i;
        copy.x = offsetX + sqWidth*j;
        copy.y = offsetY + sqWidth*i;

        if (copy.pipeColor) {
            copy.isEnd = true;
            copy.tex = "pipe-end-block";
            const col = colour[copy.pipeColor];
            copy.tint = col;
            // obj.beginFill(colour[copy.pipeColor]);
            // obj.drawRect(1, 1, sqWidth-2, sqWidth-2);            
        } else {        
            copy.tex = BLANK_TEXTURE; //"pipe-bit-1";
            // obj.beginFill(0); // not clickabale otherwise??
            // obj.drawRect(1, 1, sqWidth-2, sqWidth-2);
            // obj.lineStyle(1, colour["grey"]);
            // obj.moveTo(1,1);
            // obj.lineTo(1, sqWidth-2);
            // obj.lineTo(sqWidth-2, sqWidth-2);
            // obj.lineTo(sqWidth-2, 1);
            // obj.lineTo(1, 1);
        }        
        copy.width  = sqWidth;
        copy.height = sqWidth;
        // copy.height = sqWidth;

        // copy.addChild(obj);
        pContainer.addChild(copy);
    }
}

this.pipeColourMarker = getTemplates(this, "PipeColorMarker")[0];
assert(this.pipeColourMarker);
// this.pipeColourMarker = new PIXI.Graphics();
// this.pipeColourMarker.beginFill(colour[0]);
// let r = sqWidth / 2;
// this.pipeColourMarker.drawCircle(r,r,r);

// this.pipeColourMarker.x = offsetX + (sqWidth+2) * this.puzzleSize;
// this.pipeColourMarker.y = offsetY;
// modal.addChild(this.pipeColourMarker);

function setColor(color, room) {
    assert(room, "no room",color);
    // select
    room.selectedColor = color;
    room.downColor = color;
    console.log("col",color);
    const col = colour[color];
    room.pipeColourMarker.tint = col;
    // room.pipeColourMarker.beginFill(colour[color]);
    // let r = sqWidth / 2;
    // room.pipeColourMarker.drawCircle(r,r,r);
}
this.setPipeColor = setColor;

this.onTileClick = (This) => {
    console.log("click",This);
    let room = This.getRoom();
    if (This.isEnd) {
        setColor(This.pipeColor, room);
    } else {
        room.doFillTile(This, room.selectedColor);
    }
};


this.doFillTile = function(This, color) {
    console.log("bar");
    assert(This);
    let room = This.getRoom();
    assert(room, This);
    if (This.isEnd) {
        if (color===This.pipeColor) {
            setColor(null, room);
        } else {
            setColor(This.pipeColor, room);
        }
        return;
    }
    This.tex = EW_TEXTURE;
    This.pipeColor = color;
    const col = colour[This.pipeColor];
    This.tint = col; 
    let pb = new PipeBit();
    pb.col = This.pipeColor;
    pb.pTile = This;
    room.grid[This.gridy][This.gridx] = pb;
    // adjust graphics
    setPipeTexture(This, room);
    let xy = [This.gridx,This.gridy];
    let gn = getGridNeighbours(xy, room.grid); // TODO
    gn.forEach(nxy => {
        let pTile = _optionalChain([getGridEntry, 'call', _5 => _5(room.grid, nxy), 'optionalAccess', _6 => _6.pTile]);
        if (pTile) setPipeTexture(pTile, room);
    });
    // Win?
    let win = checkWin(room.grid, room.pipes);
    if (win) {
        doWin(room);
    }
};


function setPipeTexture(This, room) {
    console.log("setPipeTexture",This);
    assert( ! This.isEnd);
    let col = This.pipeColor;
    if ( ! col) {
        This.tex = BLANK_TEXTURE;
        return;
    }
    let xy = [This.gridx,This.gridy];
    let gn = getGridNeighbours(xy, room.grid);
    console.log("setPipeTexture xy",xy,"gn",gn);
    let sameColor = gn.filter(nxy => {
        // console.log("setPipeTexture xy",xy,"gn",gn,"grid row",room.grid[nxy[1]]);
        let row = room.grid[nxy[1]];
        if ( ! row) {
            // console.warn("no row in grid",nxy,room.grid);
            return false;
        }
        let npb = row[nxy[0]];
        return _optionalChain([npb, 'optionalAccess', _7 => _7.col]) === col;
    });
    console.log("TODO which pipe texture? sameColor",sameColor,"xy", xy, This, room)
    let n = contains([xy[0],xy[1]-1], sameColor);
    let s = contains([xy[0],xy[1]+1], sameColor);
    let e = contains([xy[0]+1,xy[1]], sameColor);
    let w = contains([xy[0]-1,xy[1]], sameColor);
    console.log("what corner?","n",n,"e",e,"s",s,"w",w,"xy",xy);

    if (n || s) {
        if ( ! e && ! w) {
            This.tex = EW_TEXTURE;
            This.rotation = Math.PI / 2;
            return;
        }
    } else if (e || w) {
        This.tex = EW_TEXTURE;
        This.rotation = 0; // reset
        return;
    } else {
        This.tex = BLANK_TEXTURE;
    }
    // corner
    This.rotation = 0; // reset
    if (n && w) {
        This.tex = NW_TEXTURE; 
        This.scale.x = Math.abs(This.scale.x);
        This.scale.y = Math.abs(This.scale.y);
        return;
    }
    if (s && w) {
        This.tex = SW_TEXTURE;
        This.scale.x = Math.abs(This.scale.x);
        This.scale.y = Math.abs(This.scale.y);
        return;
    }
    if (n && e) {
        This.tex = NW_TEXTURE;
        This.scale.x = - Math.abs(This.scale.x);
        This.scale.y = Math.abs(This.scale.y);
        This.width = sqWidth;
        This.height = sqWidth;
        return;
    }
    if (s && e) {
        This.tex = SW_TEXTURE;
        This.scale.x = - Math.abs(This.scale.x);
        This.scale.y = Math.abs(This.scale.y);
        This.width = sqWidth;
        This.height = sqWidth;
        return;
    }
    // error
    This.tex = EW_TEXTURE;
    console.error("what corner?",n,e,s,w,xy);
}

function doWin(room) {
    ct.sound.spawn("Success");
    room.win = true;
    let x = room.pipeColourMarker.x;
    let y = room.pipeColourMarker.y;
    ct.emitters.append(room.pipeColourMarker, "Tandem_Sparks"); // fire("Tandem_Sparks", x, y);
    doUnlock(room.elementSymbol);
    addCanister(room.elementSymbol);
    // close
    ct.sound.spawn("Sound_Squeaky_Open", {volume:0.5}, () => {
        moveRoom("Room_Platformer");
    });
}

function checkWin(grid, pipes) {
    console.log("TODO checkWin", grid, pipes);
    for(let i=0; i<pipes.length; i++) {
        if ( ! checkWin2_onePipe(grid, pipes[i])) return false;
    }
    return true;
}

/**
 * @param {PipeBit[][]} grid
 */
function checkWin2_onePipe(grid, pipe) {
    console.log("pipe", pipe.col, pipe,"grid",grid);
    let startXY = pipe.xys[0];
    let endXY = pipe.xys[pipe.xys.length-1];
    let path = [startXY];
    let steps = 0;
    while(steps < 20) {
        steps++;
        let tip = path[path.length-1];
        let gn = getGridNeighbours(tip, grid);
        console.log("path", path, "gn",gn,"tip",tip);
        let nextBits = gn.filter(xy => {
            let g0 = grid[xy[0]];
            if ( ! g0) return false;
            let pb = g0[xy[1]];
            console.log("nextBits check xy", xy, "pb", pb, path);
            return pb && pb.col === pipe.col && ! contains(xy, path);
        }) ;  
        console.log(path, "nextBits",nextBits, grid, pipe);
        if ( ! nextBits.length) {
            console.log("FAIL for ", pipe.col, path);
            return false;
        }
        let nextBit = nextBits[0];
        if (eq(nextBit, endXY)) {
            console.log("WIN for ", pipe.col, path);
            return true;
        }
        console.log("LOOP ", pipe.col, nextBit, "path",path,"endXY", endXY);
        path.push(nextBit);
    }
    // let next = grid.
    console.log("max steps for ", pipe.col, path);
    return false; // TODO
}

/**
 * @returns {Array[]} [[x,y], ...]
 */
function getGridNeighbours(xy, grid) {
    let neighbours = [[1,0],[-1,0],[0,1],[0,-1]].map(dxdy => [xy[0]+dxdy[0], xy[1]+dxdy[1]]);
    let filtered = neighbours.filter(cell => cell[0] > 0 && cell[1] > 0 && cell[0] < grid.length && cell[1] < grid[0].length);
    console.log("neighbours",xy,grid,"filtered", filtered);
    return neighbours;
}

this.sortChildren();
}

    },
    isUi: false,
    follow: false,
    extends: {}
}
        
ct.rooms.templates['Room_CodewordModal'] = {
    name: 'Room_CodewordModal',
    group: 'ungrouped',
    width: 1280,
    height: 720,
    objects: JSON.parse('[{"x":256,"y":128,"opacity":1,"tint":16777215,"scale":{"x":0.68817204,"y":0.89243028},"rotation":0,"exts":{},"customProperties":{},"template":"modal"},{"x":780.43428571,"y":140.06857143,"opacity":1,"tint":16777215,"scale":{"x":0.36571429,"y":0.36571429},"rotation":0,"exts":{},"customProperties":{},"template":"exit-button"},{"x":448,"y":256,"opacity":1,"tint":16777215,"scale":{"x":0.88888889,"y":0.52892562},"rotation":0,"exts":{},"customProperties":{},"template":"code-blank"},{"x":320,"y":192,"opacity":1,"tint":16777215,"scale":{"x":1.27635328,"y":0.27234043},"rotation":0,"exts":{},"customProperties":{},"template":"TextBlock"}]'),
    bgs: JSON.parse('[]'),
    tiles: JSON.parse('[]'),
    backgroundColor: '#000000',
    
    onStep() {
        /* room Room_CodewordModal — core_OnStep (On frame start event) */
{

}

    },
    onDraw() {
        
    },
    onLeave() {
        /* room Room_CodewordModal — core_OnRoomEnd (On room end event) */
{

ct.room.alpha = 1.0;
assert(UI.puzzle === this);
UI.puzzle = null;
}

    },
    onCreate() {
        /* room Room_CodewordModal — core_OnRoomStart (On room start event) */
{
 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }
UI.puzzle = this;

console.log("room", _optionalChain([ct, 'access', _ => _.room, 'optionalAccess', _2 => _2.name]));
ct.room.alpha = 0.7;

let roomState = roomOptions[this.name];

let a = getSymbol();
let b =  roomState.nextSymbol; // || "Ne";
let mission = getMission(a,b);
console.log("mission",mission,"for",a,b);
let code = mission.code.toUpperCase();
this.codeOn = "";
this.codeOff = code;
let pCodeBlock = getTemplates(this, "code-blank")[0];
this.pCodeTextOff = addText(pCodeBlock, code, 0, 0, {style:"Style_InfoBar", center:true, verticalCenter:true});
this.pCodeTextOn = addText(pCodeBlock, "", this.pCodeTextOff.x, this.pCodeTextOff.y, {style:"Style_CodeOn"});

let pTextBlock = getTemplates(this, "TextBlock")[0];
setText(pTextBlock, "Lock for "+a+"/"+b+". Collect element canisters to spell out the code.",0,0,{center:true,verticalCenter:true, wordWrap:true, wordWrapWidth: pTextBlock.width - 20});

// console.log("canisters",canisters);
let x = 10, y = 100;
for(let i=0; i<canisters.length; i++) {
    let canister = canisters[i];
    if ( ! _optionalChain([canister, 'optionalAccess', _3 => _3.symbol])) continue;
    console.log("canister",canister);
    // add button
    let pButton = ct.templates.copyIntoRoom("element-button", x, y, this);
    pButton.x = pTextBlock.x + x;
    pButton.y = pCodeBlock.y + pCodeBlock.height + 50;
    pButton.scale.x = 0.3;
    pButton.scale.y = 0.3;
    pButton.canister = canister;
    // pButton.width = this.width / 3;
    addText(pButton, _optionalChain([info4symbol, 'access', _4 => _4[canister.symbol], 'optionalAccess', _5 => _5.name]), 0, 0, {style:"Style_BodyText", center:true, verticalCenter:true}); //100,30
    if (i % 2 === 0) {
        x += pButton.width + 20;
    } else {
        x = 10;
        y += pButton.height + 20;
    }
};

this.useCanister = function(canister) {
    console.log("useCanister",canister.symbol);
    let letters = canister.symbol.toUpperCase();
    if ( ! this.codeOff.startsWith(letters)) {
        showMessage("No - "+canister.symbol+" does not fit "+this.codeOff);
        ct.sound.spawn("Sound_Nope",{volume:0.3});
        return;
    }
    this.codeOn += letters;
    this.codeOff = this.codeOff.substr(letters.length);
    // redraw text
    this.pCodeTextOn.text = this.codeOn;
    this.pCodeTextOff.x = this.pCodeTextOn.x + this.pCodeTextOn.width;
    this.pCodeTextOff.text = this.codeOff; // = addText(pCodeBlock, code, 20, 10, {style:"Style_InfoBar"});
    // done?
    if (this.codeOff.length === 0) {
        console.log("useCanister WIN",mission);
        mission.done = true;
        assert(mission.key, mission);
        unlocked[mission.key] = true;
        ct.sound.spawn("Sound_Chug",{volume:0.5});
        ct.timer.add(1000).then(() => {
            // remove??
            ct.rooms.remove(UI.modal);
            UI.modal = null;
            return;
            // moveRoom("Room_Platformer", null, {transition:"none"});
        });
    }
};
}

    },
    isUi: false,
    follow: false,
    extends: {}
}
        
ct.rooms.templates['Room_Space'] = {
    name: 'Room_Space',
    group: 'ungrouped',
    width: 1280,
    height: 720,
    objects: JSON.parse('[{"x":960,"y":448,"opacity":1,"tint":16777215,"scale":{"x":0.4,"y":0.4},"rotation":0,"exts":{},"customProperties":{},"template":"table-ship"},{"x":370,"y":240,"opacity":1,"tint":16777215,"scale":{"x":0.55128206,"y":0.54248366},"rotation":0,"exts":{},"customProperties":{},"template":"asteroid"},{"x":50,"y":20,"opacity":1,"tint":16777215,"scale":{"x":1.78,"y":1.78},"rotation":0,"exts":{},"customProperties":{},"template":"black-hole"},{"x":405,"y":267.20754717,"opacity":1,"tint":16777215,"scale":{"x":2.67857143,"y":3.79245283},"rotation":0,"exts":{},"customProperties":{},"template":"explosion"},{"x":10,"y":650,"opacity":1,"tint":16777215,"scale":{"x":1,"y":1},"rotation":0,"exts":{},"customProperties":{},"template":"skip-button"}]'),
    bgs: JSON.parse('[{"texture":"starry-sky-2675322_1920","depth":0,"exts":{"movementX":0,"movementY":0.3,"parallaxX":1,"parallaxY":1,"repeat":"repeat","scaleX":1,"scaleY":1,"shiftX":0,"shiftY":0}}]'),
    tiles: JSON.parse('[]'),
    backgroundColor: '#000000',
    
    onStep() {
        
    },
    onDraw() {
        
    },
    onLeave() {
        
    },
    onCreate() {
        /* room Room_Space — core_OnRoomStart (On room start event) */
{

const This = this;
let pShip = getTemplates(This, "table-ship")[0];
let pAsteroid = getTemplates(This, "asteroid")[0];
let pBlackHole = getTemplates(This, "black-hole")[0];
let pExplosion = getTemplates(This, "explosion")[0];
pAsteroid.visible = false;
pBlackHole.visible = false;
pExplosion.visible = false;
assert(pShip);
assert(pAsteroid);

pShip.zIndex = 100;
pAsteroid.zIndex = pShip.zIndex - 1;
pExplosion.zIndex = pShip.zIndex+1;
this.sortableChildren = true;
this.sortChildren();

async function doAnimate() {
    // move ship
    let p = ct.tween.add({
        duration: 1000,
        obj: pShip,
        fields: {
            x: pShip.x - This.width / 2,
            y: pShip.y - 200,
        }
    });
    ct.tween.add({
        duration: 1000,
        obj: pShip.scale,
        fields: {
            x: 0.5,
            y: 0.5,
        }
    });
    // asteroid!
    let endx = pAsteroid.x
    let endy = pAsteroid.y
    pAsteroid.x = 100;
    pAsteroid.y = 0;    
    pAsteroid.rotation = Math.PI;
    pAsteroid.visible = true;
    ct.tween.add({
        duration: 1000,
        obj: pAsteroid,
        fields: {
            x: endx,
            y: endy,
            rotation: 0 
        }
    });

    await p;
    if (this.skipped) return; 
    pAsteroid.visible = false;
    pAsteroid.kill;

    // Explosion
    pExplosion.visible = true;
    pExplosion.loop = false;
    pExplosion.onComplete = () => {
        pExplosion.kill = true;
    };
    pExplosion.play()

    // Bridge + Captain
    let rbridge = ct.templates.copy("bridge");
    rbridge.tint = 0xCCCCCC; // darken
    console.log("scale 0",this.height, rbridge.height);
    let scale = 600 / rbridge.height;
    console.log("scale",scale,this.height, rbridge.height,ct.room.width);
    rbridge.scale.y = scale;
    rbridge.scale.x = scale;
    rbridge.x = ct.room.width - rbridge.width - 10;
    rbridge.y = ct.room.height - rbridge.height;
    // let slideIn = ct.tween.add({ fails??
    //     duration: 250,
    //     obj: rbridge,
    //     fields: {
    //         x: ct.room.width - rbridge.width - 10,
    //     }
    // });
    // await slideIn;

    let sailor = ct.templates.copy("sailor");
    sailor.scale.x = -0.5;
    sailor.scale.y = 0.5;
    sailor.x = rbridge.x + 450;
    sailor.y = rbridge.y + 500;

    let captain = ct.templates.copy("captain");
    captain.scale.x = 0.5;
    captain.scale.y = 0.5;
    captain.x = rbridge.x + 130;
    captain.y = rbridge.y + 500;
    await ct.timer.add(500);
    await doTalk(sailor, "Captain! It's an emergency!");
    await doTalk(captain, "Nonsense! I've seen worse.");
   if (this.skipped) return;

    await doTalk(sailor, "The engines have failed!");
    if (this.skipped) return;

    // black hole!
    endx = pBlackHole.x
    endy = pBlackHole.y
    pBlackHole.x = 100;
    pBlackHole.y = 0;    
    pBlackHole.visible = true;
    await ct.tween.add({
        duration: 1000,
        obj: pBlackHole,
        fields: {
            x: endx,
            y: endy,
        }
    });
    await doTalk(sailor, "We're heading towards a black hole!");
    if (this.skipped) return;

    // aliens!
    
    await doTalk(sailor, "Captain! Hostile aliens incoming!");
    if (this.skipped) return;

    // let's go
    await doTalk(captain, "Hm...");
    await doTalk(captain, "Before I do anything, I need my hot chocolate!");
    await doTalk(captain, "Call the janitor!");
    if (this.skipped) return;
    
    moveRoom("Room_Janitor");
}

doAnimate();
}

    },
    isUi: false,
    follow: false,
    extends: {}
}
        
ct.rooms.templates['Room_Menu'] = {
    name: 'Room_Menu',
    group: 'ungrouped',
    width: 1280,
    height: 720,
    objects: JSON.parse('[{"x":896,"y":64,"opacity":1,"tint":16777215,"scale":{"x":0.71,"y":0.7},"rotation":0,"exts":{},"customProperties":{},"template":"start-button"},{"x":128,"y":128,"opacity":1,"tint":16777215,"scale":{"x":0.7,"y":0.7},"rotation":0,"exts":{},"customProperties":{},"template":"table-ship"}]'),
    bgs: JSON.parse('[{"texture":"starry-sky-2675322_1920","depth":0,"exts":{"movementX":0.2,"movementY":0,"parallaxX":1,"parallaxY":1,"repeat":"repeat","scaleX":1,"scaleY":1,"shiftX":0,"shiftY":0}}]'),
    tiles: JSON.parse('[]'),
    backgroundColor: '#8C8C8C',
    
    onStep() {
        
    },
    onDraw() {
        
    },
    onLeave() {
        
    },
    onCreate() {
        /* room Room_Menu — core_OnRoomStart (On room start event) */
{

// let pTB = getTemplates(this, "TextBlock")[0];
// setText(pTB, "ABC",0,0,{center:true, verticalCenter:true});

if (startRoom) {
    moveRoom(startRoom);
}
}

    },
    isUi: false,
    follow: false,
    extends: {}
}
        
ct.rooms.templates['Room_Janitor'] = {
    name: 'Room_Janitor',
    group: 'ungrouped',
    width: 1280,
    height: 720,
    objects: JSON.parse('[{"x":245,"y":676.44827586,"opacity":1,"tint":16777215,"scale":{"x":2.5,"y":2.5},"rotation":0,"exts":{},"customProperties":{},"template":"chimp"},{"x":620,"y":502,"opacity":1,"tint":16777215,"scale":{"x":1,"y":1},"rotation":0,"exts":{},"customProperties":{},"template":"telephone"},{"x":165,"y":685,"opacity":0,"tint":16777215,"scale":{"x":1,"y":1},"rotation":0,"exts":{},"customProperties":{},"template":"Platform"},{"x":355,"y":685,"opacity":0,"tint":16777215,"scale":{"x":1,"y":1},"rotation":0,"exts":{},"customProperties":{},"template":"Platform"},{"x":545,"y":685,"opacity":0,"tint":16777215,"scale":{"x":1,"y":1},"rotation":0,"exts":{},"customProperties":{},"template":"Platform"},{"x":760.93887857,"y":673.49205041,"opacity":0,"tint":16777215,"scale":{"x":1,"y":1},"rotation":-1.6014884401649152,"exts":{},"customProperties":{},"template":"Platform"},{"x":755.93887857,"y":478.49205041,"opacity":0,"tint":16777215,"scale":{"x":1,"y":1},"rotation":-1.6014884401649152,"exts":{},"customProperties":{},"template":"Platform"}]'),
    bgs: JSON.parse('[{"texture":"janitors-room","depth":0,"exts":{"movementX":0,"movementY":0,"parallaxX":1,"parallaxY":1,"repeat":"repeat","scaleX":-1,"scaleY":1,"shiftX":0,"shiftY":-144}}]'),
    tiles: JSON.parse('[]'),
    backgroundColor: '#000000',
    
    onStep() {
        
    },
    onDraw() {
        
    },
    onLeave() {
        
    },
    onCreate() {
        /* room Room_Janitor — core_OnRoomStart (On room start event) */
{

async function doPhoneTalk() {
    await ct.timer.add(1000);
    let pPhone = getTemplates(ct.room, "telephone")[0];
    await doTalk(pPhone, `Hello Janitor?

    This is your Captain - with an important mission for you!

    Fetch me a cup of hot chocolate!`);
    await ct.timer.add(1000);
    moveRoom("Room_Platformer");
};

doPhoneTalk();
}

    },
    isUi: false,
    follow: false,
    extends: {}
}
        
ct.rooms.templates['Platformer6'] = {
    name: 'Platformer6',
    group: 'ungrouped',
    width: 1280,
    height: 720,
    objects: JSON.parse('[{"x":768,"y":384,"opacity":1,"tint":16777215,"scale":{"x":1,"y":1},"rotation":0,"exts":{},"customProperties":{},"template":"Block"},{"x":720,"y":312,"opacity":1,"tint":16777215,"scale":{"x":0.73563218,"y":0.79120879},"rotation":0,"exts":{},"customProperties":{},"template":"Block"},{"x":448,"y":312,"opacity":1,"tint":16777215,"scale":{"x":0.8,"y":0.8},"rotation":0,"exts":{},"customProperties":{},"template":"Block"},{"x":384,"y":384,"opacity":1,"tint":16777215,"scale":{"x":1,"y":1.23076923},"rotation":0,"exts":{},"customProperties":{},"template":"Block"},{"x":224,"y":224,"opacity":1,"tint":16777215,"scale":{"x":1,"y":0.64835165},"rotation":0,"exts":{},"customProperties":{},"template":"Block"},{"x":576,"y":640,"opacity":1,"tint":16777215,"scale":{"x":1,"y":1},"rotation":0,"exts":{},"customProperties":{},"template":"Block"},{"x":624,"y":640,"opacity":1,"tint":16777215,"scale":{"x":-1,"y":1},"rotation":0,"exts":{},"customProperties":{},"template":"snake-spit"},{"x":632,"y":312,"opacity":1,"tint":16777215,"scale":{"x":1,"y":1},"rotation":0,"exts":{},"customProperties":{},"template":"snake-3"},{"x":448,"y":256,"opacity":1,"tint":16777215,"scale":{"x":1,"y":1},"rotation":0,"exts":{},"customProperties":{},"template":"coin"},{"x":512,"y":256,"opacity":1,"tint":16777215,"scale":{"x":1,"y":1},"rotation":0,"exts":{},"customProperties":{},"template":"coin"},{"x":576,"y":256,"opacity":1,"tint":16777215,"scale":{"x":1,"y":1},"rotation":0,"exts":{},"customProperties":{},"template":"coin"},{"x":640,"y":256,"opacity":1,"tint":16777215,"scale":{"x":1,"y":1},"rotation":0,"exts":{},"customProperties":{},"template":"coin"},{"x":704,"y":256,"opacity":1,"tint":16777215,"scale":{"x":1,"y":1},"rotation":0,"exts":{},"customProperties":{},"template":"coin"},{"x":768,"y":256,"opacity":1,"tint":16777215,"scale":{"x":1,"y":1},"rotation":0,"exts":{},"customProperties":{},"template":"coin"},{"x":832,"y":256,"opacity":1,"tint":16777215,"scale":{"x":1,"y":1},"rotation":0,"exts":{},"customProperties":{},"template":"coin"},{"x":832,"y":192,"opacity":1,"tint":16777215,"scale":{"x":1,"y":1},"rotation":0,"exts":{},"customProperties":{},"template":"coin"},{"x":768,"y":192,"opacity":1,"tint":16777215,"scale":{"x":1,"y":1},"rotation":0,"exts":{},"customProperties":{},"template":"coin"},{"x":704,"y":192,"opacity":1,"tint":16777215,"scale":{"x":1,"y":1},"rotation":0,"exts":{},"customProperties":{},"template":"coin"},{"x":640,"y":192,"opacity":1,"tint":16777215,"scale":{"x":1,"y":1},"rotation":0,"exts":{},"customProperties":{},"template":"coin"},{"x":576,"y":192,"opacity":1,"tint":16777215,"scale":{"x":1,"y":1},"rotation":0,"exts":{},"customProperties":{},"template":"coin"},{"x":512,"y":192,"opacity":1,"tint":16777215,"scale":{"x":1,"y":1},"rotation":0,"exts":{},"customProperties":{},"template":"coin"},{"x":448,"y":192,"opacity":1,"tint":16777215,"scale":{"x":1,"y":1},"rotation":0,"exts":{},"customProperties":{},"template":"coin"},{"x":704,"y":576,"opacity":1,"tint":16777215,"scale":{"x":1,"y":1},"rotation":0,"exts":{},"customProperties":{},"template":"coin"},{"x":768,"y":576,"opacity":1,"tint":16777215,"scale":{"x":1,"y":1},"rotation":0,"exts":{},"customProperties":{},"template":"coin"},{"x":832,"y":576,"opacity":1,"tint":16777215,"scale":{"x":1,"y":1},"rotation":0,"exts":{},"customProperties":{},"template":"coin"},{"x":448,"y":704,"opacity":1,"tint":16777215,"scale":{"x":1,"y":1},"rotation":0,"exts":{},"customProperties":{},"template":"Block"},{"x":384,"y":704,"opacity":1,"tint":16777215,"scale":{"x":1,"y":1},"rotation":0,"exts":{},"customProperties":{},"template":"Block"},{"x":384,"y":704,"opacity":1,"tint":16777215,"scale":{"x":1,"y":1},"rotation":0,"exts":{},"customProperties":{},"template":"Block"},{"x":320,"y":704,"opacity":1,"tint":16777215,"scale":{"x":1,"y":1},"rotation":0,"exts":{},"customProperties":{},"template":"Block"},{"x":256,"y":704,"opacity":1,"tint":16777215,"scale":{"x":1,"y":1},"rotation":0,"exts":{},"customProperties":{},"template":"Block"},{"x":512,"y":704,"opacity":1,"tint":16777215,"scale":{"x":1,"y":1},"rotation":0,"exts":{},"customProperties":{},"template":"Block"},{"x":576,"y":704,"opacity":1,"tint":16777215,"scale":{"x":1,"y":1},"rotation":0,"exts":{},"customProperties":{},"template":"Block"},{"x":640,"y":704,"opacity":1,"tint":16777215,"scale":{"x":1,"y":1},"rotation":0,"exts":{},"customProperties":{},"template":"Block"},{"x":512,"y":312,"opacity":1,"tint":16777215,"scale":{"x":1.1,"y":1},"rotation":0,"exts":{},"customProperties":{},"template":"Platform"},{"x":-64,"y":688,"opacity":1,"tint":16777215,"scale":{"x":1,"y":1},"rotation":0,"exts":{},"customProperties":{},"template":"Platform"},{"x":896,"y":288,"opacity":1,"tint":16777215,"scale":{"x":1,"y":1},"rotation":0,"exts":{},"customProperties":{},"template":"Platform"},{"x":896,"y":688,"opacity":1,"tint":16777215,"scale":{"x":1,"y":1},"rotation":0,"exts":{},"customProperties":{},"template":"Platform"},{"x":704,"y":688,"opacity":1,"tint":16777215,"scale":{"x":1,"y":1},"rotation":0,"exts":{},"customProperties":{},"template":"Platform"},{"x":128,"y":688,"opacity":1,"tint":16777215,"scale":{"x":1,"y":1},"rotation":0,"exts":{},"customProperties":{},"template":"Platform"},{"x":0,"y":0,"opacity":1,"tint":16777215,"scale":{"x":1,"y":0.45714286},"rotation":0,"exts":{},"customProperties":{},"template":"Platform"},{"x":0,"y":288,"opacity":1,"tint":16777215,"scale":{"x":1,"y":1},"rotation":0,"exts":{},"customProperties":{},"template":"Platform"},{"x":1104,"y":464,"opacity":1,"tint":16777215,"scale":{"x":-0.75,"y":0.78666667},"rotation":0,"exts":{},"customProperties":{},"template":"door"},{"x":996,"y":608,"opacity":1,"tint":16777215,"scale":{"x":0.71794872,"y":0.80733944},"rotation":0,"exts":{},"customProperties":{},"template":"tank-2"},{"x":-48,"y":464,"opacity":1,"tint":16777215,"scale":{"x":0.75,"y":0.78666667},"rotation":0,"exts":{},"customProperties":{"newProperty1":"","newProperty2":""},"template":"door"},{"x":54,"y":608,"opacity":1,"tint":16777215,"scale":{"x":-0.71794872,"y":0.80733944},"rotation":0,"exts":{},"customProperties":{},"template":"tank-2"},{"x":-48,"y":64,"opacity":1,"tint":16777215,"scale":{"x":0.75,"y":0.78666667},"rotation":0,"exts":{},"customProperties":{"newProperty1":"","newProperty2":""},"template":"door"},{"x":192,"y":0,"opacity":1,"tint":16777215,"scale":{"x":1,"y":0.45714286},"rotation":0,"exts":{},"customProperties":{},"template":"Platform"},{"x":384,"y":0,"opacity":1,"tint":16777215,"scale":{"x":1,"y":0.45714286},"rotation":0,"exts":{},"customProperties":{},"template":"Platform"},{"x":576,"y":0,"opacity":1,"tint":16777215,"scale":{"x":1,"y":0.45714286},"rotation":0,"exts":{},"customProperties":{},"template":"Platform"},{"x":768,"y":0,"opacity":1,"tint":16777215,"scale":{"x":1,"y":0.45714286},"rotation":0,"exts":{},"customProperties":{},"template":"Platform"},{"x":960,"y":0,"opacity":1,"tint":16777215,"scale":{"x":1,"y":0.45714286},"rotation":0,"exts":{},"customProperties":{},"template":"Platform"},{"x":1088,"y":64,"opacity":1,"tint":16777215,"scale":{"x":-0.75,"y":0.78666667},"rotation":0,"exts":{},"customProperties":{"newProperty3":""},"template":"door"},{"x":54,"y":208,"opacity":1,"tint":16777215,"scale":{"x":-0.71794872,"y":0.80733944},"rotation":0,"exts":{},"customProperties":{},"template":"tank-2"},{"x":144,"y":656,"opacity":1,"tint":16777215,"scale":{"x":0.67605634,"y":0.56140351},"rotation":0,"exts":{},"customProperties":{},"template":"manhole"},{"x":1088,"y":656,"opacity":1,"tint":16777215,"scale":{"x":1,"y":1},"rotation":-1.5707963267948966,"exts":{},"customProperties":{},"template":"Platform"},{"x":784,"y":656,"opacity":1,"tint":16777215,"scale":{"x":0.67605634,"y":0.56140351},"rotation":0,"exts":{},"customProperties":{},"template":"manhole"},{"x":96,"y":64,"opacity":1,"tint":16777215,"scale":{"x":0.67605634,"y":-0.56140351},"rotation":0,"exts":{},"customProperties":{},"template":"manhole"},{"x":816,"y":64,"opacity":1,"tint":16777215,"scale":{"x":0.67605634,"y":-0.56140351},"rotation":0,"exts":{},"customProperties":{},"template":"manhole"},{"x":992,"y":208,"opacity":1,"tint":16777215,"scale":{"x":0.7,"y":0.8},"rotation":0,"exts":{},"customProperties":{},"template":"tank-2"},{"x":784,"y":312,"opacity":1,"tint":16777215,"scale":{"x":0.5973822,"y":1},"rotation":0,"exts":{},"customProperties":{},"template":"Platform"},{"x":304,"y":488,"opacity":1,"tint":16777215,"scale":{"x":0.83769634,"y":1},"rotation":0,"exts":{},"customProperties":{},"template":"Platform"},{"x":416,"y":704,"opacity":1,"tint":16777215,"scale":{"x":1,"y":1},"rotation":0,"exts":{},"customProperties":{},"template":"cat-1"}]'),
    bgs: JSON.parse('[]'),
    tiles: JSON.parse('[]'),
    backgroundColor: '#000000',
    
    onStep() {
        
    },
    onDraw() {
        
    },
    onLeave() {
        
    },
    onCreate() {
        /* room Platformer6 — core_OnRoomStart (On room start event) */
{
 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }

// Make a room
console.log("options", this.options, roomOptions[this.name]);
// if ( ! this.options) this.options = {symbol:"He"};
let options = roomOptions[this.name];
if ( ! options) {
    options = {symbol:startSymbol};
    platform4symbol[startSymbol] = startPlatform;
    roomOptions[this.name] = options;
    console.log("START at "+options.symbol);
}
assert(options.symbol, options);
this.element = info4symbol[options.symbol];
assert(this.element && this.element.atomic_number, "No element info "+this.element);
assert(this.element.symbol, this.element);
this.atomicNumber = _optionalChain([this, 'access', _ => _.element, 'optionalAccess', _2 => _2.atomic_number]);

// fade the BG
if ( ! _optionalChain([ct, 'access', _3 => _3.room, 'access', _4 => _4.backgrounds, 'optionalAccess', _5 => _5.length])) {
    if ( ! options.bgName) options.bgName = getRandomMember("backdrop wall-1 wall-2 wall-3 wall-4".split(" "));    
    const bg = ct.backgrounds.add(options.bgName);
    bg.alpha = 0.35;
}
// Hack Neon
if (options.symbol === "Ne") {
    let pEmpty = ct.templates.copy("Empty");
    pEmpty.tex = "red-neon";
    pEmpty.x = 350;
    pEmpty.y = 200;
    pEmpty.alpha = 0.5;
   console.log(pEmpty);
}

{
    let p = platform4symbol[options.symbol] || getRandomMember([2,3,4,5]);
    console.log("platform",p);
    let room2 = ct.rooms.merge('Platformer'+p);
    // room2.children.forEach(kid => {
    //     room2.removeChild(kid)
    //     ct.room.addChild(kid);
    // });
    console.log("merged", room2, "ct.room", ct.room, "parent", ct.room.parent);
    // room2.
    // room2.alpha = 1; // huh?
    // ct.stage.
}

// add UI
let roomUI = ct.rooms.append('Room_UI');
// On-screen joystick?
// if (isMobile() || true) {
//     ct.vkeys.joystick({
//         key: 'Vjoy1',
//         tex: 'paper', // TODOTrackPad',
//         trackballTex: 'spit', // TODO
//         depth: 1000,
//         x: 500,
//         y: 500,
//         container: roomUI
//     });
// }

class Layout {
    
    
    
    
    
    
}

/**
 * @returns {Layout}
 */
function layoutRoom(symbol) {
    console.log("layoutRoom", symbol);
    assert(symbol, "no symbol");
    let oldlayout = layout4symbol[symbol];
    if (oldlayout) {
        console.log("use oldlayout for "+symbol, oldlayout);
        return oldlayout;
    }
    console.log("make new layout for "+symbol);
    let layout = new Layout();
    layout.symbol = symbol;
    layout4symbol[symbol] = layout;
    let corners = "NE NW SE SW".split(" "); 
    // match existing doors
    let leftSymbol = getNextElementSymbol(symbol, -1, 0);
    let upSymbol = getNextElementSymbol(symbol, 0, -1);
    if (leftSymbol) {
        let leftLayout = layoutRoom(leftSymbol);
        assert(leftLayout.eExit, "no eExit", leftSymbol, leftLayout);
        layout.wExit = leftLayout.eExit.replace("E","W");
        remove(corners, layout.wExit);
        console.log(symbol, "has leftSymbol", leftSymbol, layout.wExit);
    }
    if (upSymbol) {
        let upLayout = layoutRoom(upSymbol);
        assert(upLayout.sExit, "no sExit in upLayout", upSymbol, upLayout);
        layout.nExit = upLayout.sExit.replace("S","N");
        remove(corners, layout.nExit);
    }
    console.log("back to layout",symbol,"corners left",corners.join(", "));
    // place the tank
    let corner = getRandomMember(corners);
    layout.tank = corner;
    remove(corners, layout.tank);
    // place exits
    assert(corners.length);
    // console.log(symbol,JSON.stringify(corners),JSON.stringify(layout));
    // if ( ! layout.wExit) {
    //     let corner = getRandomMember(corners);
    //     layout.wExit = corner;
    // }
    if ( ! layout.eExit) {
        let eSymbol = getNextElementSymbol(symbol, 1, 0);
        if (eSymbol) {
            let corner = getRandomMember(corners.filter(c => c.includes("E")));
            if ( ! corner) {
                console.warn("Must now overlap for E");
                if (layout.nExit && layout.nExit.endsWith("E")) corner = layout.nExit;
                else corner = "SE";
            }
            layout.eExit = corner;
        }
    }
    // if ( ! layout.nExit) {
    //     let corner = getRandomMember(corners);
    //     layout.nExit = corner;
    // }
    if ( ! layout.sExit) {
        let sSymbol = getNextElementSymbol(symbol, 0, 1);
        if (sSymbol) {
            let corner = getRandomMember(corners.filter(c => c.includes("S")));
            if ( ! corner) {
                console.warn("Must now overlap for S");
                if (layout.eExit && layout.eExit.startsWith("S")) corner = layout.eExit;
                else corner = "SW";
            }
            // assert(corner, "no S corners", corners, symbol+ " to "+sSymbol,"layout",layout);
            layout.sExit = corner;
        } else {
            console.log("no S symbol", symbol, sSymbol);
        }
    }
    if ( ! layout.cat) {
        let corner = getRandomMember(corners);
        layout.cat = corner;
    }
    console.log("layout", symbol, layout);
    return layout;
}

/** use a fn to avoid memory leaks */
function arrangeRoom(room) {
    let roomState = roomOptions[room.name];
    if ( ! roomState) roomState = roomOptions[room.name] = {};
    console.log("arrange", room, "element", room.element, "symbol", room.symbol, "state", roomState);
    assert(room.element.symbol, room);
    const symbol = room.element.symbol;
    let layout = layoutRoom(symbol);
    console.log(symbol, layout);
    let n = room.element.atomic_number % 4;
    console.log("n",n,"element",symbol);
    let doors = getTemplates(room, "door");
    let manholes = getTemplates(room, "manhole");
    let tanks = ct.templates.list['tank-2'].filter(tmp => tmp.getRoom() === room);
    // let cats = ct.templates.list['cat-1'].filter(tmp => tmp.getRoom() === room);
    tanks.forEach(tank => {
        let corner = getCompassCorner(tank);
        if (layout.tank !== corner) {
            console.log("kill tank",corner,"vs layout",layout);
            tank.kill = true;
        }   
    });
    console.log("doors",doors);
    // exists and locks
    manholes.forEach(manhole => {
        let cc = getCompassCorner(manhole);
        if (layout.nExit === cc || layout.sExit === cc) {
            let dy = manhole.y > 200? 1 : -1;
            let nextSymbol = getNextElementSymbol(symbol, 0, dy);
            if ( ! nextSymbol) manhole.kill = true;
            manhole.nextSymbol = nextSymbol;
            if (isUnlocked(symbol, nextSymbol)) {
                manhole.unlocked = true;
            }
        } else {
            manhole.kill = true;
        }
    });
    doors.forEach(door => {
        let cc = getCompassCorner(door);
        if (layout.eExit === cc || layout.wExit === cc) {
            let dx = door.x > 200? 1 : -1;
            let nextSymbol = getNextElementSymbol(symbol, dx, 0);
            door.nextSymbol = nextSymbol;
            if (isUnlocked(symbol, nextSymbol)) {
                door.unlocked = true;
            }
        } else {
            door.kill = true;
        }
    });

    // for(let i=1; i<cats.length; i++) {
    //     cats[i].kill = true;
    // }

    // Place the chimp    
    if (roomState.playerx) {
        let chimp = getTemplates(room, "chimp")[0];
        if (chimp) { // paranoia (maybe the chimp got killed)
            chimp.x = roomState.playerx;
            chimp.y = roomState.playery;
        }
    }
};
arrangeRoom(this);

}

    },
    isUi: false,
    follow: false,
    extends: {}
}
        
ct.rooms.templates['Room_Platformer_backup'] = {
    name: 'Room_Platformer_backup',
    group: 'ungrouped',
    width: 1280,
    height: 720,
    objects: JSON.parse('[{"x":768,"y":224,"opacity":1,"tint":16777215,"scale":{"x":1,"y":1},"rotation":0,"exts":{},"customProperties":{},"template":"chimp"},{"x":-64,"y":688,"opacity":1,"tint":16777215,"scale":{"x":1,"y":1},"rotation":0,"exts":{},"customProperties":{},"template":"Platform"},{"x":896,"y":288,"opacity":1,"tint":16777215,"scale":{"x":1,"y":1},"rotation":0,"exts":{},"customProperties":{},"template":"Platform"},{"x":896,"y":688,"opacity":1,"tint":16777215,"scale":{"x":1,"y":1},"rotation":0,"exts":{},"customProperties":{},"template":"Platform"},{"x":704,"y":688,"opacity":1,"tint":16777215,"scale":{"x":1,"y":1},"rotation":0,"exts":{},"customProperties":{},"template":"Platform"},{"x":128,"y":688,"opacity":1,"tint":16777215,"scale":{"x":1,"y":1},"rotation":0,"exts":{},"customProperties":{},"template":"Platform"},{"x":0,"y":0,"opacity":1,"tint":16777215,"scale":{"x":1,"y":0.45714286},"rotation":0,"exts":{},"customProperties":{},"template":"Platform"},{"x":0,"y":288,"opacity":1,"tint":16777215,"scale":{"x":1,"y":1},"rotation":0,"exts":{},"customProperties":{},"template":"Platform"},{"x":1104,"y":464,"opacity":1,"tint":16777215,"scale":{"x":-0.75,"y":0.78666667},"rotation":0,"exts":{},"customProperties":{},"template":"door"},{"x":976,"y":608,"opacity":1,"tint":16777215,"scale":{"x":0.71794872,"y":0.80733944},"rotation":0,"exts":{},"customProperties":{},"template":"tank-2"},{"x":-48,"y":464,"opacity":1,"tint":16777215,"scale":{"x":0.75,"y":0.78666667},"rotation":0,"exts":{},"customProperties":{"newProperty1":"","newProperty2":""},"template":"door"},{"x":64,"y":608,"opacity":1,"tint":16777215,"scale":{"x":-0.71794872,"y":0.80733944},"rotation":0,"exts":{},"customProperties":{},"template":"tank-2"},{"x":-48,"y":64,"opacity":1,"tint":16777215,"scale":{"x":0.75,"y":0.78666667},"rotation":0,"exts":{},"customProperties":{"newProperty1":"","newProperty2":""},"template":"door"},{"x":192,"y":0,"opacity":1,"tint":16777215,"scale":{"x":1,"y":0.45714286},"rotation":0,"exts":{},"customProperties":{},"template":"Platform"},{"x":384,"y":0,"opacity":1,"tint":16777215,"scale":{"x":1,"y":0.45714286},"rotation":0,"exts":{},"customProperties":{},"template":"Platform"},{"x":576,"y":0,"opacity":1,"tint":16777215,"scale":{"x":1,"y":0.45714286},"rotation":0,"exts":{},"customProperties":{},"template":"Platform"},{"x":768,"y":0,"opacity":1,"tint":16777215,"scale":{"x":1,"y":0.45714286},"rotation":0,"exts":{},"customProperties":{},"template":"Platform"},{"x":960,"y":0,"opacity":1,"tint":16777215,"scale":{"x":1,"y":0.45714286},"rotation":0,"exts":{},"customProperties":{},"template":"Platform"},{"x":1088,"y":64,"opacity":1,"tint":16777215,"scale":{"x":-0.75,"y":0.78666667},"rotation":0,"exts":{},"customProperties":{"newProperty3":""},"template":"door"},{"x":64,"y":208,"opacity":1,"tint":16777215,"scale":{"x":-0.71794872,"y":0.80733944},"rotation":0,"exts":{},"customProperties":{},"template":"tank-2"},{"x":144,"y":656,"opacity":1,"tint":16777215,"scale":{"x":0.67605634,"y":0.56140351},"rotation":0,"exts":{},"customProperties":{},"template":"manhole"},{"x":1088,"y":288,"opacity":1,"tint":16777215,"scale":{"x":1,"y":1},"rotation":-1.5707963267948966,"exts":{},"customProperties":{},"template":"Platform"},{"x":1088,"y":480,"opacity":1,"tint":16777215,"scale":{"x":1,"y":1},"rotation":-1.5707963267948966,"exts":{},"customProperties":{},"template":"Platform"},{"x":1088,"y":656,"opacity":1,"tint":16777215,"scale":{"x":1,"y":1},"rotation":-1.5707963267948966,"exts":{},"customProperties":{},"template":"Platform"},{"x":784,"y":656,"opacity":1,"tint":16777215,"scale":{"x":0.67605634,"y":0.56140351},"rotation":0,"exts":{},"customProperties":{},"template":"manhole"},{"x":96,"y":64,"opacity":1,"tint":16777215,"scale":{"x":0.67605634,"y":-0.56140351},"rotation":0,"exts":{},"customProperties":{},"template":"manhole"},{"x":816,"y":64,"opacity":1,"tint":16777215,"scale":{"x":0.67605634,"y":-0.56140351},"rotation":0,"exts":{},"customProperties":{},"template":"manhole"},{"x":976,"y":208,"opacity":1,"tint":16777215,"scale":{"x":0.7,"y":0.8},"rotation":0,"exts":{},"customProperties":{},"template":"tank-2"}]'),
    bgs: JSON.parse('[]'),
    tiles: JSON.parse('[]'),
    backgroundColor: '#000000',
    
    onStep() {
        
    },
    onDraw() {
        
    },
    onLeave() {
        
    },
    onCreate() {
        /* room Room_Platformer_backup — core_OnRoomStart (On room start event) */
{
 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }

// Make a room
console.log("options", this.options, roomOptions[this.name]);
// if ( ! this.options) this.options = {symbol:"He"};
let options = roomOptions[this.name];
if ( ! options) {
    options = {symbol:startSymbol};
    platform4symbol[startSymbol] = startPlatform;
    roomOptions[this.name] = options;
    console.log("START at "+options.symbol);
}
assert(options.symbol, options);
this.element = info4symbol[options.symbol];
assert(this.element && this.element.atomic_number, "No element info "+this.element);
assert(this.element.symbol, this.element);
this.atomicNumber = _optionalChain([this, 'access', _ => _.element, 'optionalAccess', _2 => _2.atomic_number]);

// fade the BG
if ( ! _optionalChain([ct, 'access', _3 => _3.room, 'access', _4 => _4.backgrounds, 'optionalAccess', _5 => _5.length])) {
    if ( ! options.bgName) options.bgName = getRandomMember("backdrop wall-1 wall-2 wall-3 wall-4".split(" "));    
    const bg = ct.backgrounds.add(options.bgName);
    bg.alpha = 0.35;
}
// Hack Neon
if (options.symbol === "Ne") {
    let pEmpty = ct.templates.copy("Empty");
    pEmpty.tex = "red-neon";
    pEmpty.x = 350;
    pEmpty.y = 200;
    pEmpty.alpha = 0.5;
   console.log(pEmpty);
}

{
    let p = platform4symbol[options.symbol] || getRandomMember([2,3,4,5]);
    console.log("platform",p);
    let room2 = ct.rooms.merge('Platformer'+p);
    // room2.children.forEach(kid => {
    //     room2.removeChild(kid)
    //     ct.room.addChild(kid);
    // });
    console.log("merged", room2, "ct.room", ct.room, "parent", ct.room.parent);
    // room2.
    // room2.alpha = 1; // huh?
    // ct.stage.
}

// add UI
let roomUI = ct.rooms.append('Room_UI');
// On-screen joystick?
// if (isMobile() || true) {
//     ct.vkeys.joystick({
//         key: 'Vjoy1',
//         tex: 'paper', // TODOTrackPad',
//         trackballTex: 'spit', // TODO
//         depth: 1000,
//         x: 500,
//         y: 500,
//         container: roomUI
//     });
// }

class Layout {
    
    
    
    
    
    
}

/**
 * @returns {Layout}
 */
function layoutRoom(symbol) {
    console.log("layoutRoom", symbol);
    assert(symbol, "no symbol");
    let oldlayout = layout4symbol[symbol];
    if (oldlayout) {
        console.log("use oldlayout for "+symbol, oldlayout);
        return oldlayout;
    }
    console.log("make new layout for "+symbol);
    let layout = new Layout();
    layout.symbol = symbol;
    layout4symbol[symbol] = layout;
    let corners = "NE NW SE SW".split(" "); 
    // match existing doors
    let leftSymbol = getNextElementSymbol(symbol, -1, 0);
    let upSymbol = getNextElementSymbol(symbol, 0, -1);
    if (leftSymbol) {
        let leftLayout = layoutRoom(leftSymbol);
        assert(leftLayout.eExit, "no eExit", leftSymbol, leftLayout);
        layout.wExit = leftLayout.eExit.replace("E","W");
        remove(corners, layout.wExit);
        console.log(symbol, "has leftSymbol", leftSymbol, layout.wExit);
    }
    if (upSymbol) {
        let upLayout = layoutRoom(upSymbol);
        assert(upLayout.sExit, "no sExit in upLayout", upSymbol, upLayout);
        layout.nExit = upLayout.sExit.replace("S","N");
        remove(corners, layout.nExit);
    }
    console.log("back to layout",symbol,"corners left",corners.join(", "));
    // place the tank
    let corner = getRandomMember(corners);
    layout.tank = corner;
    remove(corners, layout.tank);
    // place exits
    assert(corners.length);
    // console.log(symbol,JSON.stringify(corners),JSON.stringify(layout));
    // if ( ! layout.wExit) {
    //     let corner = getRandomMember(corners);
    //     layout.wExit = corner;
    // }
    if ( ! layout.eExit) {
        let eSymbol = getNextElementSymbol(symbol, 1, 0);
        if (eSymbol) {
            let corner = getRandomMember(corners.filter(c => c.includes("E")));
            if ( ! corner) {
                console.warn("Must now overlap for E");
                if (layout.nExit && layout.nExit.endsWith("E")) corner = layout.nExit;
                else corner = "SE";
            }
            layout.eExit = corner;
        }
    }
    // if ( ! layout.nExit) {
    //     let corner = getRandomMember(corners);
    //     layout.nExit = corner;
    // }
    if ( ! layout.sExit) {
        let sSymbol = getNextElementSymbol(symbol, 0, 1);
        if (sSymbol) {
            let corner = getRandomMember(corners.filter(c => c.includes("S")));
            if ( ! corner) {
                console.warn("Must now overlap for S");
                if (layout.eExit && layout.eExit.startsWith("S")) corner = layout.eExit;
                else corner = "SW";
            }
            // assert(corner, "no S corners", corners, symbol+ " to "+sSymbol,"layout",layout);
            layout.sExit = corner;
        } else {
            console.log("no S symbol", symbol, sSymbol);
        }
    }
    if ( ! layout.cat) {
        let corner = getRandomMember(corners);
        layout.cat = corner;
    }
    console.log("layout", symbol, layout);
    return layout;
}

/** use a fn to avoid memory leaks */
function arrangeRoom(room) {
    let roomState = roomOptions[room.name];
    if ( ! roomState) roomState = roomOptions[room.name] = {};
    console.log("arrange", room, "element", room.element, "symbol", room.symbol, "state", roomState);
    assert(room.element.symbol, room);
    const symbol = room.element.symbol;
    let layout = layoutRoom(symbol);
    console.log(symbol, layout);
    let n = room.element.atomic_number % 4;
    console.log("n",n,"element",symbol);
    let doors = getTemplates(room, "door");
    let manholes = getTemplates(room, "manhole");
    let tanks = ct.templates.list['tank-2'].filter(tmp => tmp.getRoom() === room);
    // let cats = ct.templates.list['cat-1'].filter(tmp => tmp.getRoom() === room);
    tanks.forEach(tank => {
        let corner = getCompassCorner(tank);
        if (layout.tank !== corner) {
            console.log("kill tank",corner,"vs layout",layout);
            tank.kill = true;
        }   
    });
    console.log("doors",doors);
    // exists and locks
    manholes.forEach(manhole => {
        let cc = getCompassCorner(manhole);
        if (layout.nExit === cc || layout.sExit === cc) {
            let dy = manhole.y > 200? 1 : -1;
            let nextSymbol = getNextElementSymbol(symbol, 0, dy);
            if ( ! nextSymbol) manhole.kill = true;
            manhole.nextSymbol = nextSymbol;
            if (isUnlocked(symbol, nextSymbol)) {
                manhole.unlocked = true;
            }
        } else {
            manhole.kill = true;
        }
    });
    doors.forEach(door => {
        let cc = getCompassCorner(door);
        if (layout.eExit === cc || layout.wExit === cc) {
            let dx = door.x > 200? 1 : -1;
            let nextSymbol = getNextElementSymbol(symbol, dx, 0);
            door.nextSymbol = nextSymbol;
            if (isUnlocked(symbol, nextSymbol)) {
                door.unlocked = true;
            }
        } else {
            door.kill = true;
        }
    });

    // for(let i=1; i<cats.length; i++) {
    //     cats[i].kill = true;
    // }

    // Place the chimp    
    if (roomState.playerx) {
        let chimp = getTemplates(room, "chimp")[0];
        if (chimp) { // paranoia (maybe the chimp got killed)
            chimp.x = roomState.playerx;
            chimp.y = roomState.playery;
        }
    }
};
arrangeRoom(this);

}

    },
    isUi: false,
    follow: false,
    extends: {}
}
        
ct.rooms.templates['Room_Platformer_backup_dup'] = {
    name: 'Room_Platformer_backup_dup',
    group: 'ungrouped',
    width: 1280,
    height: 720,
    objects: JSON.parse('[{"x":768,"y":224,"opacity":1,"tint":16777215,"scale":{"x":1,"y":1},"rotation":0,"exts":{},"customProperties":{},"template":"chimp"},{"x":-64,"y":688,"opacity":1,"tint":16777215,"scale":{"x":1,"y":1},"rotation":0,"exts":{},"customProperties":{},"template":"Platform"},{"x":896,"y":288,"opacity":1,"tint":16777215,"scale":{"x":1,"y":1},"rotation":0,"exts":{},"customProperties":{},"template":"Platform"},{"x":896,"y":688,"opacity":1,"tint":16777215,"scale":{"x":1,"y":1},"rotation":0,"exts":{},"customProperties":{},"template":"Platform"},{"x":704,"y":688,"opacity":1,"tint":16777215,"scale":{"x":1,"y":1},"rotation":0,"exts":{},"customProperties":{},"template":"Platform"},{"x":128,"y":688,"opacity":1,"tint":16777215,"scale":{"x":1,"y":1},"rotation":0,"exts":{},"customProperties":{},"template":"Platform"},{"x":0,"y":0,"opacity":1,"tint":16777215,"scale":{"x":1,"y":0.45714286},"rotation":0,"exts":{},"customProperties":{},"template":"Platform"},{"x":0,"y":288,"opacity":1,"tint":16777215,"scale":{"x":1,"y":1},"rotation":0,"exts":{},"customProperties":{},"template":"Platform"},{"x":1104,"y":464,"opacity":1,"tint":16777215,"scale":{"x":-0.75,"y":0.78666667},"rotation":0,"exts":{},"customProperties":{},"template":"door"},{"x":976,"y":608,"opacity":1,"tint":16777215,"scale":{"x":0.71794872,"y":0.80733944},"rotation":0,"exts":{},"customProperties":{},"template":"tank-2"},{"x":-48,"y":464,"opacity":1,"tint":16777215,"scale":{"x":0.75,"y":0.78666667},"rotation":0,"exts":{},"customProperties":{"newProperty1":"","newProperty2":""},"template":"door"},{"x":64,"y":608,"opacity":1,"tint":16777215,"scale":{"x":-0.71794872,"y":0.80733944},"rotation":0,"exts":{},"customProperties":{},"template":"tank-2"},{"x":-48,"y":64,"opacity":1,"tint":16777215,"scale":{"x":0.75,"y":0.78666667},"rotation":0,"exts":{},"customProperties":{"newProperty1":"","newProperty2":""},"template":"door"},{"x":192,"y":0,"opacity":1,"tint":16777215,"scale":{"x":1,"y":0.45714286},"rotation":0,"exts":{},"customProperties":{},"template":"Platform"},{"x":384,"y":0,"opacity":1,"tint":16777215,"scale":{"x":1,"y":0.45714286},"rotation":0,"exts":{},"customProperties":{},"template":"Platform"},{"x":576,"y":0,"opacity":1,"tint":16777215,"scale":{"x":1,"y":0.45714286},"rotation":0,"exts":{},"customProperties":{},"template":"Platform"},{"x":768,"y":0,"opacity":1,"tint":16777215,"scale":{"x":1,"y":0.45714286},"rotation":0,"exts":{},"customProperties":{},"template":"Platform"},{"x":960,"y":0,"opacity":1,"tint":16777215,"scale":{"x":1,"y":0.45714286},"rotation":0,"exts":{},"customProperties":{},"template":"Platform"},{"x":1088,"y":64,"opacity":1,"tint":16777215,"scale":{"x":-0.75,"y":0.78666667},"rotation":0,"exts":{},"customProperties":{"newProperty3":""},"template":"door"},{"x":64,"y":208,"opacity":1,"tint":16777215,"scale":{"x":-0.71794872,"y":0.80733944},"rotation":0,"exts":{},"customProperties":{},"template":"tank-2"},{"x":144,"y":656,"opacity":1,"tint":16777215,"scale":{"x":0.67605634,"y":0.56140351},"rotation":0,"exts":{},"customProperties":{},"template":"manhole"},{"x":1088,"y":288,"opacity":1,"tint":16777215,"scale":{"x":1,"y":1},"rotation":-1.5707963267948966,"exts":{},"customProperties":{},"template":"Platform"},{"x":1088,"y":480,"opacity":1,"tint":16777215,"scale":{"x":1,"y":1},"rotation":-1.5707963267948966,"exts":{},"customProperties":{},"template":"Platform"},{"x":1088,"y":656,"opacity":1,"tint":16777215,"scale":{"x":1,"y":1},"rotation":-1.5707963267948966,"exts":{},"customProperties":{},"template":"Platform"},{"x":784,"y":656,"opacity":1,"tint":16777215,"scale":{"x":0.67605634,"y":0.56140351},"rotation":0,"exts":{},"customProperties":{},"template":"manhole"},{"x":96,"y":64,"opacity":1,"tint":16777215,"scale":{"x":0.67605634,"y":-0.56140351},"rotation":0,"exts":{},"customProperties":{},"template":"manhole"},{"x":816,"y":64,"opacity":1,"tint":16777215,"scale":{"x":0.67605634,"y":-0.56140351},"rotation":0,"exts":{},"customProperties":{},"template":"manhole"},{"x":976,"y":208,"opacity":1,"tint":16777215,"scale":{"x":0.7,"y":0.8},"rotation":0,"exts":{},"customProperties":{},"template":"tank-2"}]'),
    bgs: JSON.parse('[]'),
    tiles: JSON.parse('[]'),
    backgroundColor: '#000000',
    
    onStep() {
        
    },
    onDraw() {
        
    },
    onLeave() {
        
    },
    onCreate() {
        /* room Room_Platformer_backup_dup — core_OnRoomStart (On room start event) */
{
 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }

// Make a room
console.log("options", this.options, roomOptions[this.name]);
// if ( ! this.options) this.options = {symbol:"He"};
let options = roomOptions[this.name];
if ( ! options) {
    options = {symbol:startSymbol};
    platform4symbol[startSymbol] = startPlatform;
    roomOptions[this.name] = options;
    console.log("START at "+options.symbol);
}
assert(options.symbol, options);
this.element = info4symbol[options.symbol];
assert(this.element && this.element.atomic_number, "No element info "+this.element);
assert(this.element.symbol, this.element);
this.atomicNumber = _optionalChain([this, 'access', _ => _.element, 'optionalAccess', _2 => _2.atomic_number]);

// fade the BG
if ( ! _optionalChain([ct, 'access', _3 => _3.room, 'access', _4 => _4.backgrounds, 'optionalAccess', _5 => _5.length])) {
    if ( ! options.bgName) options.bgName = getRandomMember("backdrop wall-1 wall-2 wall-3 wall-4".split(" "));    
    const bg = ct.backgrounds.add(options.bgName);
    bg.alpha = 0.35;
}
// Hack Neon
if (options.symbol === "Ne") {
    let pEmpty = ct.templates.copy("Empty");
    pEmpty.tex = "red-neon";
    pEmpty.x = 350;
    pEmpty.y = 200;
    pEmpty.alpha = 0.5;
   console.log(pEmpty);
}

{
    let p = platform4symbol[options.symbol] || getRandomMember([2,3,4,5]);
    console.log("platform",p);
    let room2 = ct.rooms.merge('Platformer'+p);
    // room2.children.forEach(kid => {
    //     room2.removeChild(kid)
    //     ct.room.addChild(kid);
    // });
    console.log("merged", room2, "ct.room", ct.room, "parent", ct.room.parent);
    // room2.
    // room2.alpha = 1; // huh?
    // ct.stage.
}

// add UI
let roomUI = ct.rooms.append('Room_UI');
// On-screen joystick?
// if (isMobile() || true) {
//     ct.vkeys.joystick({
//         key: 'Vjoy1',
//         tex: 'paper', // TODOTrackPad',
//         trackballTex: 'spit', // TODO
//         depth: 1000,
//         x: 500,
//         y: 500,
//         container: roomUI
//     });
// }

class Layout {
    
    
    
    
    
    
}

/**
 * @returns {Layout}
 */
function layoutRoom(symbol) {
    console.log("layoutRoom", symbol);
    assert(symbol, "no symbol");
    let oldlayout = layout4symbol[symbol];
    if (oldlayout) {
        console.log("use oldlayout for "+symbol, oldlayout);
        return oldlayout;
    }
    console.log("make new layout for "+symbol);
    let layout = new Layout();
    layout.symbol = symbol;
    layout4symbol[symbol] = layout;
    let corners = "NE NW SE SW".split(" "); 
    // match existing doors
    let leftSymbol = getNextElementSymbol(symbol, -1, 0);
    let upSymbol = getNextElementSymbol(symbol, 0, -1);
    if (leftSymbol) {
        let leftLayout = layoutRoom(leftSymbol);
        assert(leftLayout.eExit, "no eExit", leftSymbol, leftLayout);
        layout.wExit = leftLayout.eExit.replace("E","W");
        remove(corners, layout.wExit);
        console.log(symbol, "has leftSymbol", leftSymbol, layout.wExit);
    }
    if (upSymbol) {
        let upLayout = layoutRoom(upSymbol);
        assert(upLayout.sExit, "no sExit in upLayout", upSymbol, upLayout);
        layout.nExit = upLayout.sExit.replace("S","N");
        remove(corners, layout.nExit);
    }
    console.log("back to layout",symbol,"corners left",corners.join(", "));
    // place the tank
    let corner = getRandomMember(corners);
    layout.tank = corner;
    remove(corners, layout.tank);
    // place exits
    assert(corners.length);
    // console.log(symbol,JSON.stringify(corners),JSON.stringify(layout));
    // if ( ! layout.wExit) {
    //     let corner = getRandomMember(corners);
    //     layout.wExit = corner;
    // }
    if ( ! layout.eExit) {
        let eSymbol = getNextElementSymbol(symbol, 1, 0);
        if (eSymbol) {
            let corner = getRandomMember(corners.filter(c => c.includes("E")));
            if ( ! corner) {
                console.warn("Must now overlap for E");
                if (layout.nExit && layout.nExit.endsWith("E")) corner = layout.nExit;
                else corner = "SE";
            }
            layout.eExit = corner;
        }
    }
    // if ( ! layout.nExit) {
    //     let corner = getRandomMember(corners);
    //     layout.nExit = corner;
    // }
    if ( ! layout.sExit) {
        let sSymbol = getNextElementSymbol(symbol, 0, 1);
        if (sSymbol) {
            let corner = getRandomMember(corners.filter(c => c.includes("S")));
            if ( ! corner) {
                console.warn("Must now overlap for S");
                if (layout.eExit && layout.eExit.startsWith("S")) corner = layout.eExit;
                else corner = "SW";
            }
            // assert(corner, "no S corners", corners, symbol+ " to "+sSymbol,"layout",layout);
            layout.sExit = corner;
        } else {
            console.log("no S symbol", symbol, sSymbol);
        }
    }
    if ( ! layout.cat) {
        let corner = getRandomMember(corners);
        layout.cat = corner;
    }
    console.log("layout", symbol, layout);
    return layout;
}

/** use a fn to avoid memory leaks */
function arrangeRoom(room) {
    let roomState = roomOptions[room.name];
    if ( ! roomState) roomState = roomOptions[room.name] = {};
    console.log("arrange", room, "element", room.element, "symbol", room.symbol, "state", roomState);
    assert(room.element.symbol, room);
    const symbol = room.element.symbol;
    let layout = layoutRoom(symbol);
    console.log(symbol, layout);
    let n = room.element.atomic_number % 4;
    console.log("n",n,"element",symbol);
    let doors = getTemplates(room, "door");
    let manholes = getTemplates(room, "manhole");
    let tanks = ct.templates.list['tank-2'].filter(tmp => tmp.getRoom() === room);
    // let cats = ct.templates.list['cat-1'].filter(tmp => tmp.getRoom() === room);
    tanks.forEach(tank => {
        let corner = getCompassCorner(tank);
        if (layout.tank !== corner) {
            console.log("kill tank",corner,"vs layout",layout);
            tank.kill = true;
        }   
    });
    console.log("doors",doors);
    // exists and locks
    manholes.forEach(manhole => {
        let cc = getCompassCorner(manhole);
        if (layout.nExit === cc || layout.sExit === cc) {
            let dy = manhole.y > 200? 1 : -1;
            let nextSymbol = getNextElementSymbol(symbol, 0, dy);
            if ( ! nextSymbol) manhole.kill = true;
            manhole.nextSymbol = nextSymbol;
            if (isUnlocked(symbol, nextSymbol)) {
                manhole.unlocked = true;
            }
        } else {
            manhole.kill = true;
        }
    });
    doors.forEach(door => {
        let cc = getCompassCorner(door);
        if (layout.eExit === cc || layout.wExit === cc) {
            let dx = door.x > 200? 1 : -1;
            let nextSymbol = getNextElementSymbol(symbol, dx, 0);
            door.nextSymbol = nextSymbol;
            if (isUnlocked(symbol, nextSymbol)) {
                door.unlocked = true;
            }
        } else {
            door.kill = true;
        }
    });

    // for(let i=1; i<cats.length; i++) {
    //     cats[i].kill = true;
    // }

    // Place the chimp    
    if (roomState.playerx) {
        let chimp = getTemplates(room, "chimp")[0];
        if (chimp) { // paranoia (maybe the chimp got killed)
            chimp.x = roomState.playerx;
            chimp.y = roomState.playery;
        }
    }
};
arrangeRoom(this);

}

    },
    isUi: false,
    follow: false,
    extends: {}
}
        
ct.rooms.templates['PlatformerNe'] = {
    name: 'PlatformerNe',
    group: 'ungrouped',
    width: 1280,
    height: 720,
    objects: JSON.parse('[{"x":768,"y":384,"opacity":1,"tint":16777215,"scale":{"x":1,"y":1},"rotation":0,"exts":{},"customProperties":{},"template":"Block"},{"x":704,"y":312,"opacity":1,"tint":16777215,"scale":{"x":0.8,"y":0.8},"rotation":0,"exts":{},"customProperties":{},"template":"Block"},{"x":768,"y":312,"opacity":1,"tint":16777215,"scale":{"x":0.8,"y":0.8},"rotation":0,"exts":{},"customProperties":{},"template":"Block"},{"x":832,"y":312,"opacity":1,"tint":16777215,"scale":{"x":0.8,"y":0.8},"rotation":0,"exts":{},"customProperties":{},"template":"Block"},{"x":448,"y":312,"opacity":1,"tint":16777215,"scale":{"x":0.8,"y":0.8},"rotation":0,"exts":{},"customProperties":{},"template":"Block"},{"x":384,"y":384,"opacity":1,"tint":16777215,"scale":{"x":1,"y":1},"rotation":0,"exts":{},"customProperties":{},"template":"Block"},{"x":224,"y":224,"opacity":1,"tint":16777215,"scale":{"x":1,"y":0.35164835},"rotation":0,"exts":{},"customProperties":{},"template":"Block"},{"x":576,"y":640,"opacity":1,"tint":16777215,"scale":{"x":1,"y":1},"rotation":0,"exts":{},"customProperties":{},"template":"Block"},{"x":608,"y":640,"opacity":1,"tint":16777215,"scale":{"x":-1,"y":1},"rotation":0,"exts":{},"customProperties":{},"template":"snake-spit"},{"x":632,"y":312,"opacity":1,"tint":16777215,"scale":{"x":1,"y":1},"rotation":0,"exts":{},"customProperties":{},"template":"snake-3"},{"x":448,"y":256,"opacity":1,"tint":16777215,"scale":{"x":1,"y":1},"rotation":0,"exts":{},"customProperties":{},"template":"coin"},{"x":512,"y":256,"opacity":1,"tint":16777215,"scale":{"x":1,"y":1},"rotation":0,"exts":{},"customProperties":{},"template":"coin"},{"x":576,"y":256,"opacity":1,"tint":16777215,"scale":{"x":1,"y":1},"rotation":0,"exts":{},"customProperties":{},"template":"coin"},{"x":640,"y":256,"opacity":1,"tint":16777215,"scale":{"x":1,"y":1},"rotation":0,"exts":{},"customProperties":{},"template":"coin"},{"x":704,"y":256,"opacity":1,"tint":16777215,"scale":{"x":1,"y":1},"rotation":0,"exts":{},"customProperties":{},"template":"coin"},{"x":768,"y":256,"opacity":1,"tint":16777215,"scale":{"x":1,"y":1},"rotation":0,"exts":{},"customProperties":{},"template":"coin"},{"x":832,"y":256,"opacity":1,"tint":16777215,"scale":{"x":1,"y":1},"rotation":0,"exts":{},"customProperties":{},"template":"coin"},{"x":832,"y":192,"opacity":1,"tint":16777215,"scale":{"x":1,"y":1},"rotation":0,"exts":{},"customProperties":{},"template":"coin"},{"x":768,"y":192,"opacity":1,"tint":16777215,"scale":{"x":1,"y":1},"rotation":0,"exts":{},"customProperties":{},"template":"coin"},{"x":704,"y":192,"opacity":1,"tint":16777215,"scale":{"x":1,"y":1},"rotation":0,"exts":{},"customProperties":{},"template":"coin"},{"x":640,"y":192,"opacity":1,"tint":16777215,"scale":{"x":1,"y":1},"rotation":0,"exts":{},"customProperties":{},"template":"coin"},{"x":576,"y":192,"opacity":1,"tint":16777215,"scale":{"x":1,"y":1},"rotation":0,"exts":{},"customProperties":{},"template":"coin"},{"x":512,"y":192,"opacity":1,"tint":16777215,"scale":{"x":1,"y":1},"rotation":0,"exts":{},"customProperties":{},"template":"coin"},{"x":448,"y":192,"opacity":1,"tint":16777215,"scale":{"x":1,"y":1},"rotation":0,"exts":{},"customProperties":{},"template":"coin"},{"x":704,"y":576,"opacity":1,"tint":16777215,"scale":{"x":1,"y":1},"rotation":0,"exts":{},"customProperties":{},"template":"coin"},{"x":768,"y":576,"opacity":1,"tint":16777215,"scale":{"x":1,"y":1},"rotation":0,"exts":{},"customProperties":{},"template":"coin"},{"x":832,"y":576,"opacity":1,"tint":16777215,"scale":{"x":1,"y":1},"rotation":0,"exts":{},"customProperties":{},"template":"coin"},{"x":448,"y":704,"opacity":1,"tint":16777215,"scale":{"x":1,"y":1},"rotation":0,"exts":{},"customProperties":{},"template":"Block"},{"x":384,"y":704,"opacity":1,"tint":16777215,"scale":{"x":1,"y":1},"rotation":0,"exts":{},"customProperties":{},"template":"Block"},{"x":384,"y":704,"opacity":1,"tint":16777215,"scale":{"x":1,"y":1},"rotation":0,"exts":{},"customProperties":{},"template":"Block"},{"x":320,"y":704,"opacity":1,"tint":16777215,"scale":{"x":1,"y":1},"rotation":0,"exts":{},"customProperties":{},"template":"Block"},{"x":256,"y":704,"opacity":1,"tint":16777215,"scale":{"x":1,"y":1},"rotation":0,"exts":{},"customProperties":{},"template":"Block"},{"x":512,"y":704,"opacity":1,"tint":16777215,"scale":{"x":1,"y":1},"rotation":0,"exts":{},"customProperties":{},"template":"Block"},{"x":576,"y":704,"opacity":1,"tint":16777215,"scale":{"x":1,"y":1},"rotation":0,"exts":{},"customProperties":{},"template":"Block"},{"x":640,"y":704,"opacity":1,"tint":16777215,"scale":{"x":1,"y":1},"rotation":0,"exts":{},"customProperties":{},"template":"Block"},{"x":512,"y":312,"opacity":1,"tint":16777215,"scale":{"x":1.1,"y":1},"rotation":0,"exts":{},"customProperties":{},"template":"Platform"},{"x":-64,"y":688,"opacity":1,"tint":16777215,"scale":{"x":1,"y":1},"rotation":0,"exts":{},"customProperties":{},"template":"Platform"},{"x":896,"y":288,"opacity":1,"tint":16777215,"scale":{"x":1,"y":1},"rotation":0,"exts":{},"customProperties":{},"template":"Platform"},{"x":896,"y":688,"opacity":1,"tint":16777215,"scale":{"x":1,"y":1},"rotation":0,"exts":{},"customProperties":{},"template":"Platform"},{"x":704,"y":688,"opacity":1,"tint":16777215,"scale":{"x":1,"y":1},"rotation":0,"exts":{},"customProperties":{},"template":"Platform"},{"x":128,"y":688,"opacity":1,"tint":16777215,"scale":{"x":1,"y":1},"rotation":0,"exts":{},"customProperties":{},"template":"Platform"},{"x":0,"y":0,"opacity":1,"tint":16777215,"scale":{"x":1,"y":0.45714286},"rotation":0,"exts":{},"customProperties":{},"template":"Platform"},{"x":0,"y":288,"opacity":1,"tint":16777215,"scale":{"x":1,"y":1},"rotation":0,"exts":{},"customProperties":{},"template":"Platform"},{"x":1104,"y":464,"opacity":1,"tint":16777215,"scale":{"x":-0.75,"y":0.78666667},"rotation":0,"exts":{},"customProperties":{},"template":"door"},{"x":976,"y":608,"opacity":1,"tint":16777215,"scale":{"x":0.71794872,"y":0.80733944},"rotation":0,"exts":{},"customProperties":{},"template":"tank-2"},{"x":-48,"y":464,"opacity":1,"tint":16777215,"scale":{"x":0.75,"y":0.78666667},"rotation":0,"exts":{},"customProperties":{"newProperty1":"","newProperty2":""},"template":"door"},{"x":64,"y":608,"opacity":1,"tint":16777215,"scale":{"x":-0.71794872,"y":0.80733944},"rotation":0,"exts":{},"customProperties":{},"template":"tank-2"},{"x":-48,"y":64,"opacity":1,"tint":16777215,"scale":{"x":0.75,"y":0.78666667},"rotation":0,"exts":{},"customProperties":{"newProperty1":"","newProperty2":""},"template":"door"},{"x":192,"y":0,"opacity":1,"tint":16777215,"scale":{"x":1,"y":0.45714286},"rotation":0,"exts":{},"customProperties":{},"template":"Platform"},{"x":384,"y":0,"opacity":1,"tint":16777215,"scale":{"x":1,"y":0.45714286},"rotation":0,"exts":{},"customProperties":{},"template":"Platform"},{"x":576,"y":0,"opacity":1,"tint":16777215,"scale":{"x":1,"y":0.45714286},"rotation":0,"exts":{},"customProperties":{},"template":"Platform"},{"x":768,"y":0,"opacity":1,"tint":16777215,"scale":{"x":1,"y":0.45714286},"rotation":0,"exts":{},"customProperties":{},"template":"Platform"},{"x":960,"y":0,"opacity":1,"tint":16777215,"scale":{"x":1,"y":0.45714286},"rotation":0,"exts":{},"customProperties":{},"template":"Platform"},{"x":1088,"y":64,"opacity":1,"tint":16777215,"scale":{"x":-0.75,"y":0.78666667},"rotation":0,"exts":{},"customProperties":{"newProperty3":""},"template":"door"},{"x":64,"y":208,"opacity":1,"tint":16777215,"scale":{"x":-0.71794872,"y":0.80733944},"rotation":0,"exts":{},"customProperties":{},"template":"tank-2"},{"x":144,"y":656,"opacity":1,"tint":16777215,"scale":{"x":0.67605634,"y":0.56140351},"rotation":0,"exts":{},"customProperties":{},"template":"manhole"},{"x":1088,"y":288,"opacity":1,"tint":16777215,"scale":{"x":1,"y":1},"rotation":-1.5707963267948966,"exts":{},"customProperties":{},"template":"Platform"},{"x":1088,"y":480,"opacity":1,"tint":16777215,"scale":{"x":1,"y":1},"rotation":-1.5707963267948966,"exts":{},"customProperties":{},"template":"Platform"},{"x":1088,"y":656,"opacity":1,"tint":16777215,"scale":{"x":1,"y":1},"rotation":-1.5707963267948966,"exts":{},"customProperties":{},"template":"Platform"},{"x":784,"y":656,"opacity":1,"tint":16777215,"scale":{"x":0.67605634,"y":0.56140351},"rotation":0,"exts":{},"customProperties":{},"template":"manhole"},{"x":96,"y":64,"opacity":1,"tint":16777215,"scale":{"x":0.67605634,"y":-0.56140351},"rotation":0,"exts":{},"customProperties":{},"template":"manhole"},{"x":816,"y":64,"opacity":1,"tint":16777215,"scale":{"x":0.67605634,"y":-0.56140351},"rotation":0,"exts":{},"customProperties":{},"template":"manhole"},{"x":976,"y":208,"opacity":1,"tint":16777215,"scale":{"x":0.7,"y":0.8},"rotation":0,"exts":{},"customProperties":{},"template":"tank-2"},{"x":272,"y":224,"opacity":1,"tint":16777215,"scale":{"x":1,"y":1},"rotation":0,"exts":{},"customProperties":{},"template":"cat-1"},{"x":176,"y":512,"opacity":1,"tint":16777215,"scale":{"x":0.5026178,"y":1},"rotation":0,"exts":{},"customProperties":{},"template":"Platform"}]'),
    bgs: JSON.parse('[]'),
    tiles: JSON.parse('[{"depth":1,"tiles":[{"texture":"red-neon","frame":0,"x":480,"y":304,"width":444,"height":408,"opacity":1,"rotation":0,"scale":{"x":0.61261261,"y":0.58823529},"tint":16777215}],"extends":{}}]'),
    backgroundColor: '#000000',
    
    onStep() {
        
    },
    onDraw() {
        
    },
    onLeave() {
        
    },
    onCreate() {
        /* room PlatformerNe — core_OnRoomStart (On room start event) */
{
 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }

// Make a room
console.log("options", this.options, roomOptions[this.name]);
// if ( ! this.options) this.options = {symbol:"He"};
let options = roomOptions[this.name];
if ( ! options) {
    options = {symbol:startSymbol};
    platform4symbol[startSymbol] = startPlatform;
    roomOptions[this.name] = options;
    console.log("START at "+options.symbol);
}
assert(options.symbol, options);
this.element = info4symbol[options.symbol];
assert(this.element && this.element.atomic_number, "No element info "+this.element);
assert(this.element.symbol, this.element);
this.atomicNumber = _optionalChain([this, 'access', _ => _.element, 'optionalAccess', _2 => _2.atomic_number]);

// fade the BG
if ( ! _optionalChain([ct, 'access', _3 => _3.room, 'access', _4 => _4.backgrounds, 'optionalAccess', _5 => _5.length])) {
    if ( ! options.bgName) options.bgName = getRandomMember("backdrop wall-1 wall-2 wall-3 wall-4".split(" "));    
    const bg = ct.backgrounds.add(options.bgName);
    bg.alpha = 0.35;
}
// Hack Neon
if (options.symbol === "Ne") {
    let pEmpty = ct.templates.copy("Empty");
    pEmpty.tex = "red-neon";
    pEmpty.x = 350;
    pEmpty.y = 200;
    pEmpty.alpha = 0.5;
   console.log(pEmpty);
}

{
    let p = platform4symbol[options.symbol] || getRandomMember([2,3,4,5]);
    console.log("platform",p);
    let room2 = ct.rooms.merge('Platformer'+p);
    // room2.children.forEach(kid => {
    //     room2.removeChild(kid)
    //     ct.room.addChild(kid);
    // });
    console.log("merged", room2, "ct.room", ct.room, "parent", ct.room.parent);
    // room2.
    // room2.alpha = 1; // huh?
    // ct.stage.
}

// add UI
let roomUI = ct.rooms.append('Room_UI');
// On-screen joystick?
// if (isMobile() || true) {
//     ct.vkeys.joystick({
//         key: 'Vjoy1',
//         tex: 'paper', // TODOTrackPad',
//         trackballTex: 'spit', // TODO
//         depth: 1000,
//         x: 500,
//         y: 500,
//         container: roomUI
//     });
// }

class Layout {
    
    
    
    
    
    
}

/**
 * @returns {Layout}
 */
function layoutRoom(symbol) {
    console.log("layoutRoom", symbol);
    assert(symbol, "no symbol");
    let oldlayout = layout4symbol[symbol];
    if (oldlayout) {
        console.log("use oldlayout for "+symbol, oldlayout);
        return oldlayout;
    }
    console.log("make new layout for "+symbol);
    let layout = new Layout();
    layout.symbol = symbol;
    layout4symbol[symbol] = layout;
    let corners = "NE NW SE SW".split(" "); 
    // match existing doors
    let leftSymbol = getNextElementSymbol(symbol, -1, 0);
    let upSymbol = getNextElementSymbol(symbol, 0, -1);
    if (leftSymbol) {
        let leftLayout = layoutRoom(leftSymbol);
        assert(leftLayout.eExit, "no eExit", leftSymbol, leftLayout);
        layout.wExit = leftLayout.eExit.replace("E","W");
        remove(corners, layout.wExit);
        console.log(symbol, "has leftSymbol", leftSymbol, layout.wExit);
    }
    if (upSymbol) {
        let upLayout = layoutRoom(upSymbol);
        assert(upLayout.sExit, "no sExit in upLayout", upSymbol, upLayout);
        layout.nExit = upLayout.sExit.replace("S","N");
        remove(corners, layout.nExit);
    }
    console.log("back to layout",symbol,"corners left",corners.join(", "));
    // place the tank
    let corner = getRandomMember(corners);
    layout.tank = corner;
    remove(corners, layout.tank);
    // place exits
    assert(corners.length);
    // console.log(symbol,JSON.stringify(corners),JSON.stringify(layout));
    // if ( ! layout.wExit) {
    //     let corner = getRandomMember(corners);
    //     layout.wExit = corner;
    // }
    if ( ! layout.eExit) {
        let eSymbol = getNextElementSymbol(symbol, 1, 0);
        if (eSymbol) {
            let corner = getRandomMember(corners.filter(c => c.includes("E")));
            if ( ! corner) {
                console.warn("Must now overlap for E");
                if (layout.nExit && layout.nExit.endsWith("E")) corner = layout.nExit;
                else corner = "SE";
            }
            layout.eExit = corner;
        }
    }
    // if ( ! layout.nExit) {
    //     let corner = getRandomMember(corners);
    //     layout.nExit = corner;
    // }
    if ( ! layout.sExit) {
        let sSymbol = getNextElementSymbol(symbol, 0, 1);
        if (sSymbol) {
            let corner = getRandomMember(corners.filter(c => c.includes("S")));
            if ( ! corner) {
                console.warn("Must now overlap for S");
                if (layout.eExit && layout.eExit.startsWith("S")) corner = layout.eExit;
                else corner = "SW";
            }
            // assert(corner, "no S corners", corners, symbol+ " to "+sSymbol,"layout",layout);
            layout.sExit = corner;
        } else {
            console.log("no S symbol", symbol, sSymbol);
        }
    }
    if ( ! layout.cat) {
        let corner = getRandomMember(corners);
        layout.cat = corner;
    }
    console.log("layout", symbol, layout);
    return layout;
}

/** use a fn to avoid memory leaks */
function arrangeRoom(room) {
    let roomState = roomOptions[room.name];
    if ( ! roomState) roomState = roomOptions[room.name] = {};
    console.log("arrange", room, "element", room.element, "symbol", room.symbol, "state", roomState);
    assert(room.element.symbol, room);
    const symbol = room.element.symbol;
    let layout = layoutRoom(symbol);
    console.log(symbol, layout);
    let n = room.element.atomic_number % 4;
    console.log("n",n,"element",symbol);
    let doors = getTemplates(room, "door");
    let manholes = getTemplates(room, "manhole");
    let tanks = ct.templates.list['tank-2'].filter(tmp => tmp.getRoom() === room);
    // let cats = ct.templates.list['cat-1'].filter(tmp => tmp.getRoom() === room);
    tanks.forEach(tank => {
        let corner = getCompassCorner(tank);
        if (layout.tank !== corner) {
            console.log("kill tank",corner,"vs layout",layout);
            tank.kill = true;
        }   
    });
    console.log("doors",doors);
    // exists and locks
    manholes.forEach(manhole => {
        let cc = getCompassCorner(manhole);
        if (layout.nExit === cc || layout.sExit === cc) {
            let dy = manhole.y > 200? 1 : -1;
            let nextSymbol = getNextElementSymbol(symbol, 0, dy);
            if ( ! nextSymbol) manhole.kill = true;
            manhole.nextSymbol = nextSymbol;
            if (isUnlocked(symbol, nextSymbol)) {
                manhole.unlocked = true;
            }
        } else {
            manhole.kill = true;
        }
    });
    doors.forEach(door => {
        let cc = getCompassCorner(door);
        if (layout.eExit === cc || layout.wExit === cc) {
            let dx = door.x > 200? 1 : -1;
            let nextSymbol = getNextElementSymbol(symbol, dx, 0);
            door.nextSymbol = nextSymbol;
            if (isUnlocked(symbol, nextSymbol)) {
                door.unlocked = true;
            }
        } else {
            door.kill = true;
        }
    });

    // for(let i=1; i<cats.length; i++) {
    //     cats[i].kill = true;
    // }

    // Place the chimp    
    if (roomState.playerx) {
        let chimp = getTemplates(room, "chimp")[0];
        if (chimp) { // paranoia (maybe the chimp got killed)
            chimp.x = roomState.playerx;
            chimp.y = roomState.playery;
        }
    }
};
arrangeRoom(this);

}

    },
    isUi: false,
    follow: false,
    extends: {}
}
        
ct.rooms.templates['Platformer2'] = {
    name: 'Platformer2',
    group: 'ungrouped',
    width: 1280,
    height: 720,
    objects: JSON.parse('[{"x":768,"y":312,"opacity":1,"tint":16777215,"scale":{"x":0.8,"y":0.8},"rotation":0,"exts":{},"customProperties":{},"template":"Block"},{"x":832,"y":312,"opacity":1,"tint":16777215,"scale":{"x":0.8,"y":0.8},"rotation":0,"exts":{},"customProperties":{},"template":"Block"},{"x":448,"y":312,"opacity":1,"tint":16777215,"scale":{"x":0.8,"y":0.8},"rotation":0,"exts":{},"customProperties":{},"template":"Block"},{"x":384,"y":384,"opacity":1,"tint":16777215,"scale":{"x":1,"y":1},"rotation":0,"exts":{},"customProperties":{},"template":"Block"},{"x":576,"y":640,"opacity":1,"tint":16777215,"scale":{"x":1,"y":1},"rotation":0,"exts":{},"customProperties":{},"template":"Block"},{"x":48,"y":432,"opacity":1,"tint":16777215,"scale":{"x":1,"y":1},"rotation":0,"exts":{},"customProperties":{},"template":"snake-spit"},{"x":632,"y":312,"opacity":1,"tint":16777215,"scale":{"x":1,"y":1},"rotation":0,"exts":{},"customProperties":{},"template":"snake-3"},{"x":448,"y":256,"opacity":1,"tint":16777215,"scale":{"x":1,"y":1},"rotation":0,"exts":{},"customProperties":{},"template":"coin"},{"x":512,"y":256,"opacity":1,"tint":16777215,"scale":{"x":1,"y":1},"rotation":0,"exts":{},"customProperties":{},"template":"coin"},{"x":576,"y":256,"opacity":1,"tint":16777215,"scale":{"x":1,"y":1},"rotation":0,"exts":{},"customProperties":{},"template":"coin"},{"x":640,"y":256,"opacity":1,"tint":16777215,"scale":{"x":1,"y":1},"rotation":0,"exts":{},"customProperties":{},"template":"coin"},{"x":704,"y":256,"opacity":1,"tint":16777215,"scale":{"x":1,"y":1},"rotation":0,"exts":{},"customProperties":{},"template":"coin"},{"x":704,"y":192,"opacity":1,"tint":16777215,"scale":{"x":1,"y":1},"rotation":0,"exts":{},"customProperties":{},"template":"coin"},{"x":640,"y":192,"opacity":1,"tint":16777215,"scale":{"x":1,"y":1},"rotation":0,"exts":{},"customProperties":{},"template":"coin"},{"x":576,"y":192,"opacity":1,"tint":16777215,"scale":{"x":1,"y":1},"rotation":0,"exts":{},"customProperties":{},"template":"coin"},{"x":512,"y":192,"opacity":1,"tint":16777215,"scale":{"x":1,"y":1},"rotation":0,"exts":{},"customProperties":{},"template":"coin"},{"x":448,"y":192,"opacity":1,"tint":16777215,"scale":{"x":1,"y":1},"rotation":0,"exts":{},"customProperties":{},"template":"coin"},{"x":704,"y":576,"opacity":1,"tint":16777215,"scale":{"x":1,"y":1},"rotation":0,"exts":{},"customProperties":{},"template":"coin"},{"x":768,"y":576,"opacity":1,"tint":16777215,"scale":{"x":1,"y":1},"rotation":0,"exts":{},"customProperties":{},"template":"coin"},{"x":832,"y":576,"opacity":1,"tint":16777215,"scale":{"x":1,"y":1},"rotation":0,"exts":{},"customProperties":{},"template":"coin"},{"x":448,"y":704,"opacity":1,"tint":16777215,"scale":{"x":1,"y":1},"rotation":0,"exts":{},"customProperties":{},"template":"Block"},{"x":384,"y":704,"opacity":1,"tint":16777215,"scale":{"x":1,"y":1},"rotation":0,"exts":{},"customProperties":{},"template":"Block"},{"x":384,"y":704,"opacity":1,"tint":16777215,"scale":{"x":1,"y":1},"rotation":0,"exts":{},"customProperties":{},"template":"Block"},{"x":320,"y":704,"opacity":1,"tint":16777215,"scale":{"x":1,"y":1},"rotation":0,"exts":{},"customProperties":{},"template":"Block"},{"x":256,"y":704,"opacity":1,"tint":16777215,"scale":{"x":1,"y":1},"rotation":0,"exts":{},"customProperties":{},"template":"Block"},{"x":512,"y":704,"opacity":1,"tint":16777215,"scale":{"x":1,"y":1},"rotation":0,"exts":{},"customProperties":{},"template":"Block"},{"x":576,"y":704,"opacity":1,"tint":16777215,"scale":{"x":1,"y":1},"rotation":0,"exts":{},"customProperties":{},"template":"Block"},{"x":640,"y":704,"opacity":1,"tint":16777215,"scale":{"x":1,"y":1},"rotation":0,"exts":{},"customProperties":{},"template":"Block"},{"x":512,"y":312,"opacity":1,"tint":16777215,"scale":{"x":1.1,"y":1},"rotation":0,"exts":{},"customProperties":{},"template":"Platform"},{"x":-64,"y":688,"opacity":1,"tint":16777215,"scale":{"x":1,"y":1},"rotation":0,"exts":{},"customProperties":{},"template":"Platform"},{"x":896,"y":288,"opacity":1,"tint":16777215,"scale":{"x":1,"y":1},"rotation":0,"exts":{},"customProperties":{},"template":"Platform"},{"x":896,"y":688,"opacity":1,"tint":16777215,"scale":{"x":1,"y":1},"rotation":0,"exts":{},"customProperties":{},"template":"Platform"},{"x":704,"y":688,"opacity":1,"tint":16777215,"scale":{"x":1,"y":1},"rotation":0,"exts":{},"customProperties":{},"template":"Platform"},{"x":128,"y":688,"opacity":1,"tint":16777215,"scale":{"x":1,"y":1},"rotation":0,"exts":{},"customProperties":{},"template":"Platform"},{"x":0,"y":0,"opacity":1,"tint":16777215,"scale":{"x":1,"y":0.45714286},"rotation":0,"exts":{},"customProperties":{},"template":"Platform"},{"x":0,"y":288,"opacity":1,"tint":16777215,"scale":{"x":1,"y":1},"rotation":0,"exts":{},"customProperties":{},"template":"Platform"},{"x":1104,"y":464,"opacity":1,"tint":16777215,"scale":{"x":-0.75,"y":0.78666667},"rotation":0,"exts":{},"customProperties":{},"template":"door"},{"x":976,"y":608,"opacity":1,"tint":16777215,"scale":{"x":0.71794872,"y":0.80733944},"rotation":0,"exts":{},"customProperties":{},"template":"tank-2"},{"x":-48,"y":464,"opacity":1,"tint":16777215,"scale":{"x":0.75,"y":0.78666667},"rotation":0,"exts":{},"customProperties":{"newProperty1":"","newProperty2":""},"template":"door"},{"x":64,"y":608,"opacity":1,"tint":16777215,"scale":{"x":-0.71794872,"y":0.80733944},"rotation":0,"exts":{},"customProperties":{},"template":"tank-2"},{"x":-48,"y":64,"opacity":1,"tint":16777215,"scale":{"x":0.75,"y":0.78666667},"rotation":0,"exts":{},"customProperties":{"newProperty1":"","newProperty2":""},"template":"door"},{"x":192,"y":0,"opacity":1,"tint":16777215,"scale":{"x":1,"y":0.45714286},"rotation":0,"exts":{},"customProperties":{},"template":"Platform"},{"x":384,"y":0,"opacity":1,"tint":16777215,"scale":{"x":1,"y":0.45714286},"rotation":0,"exts":{},"customProperties":{},"template":"Platform"},{"x":576,"y":0,"opacity":1,"tint":16777215,"scale":{"x":1,"y":0.45714286},"rotation":0,"exts":{},"customProperties":{},"template":"Platform"},{"x":768,"y":0,"opacity":1,"tint":16777215,"scale":{"x":1,"y":0.45714286},"rotation":0,"exts":{},"customProperties":{},"template":"Platform"},{"x":960,"y":0,"opacity":1,"tint":16777215,"scale":{"x":1,"y":0.45714286},"rotation":0,"exts":{},"customProperties":{},"template":"Platform"},{"x":1088,"y":64,"opacity":1,"tint":16777215,"scale":{"x":-0.75,"y":0.78666667},"rotation":0,"exts":{},"customProperties":{"newProperty3":""},"template":"door"},{"x":64,"y":208,"opacity":1,"tint":16777215,"scale":{"x":-0.71794872,"y":0.80733944},"rotation":0,"exts":{},"customProperties":{},"template":"tank-2"},{"x":144,"y":656,"opacity":1,"tint":16777215,"scale":{"x":0.67605634,"y":0.56140351},"rotation":0,"exts":{},"customProperties":{},"template":"manhole"},{"x":1088,"y":288,"opacity":1,"tint":16777215,"scale":{"x":1,"y":1},"rotation":-1.5707963267948966,"exts":{},"customProperties":{},"template":"Platform"},{"x":1088,"y":480,"opacity":1,"tint":16777215,"scale":{"x":1,"y":1},"rotation":-1.5707963267948966,"exts":{},"customProperties":{},"template":"Platform"},{"x":1088,"y":656,"opacity":1,"tint":16777215,"scale":{"x":1,"y":1},"rotation":-1.5707963267948966,"exts":{},"customProperties":{},"template":"Platform"},{"x":784,"y":656,"opacity":1,"tint":16777215,"scale":{"x":0.67605634,"y":0.56140351},"rotation":0,"exts":{},"customProperties":{},"template":"manhole"},{"x":96,"y":64,"opacity":1,"tint":16777215,"scale":{"x":0.67605634,"y":-0.56140351},"rotation":0,"exts":{},"customProperties":{},"template":"manhole"},{"x":816,"y":64,"opacity":1,"tint":16777215,"scale":{"x":0.67605634,"y":-0.56140351},"rotation":0,"exts":{},"customProperties":{},"template":"manhole"},{"x":976,"y":208,"opacity":1,"tint":16777215,"scale":{"x":0.7,"y":0.8},"rotation":0,"exts":{},"customProperties":{},"template":"tank-2"},{"x":272,"y":224,"opacity":1,"tint":16777215,"scale":{"x":1,"y":1},"rotation":0,"exts":{},"customProperties":{},"template":"cat-1"},{"x":176,"y":496,"opacity":1,"tint":16777215,"scale":{"x":0.5026178,"y":1},"rotation":0,"exts":{},"customProperties":{},"template":"Platform"},{"x":0,"y":432,"opacity":1,"tint":16777215,"scale":{"x":0.5026178,"y":1},"rotation":0,"exts":{},"customProperties":{},"template":"Platform"}]'),
    bgs: JSON.parse('[]'),
    tiles: JSON.parse('[{"depth":1,"tiles":[],"extends":{}}]'),
    backgroundColor: '#000000',
    
    onStep() {
        
    },
    onDraw() {
        
    },
    onLeave() {
        
    },
    onCreate() {
        /* room Platformer2 — core_OnRoomStart (On room start event) */
{
 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }

// Make a room
console.log("options", this.options, roomOptions[this.name]);
// if ( ! this.options) this.options = {symbol:"He"};
let options = roomOptions[this.name];
if ( ! options) {
    options = {symbol:startSymbol};
    platform4symbol[startSymbol] = startPlatform;
    roomOptions[this.name] = options;
    console.log("START at "+options.symbol);
}
assert(options.symbol, options);
this.element = info4symbol[options.symbol];
assert(this.element && this.element.atomic_number, "No element info "+this.element);
assert(this.element.symbol, this.element);
this.atomicNumber = _optionalChain([this, 'access', _ => _.element, 'optionalAccess', _2 => _2.atomic_number]);

// fade the BG
if ( ! _optionalChain([ct, 'access', _3 => _3.room, 'access', _4 => _4.backgrounds, 'optionalAccess', _5 => _5.length])) {
    if ( ! options.bgName) options.bgName = getRandomMember("backdrop wall-1 wall-2 wall-3 wall-4".split(" "));    
    const bg = ct.backgrounds.add(options.bgName);
    bg.alpha = 0.35;
}
// Hack Neon
if (options.symbol === "Ne") {
    let pEmpty = ct.templates.copy("Empty");
    pEmpty.tex = "red-neon";
    pEmpty.x = 350;
    pEmpty.y = 200;
    pEmpty.alpha = 0.5;
   console.log(pEmpty);
}

{
    let p = platform4symbol[options.symbol] || getRandomMember([2,3,4,5]);
    console.log("platform",p);
    let room2 = ct.rooms.merge('Platformer'+p);
    // room2.children.forEach(kid => {
    //     room2.removeChild(kid)
    //     ct.room.addChild(kid);
    // });
    console.log("merged", room2, "ct.room", ct.room, "parent", ct.room.parent);
    // room2.
    // room2.alpha = 1; // huh?
    // ct.stage.
}

// add UI
let roomUI = ct.rooms.append('Room_UI');
// On-screen joystick?
// if (isMobile() || true) {
//     ct.vkeys.joystick({
//         key: 'Vjoy1',
//         tex: 'paper', // TODOTrackPad',
//         trackballTex: 'spit', // TODO
//         depth: 1000,
//         x: 500,
//         y: 500,
//         container: roomUI
//     });
// }

class Layout {
    
    
    
    
    
    
}

/**
 * @returns {Layout}
 */
function layoutRoom(symbol) {
    console.log("layoutRoom", symbol);
    assert(symbol, "no symbol");
    let oldlayout = layout4symbol[symbol];
    if (oldlayout) {
        console.log("use oldlayout for "+symbol, oldlayout);
        return oldlayout;
    }
    console.log("make new layout for "+symbol);
    let layout = new Layout();
    layout.symbol = symbol;
    layout4symbol[symbol] = layout;
    let corners = "NE NW SE SW".split(" "); 
    // match existing doors
    let leftSymbol = getNextElementSymbol(symbol, -1, 0);
    let upSymbol = getNextElementSymbol(symbol, 0, -1);
    if (leftSymbol) {
        let leftLayout = layoutRoom(leftSymbol);
        assert(leftLayout.eExit, "no eExit", leftSymbol, leftLayout);
        layout.wExit = leftLayout.eExit.replace("E","W");
        remove(corners, layout.wExit);
        console.log(symbol, "has leftSymbol", leftSymbol, layout.wExit);
    }
    if (upSymbol) {
        let upLayout = layoutRoom(upSymbol);
        assert(upLayout.sExit, "no sExit in upLayout", upSymbol, upLayout);
        layout.nExit = upLayout.sExit.replace("S","N");
        remove(corners, layout.nExit);
    }
    console.log("back to layout",symbol,"corners left",corners.join(", "));
    // place the tank
    let corner = getRandomMember(corners);
    layout.tank = corner;
    remove(corners, layout.tank);
    // place exits
    assert(corners.length);
    // console.log(symbol,JSON.stringify(corners),JSON.stringify(layout));
    // if ( ! layout.wExit) {
    //     let corner = getRandomMember(corners);
    //     layout.wExit = corner;
    // }
    if ( ! layout.eExit) {
        let eSymbol = getNextElementSymbol(symbol, 1, 0);
        if (eSymbol) {
            let corner = getRandomMember(corners.filter(c => c.includes("E")));
            if ( ! corner) {
                console.warn("Must now overlap for E");
                if (layout.nExit && layout.nExit.endsWith("E")) corner = layout.nExit;
                else corner = "SE";
            }
            layout.eExit = corner;
        }
    }
    // if ( ! layout.nExit) {
    //     let corner = getRandomMember(corners);
    //     layout.nExit = corner;
    // }
    if ( ! layout.sExit) {
        let sSymbol = getNextElementSymbol(symbol, 0, 1);
        if (sSymbol) {
            let corner = getRandomMember(corners.filter(c => c.includes("S")));
            if ( ! corner) {
                console.warn("Must now overlap for S");
                if (layout.eExit && layout.eExit.startsWith("S")) corner = layout.eExit;
                else corner = "SW";
            }
            // assert(corner, "no S corners", corners, symbol+ " to "+sSymbol,"layout",layout);
            layout.sExit = corner;
        } else {
            console.log("no S symbol", symbol, sSymbol);
        }
    }
    if ( ! layout.cat) {
        let corner = getRandomMember(corners);
        layout.cat = corner;
    }
    console.log("layout", symbol, layout);
    return layout;
}

/** use a fn to avoid memory leaks */
function arrangeRoom(room) {
    let roomState = roomOptions[room.name];
    if ( ! roomState) roomState = roomOptions[room.name] = {};
    console.log("arrange", room, "element", room.element, "symbol", room.symbol, "state", roomState);
    assert(room.element.symbol, room);
    const symbol = room.element.symbol;
    let layout = layoutRoom(symbol);
    console.log(symbol, layout);
    let n = room.element.atomic_number % 4;
    console.log("n",n,"element",symbol);
    let doors = getTemplates(room, "door");
    let manholes = getTemplates(room, "manhole");
    let tanks = ct.templates.list['tank-2'].filter(tmp => tmp.getRoom() === room);
    // let cats = ct.templates.list['cat-1'].filter(tmp => tmp.getRoom() === room);
    tanks.forEach(tank => {
        let corner = getCompassCorner(tank);
        if (layout.tank !== corner) {
            console.log("kill tank",corner,"vs layout",layout);
            tank.kill = true;
        }   
    });
    console.log("doors",doors);
    // exists and locks
    manholes.forEach(manhole => {
        let cc = getCompassCorner(manhole);
        if (layout.nExit === cc || layout.sExit === cc) {
            let dy = manhole.y > 200? 1 : -1;
            let nextSymbol = getNextElementSymbol(symbol, 0, dy);
            if ( ! nextSymbol) manhole.kill = true;
            manhole.nextSymbol = nextSymbol;
            if (isUnlocked(symbol, nextSymbol)) {
                manhole.unlocked = true;
            }
        } else {
            manhole.kill = true;
        }
    });
    doors.forEach(door => {
        let cc = getCompassCorner(door);
        if (layout.eExit === cc || layout.wExit === cc) {
            let dx = door.x > 200? 1 : -1;
            let nextSymbol = getNextElementSymbol(symbol, dx, 0);
            door.nextSymbol = nextSymbol;
            if (isUnlocked(symbol, nextSymbol)) {
                door.unlocked = true;
            }
        } else {
            door.kill = true;
        }
    });

    // for(let i=1; i<cats.length; i++) {
    //     cats[i].kill = true;
    // }

    // Place the chimp    
    if (roomState.playerx) {
        let chimp = getTemplates(room, "chimp")[0];
        if (chimp) { // paranoia (maybe the chimp got killed)
            chimp.x = roomState.playerx;
            chimp.y = roomState.playery;
        }
    }
};
arrangeRoom(this);

}

    },
    isUi: false,
    follow: false,
    extends: {}
}
        
ct.rooms.templates.CTTRANSITIONEMPTYROOM = {
    name: 'CTTRANSITIONEMPTYROOM',
    width: 1024,
    height: 1024,
    objects: [],
    bgs: [],
    tiles: [],
    onStep() {
        void 0;
    },
    onDraw() {
        void 0;
    },
    onLeave() {
        void 0;
    },
    onCreate() {
        void 0;
    }
};


/**
 * @namespace
 */
ct.styles = {
    types: { },
    /**
     * Creates a new style with a given name.
     * Technically, it just writes `data` to `ct.styles.types`
     */
    new(name, styleTemplate) {
        ct.styles.types[name] = styleTemplate;
        return styleTemplate;
    },
    /**
     * Returns a style of a given name. The actual behavior strongly depends on `copy` parameter.
     * @param {string} name The name of the style to load
     * @param {boolean|Object} [copy] If not set, returns the source style object.
     * Editing it will affect all new style calls.
     * When set to `true`, will create a new object, which you can safely modify
     * without affecting the source style.
     * When set to an object, this will create a new object as well,
     * augmenting it with given properties.
     * @returns {object} The resulting style
     */
    get(name, copy) {
        if (copy === true) {
            return ct.u.ext({}, ct.styles.types[name]);
        }
        if (copy) {
            return ct.u.ext(ct.u.ext({}, ct.styles.types[name]), copy);
        }
        return ct.styles.types[name];
    }
};

ct.styles.new(
    "Style_Score",
    {
    "fontFamily": "serif",
    "fontSize": 32,
    "fontStyle": "normal",
    "fontWeight": 400,
    "lineJoin": "round",
    "lineHeight": 43.2,
    "fill": "#F6C453",
    "strokeThickness": 2,
    "stroke": "#000000"
});

ct.styles.new(
    "Style_BodyText",
    {
    "fontFamily": "serif",
    "fontSize": 24,
    "fontStyle": "normal",
    "fontWeight": 400,
    "lineJoin": "round",
    "lineHeight": 32.400000000000006,
    "wordWrap": true,
    "wordWrapWidth": 300
});

ct.styles.new(
    "Style_InfoBar",
    {
    "fontFamily": "serif",
    "fontSize": 32,
    "fontStyle": "normal",
    "fontWeight": 400,
    "lineJoin": "round",
    "lineHeight": 43.2,
    "fill": "#FFFFFF"
});

ct.styles.new(
    "Style_Tooltip",
    {
    "fontFamily": "sans-serif",
    "fontSize": 16,
    "fontStyle": "normal",
    "fontWeight": 400,
    "lineJoin": "round",
    "lineHeight": 21.6,
    "wordWrap": true,
    "wordWrapWidth": 250,
    "fill": "#000000",
    "strokeThickness": 1,
    "stroke": "#FFFFFF",
    "dropShadow": true,
    "dropShadowBlur": 5,
    "dropShadowColor": "#CCCCCC",
    "dropShadowAngle": 0,
    "dropShadowDistance": 0
});

ct.styles.new(
    "Style_CodeOff",
    {
    "fontFamily": "sans-serif",
    "fontSize": 24,
    "fontStyle": "normal",
    "fontWeight": 400,
    "lineJoin": "round",
    "lineHeight": 32.400000000000006
});

ct.styles.new(
    "Style_5Rk63W",
    {
    "fontFamily": "sans-serif",
    "fontSize": 12,
    "fontStyle": "normal",
    "fontWeight": 400,
    "lineJoin": "round",
    "lineHeight": 16.200000000000003
});

ct.styles.new(
    "Style_CodeOn",
    {
    "fontFamily": "serif",
    "fontSize": 32,
    "fontStyle": "normal",
    "fontWeight": 400,
    "lineJoin": "round",
    "lineHeight": 43.2,
    "fill": "#00CC00"
});



/**
 * @typedef ISimplePoint
 * @property {number} x
 * @property {number} y
 */

/**
 * @typedef ITandemSettings
 *
 * @property {ISimplePoint} [scale] Optional scaling object with `x` and `y` parameters.
 * @property {ISimplePoint} [position] Set this to additionally shift the emitter tandem relative
 * to the copy it was attached to, or relative to the copy it follows.
 * @property {number} [prewarmDelay] Optional; if less than 0, it will prewarm the emitter tandem,
 * meaning that it will simulate a given number of seconds before
 * showing particles in the world. If greater than 0, will postpone
 * the effect for the specified number of seconds.
 * @property {number} [tint] Optional tint to the whole effect.
 * @property {number} [alpha] Optional opacity set to the whole effect.
 * @property {number} [rotation] Optional rotation in radians.
 * @property {number} [angle] Optional rotation in degrees.
 * @property {boolean} [isUi] If set to true, will use the time scale of UI layers. This affects
 * how an effect is simulated during slowmo effects and game pause.
 * @property {number} [depth] The depth of the tandem. Defaults to Infinity
 * (will overlay everything).
 * @property {Room} [room] The room to attach the effect to.
 * Defaults to the current main room (ct.room); has no effect if attached to a copy.
 */

/**
 * A class for displaying and managing a collection of particle emitters.
 *
 * @property {boolean} frozen If set to true, the tandem will stop updating its emitters
 * @property {Copy|DisplayObject} follow A copy to follow
 * @extends PIXI.Container
 */
class EmitterTandem extends PIXI.Container {
    /**
     * Creates a new emitter tandem. This method should not be called directly;
     * better use the methods of `ct.emitters`.
     * @param {object} tandemData The template object of the tandem, as it was exported from ct.IDE.
     * @param {ITandemSettings} opts Additional settings applied to the tandem
     * @constructor
     */
    constructor(tandemData, opts) {
        super();
        this.emitters = [];
        this.delayed = [];

        for (const emt of tandemData) {
            const inst = new PIXI.particles.Emitter(
                this,
                ct.res.getTexture(emt.texture),
                emt.settings
            );
            const d = emt.settings.delay + opts.prewarmDelay;
            if (d > 0) {
                inst.emit = false;
                this.delayed.push({
                    value: d,
                    emitter: inst
                });
            } else if (d < 0) {
                inst.emit = true;
                inst.update(-d);
            } else {
                inst.emit = true;
            }
            inst.initialDeltaPos = {
                x: emt.settings.pos.x,
                y: emt.settings.pos.y
            };
            this.emitters.push(inst);
            inst.playOnce(() => {
                this.emitters.splice(this.emitters.indexOf(inst), 1);
            });
        }
        this.isUi = opts.isUi;
        this.scale.x = opts.scale.x;
        this.scale.y = opts.scale.y;
        if (opts.rotation) {
            this.rotation = opts.rotation;
        } else if (opts.angle) {
            this.angle = opts.angle;
        }
        this.deltaPosition = opts.position;
        this.depth = opts.depth;
        this.frozen = false;

        if (this.isUi) {
            ct.emitters.uiTandems.push(this);
        } else {
            ct.emitters.tandems.push(this);
        }
    }
    /**
     * A method for internal use; advances the particle simulation further
     * according to either a UI ticker or ct.delta.
     * @returns {void}
     */
    update() {
        if (this.stopped) {
            for (const emitter of this.emitters) {
                if (!emitter.particleCount) {
                    this.emitters.splice(this.emitters.indexOf(emitter), 1);
                }
            }
        }
        // eslint-disable-next-line no-underscore-dangle
        if ((this.appendant && this.appendant._destroyed) || this.kill || !this.emitters.length) {
            this.emit('done');
            if (this.isUi) {
                ct.emitters.uiTandems.splice(ct.emitters.uiTandems.indexOf(this), 1);
            } else {
                ct.emitters.tandems.splice(ct.emitters.tandems.indexOf(this), 1);
            }
            this.destroy();
            return;
        }
        if (this.frozen) {
            return;
        }
        const s = (this.isUi ? PIXI.Ticker.shared.elapsedMS : PIXI.Ticker.shared.deltaMS) / 1000;
        for (const delayed of this.delayed) {
            delayed.value -= s;
            if (delayed.value <= 0) {
                delayed.emitter.emit = true;
                this.delayed.splice(this.delayed.indexOf(delayed), 1);
            }
        }
        for (const emt of this.emitters) {
            if (this.delayed.find(delayed => delayed.emitter === emt)) {
                continue;
            }
            emt.update(s);
        }
        if (this.follow) {
            this.updateFollow();
        }
    }
    /**
     * Stops spawning new particles, then destroys itself.
     * Can be fired only once, otherwise it will log a warning.
     * @returns {void}
     */
    stop() {
        if (this.stopped) {
            // eslint-disable-next-line no-console
            console.trace('[ct.emitters] An attempt to stop an already stopped emitter tandem. Continuing…');
            return;
        }
        this.stopped = true;
        for (const emt of this.emitters) {
            emt.emit = false;
        }
        this.delayed = [];
    }
    /**
     * Stops spawning new particles, but continues simulation and allows to resume the effect later
     * with `emitter.resume();`
     * @returns {void}
     */
    pause() {
        for (const emt of this.emitters) {
            if (emt.maxParticles !== 0) {
                emt.oldMaxParticles = emt.maxParticles;
                emt.maxParticles = 0;
            }
        }
    }
    /**
     * Resumes previously paused effect.
     * @returns {void}
     */
    resume() {
        for (const emt of this.emitters) {
            emt.maxParticles = emt.oldMaxParticles || emt.maxParticles;
        }
    }
    /**
     * Removes all the particles from the tandem, but continues spawning new ones.
     * @returns {void}
     */
    clear() {
        for (const emt of this.emitters) {
            emt.cleanup();
        }
    }

    updateFollow() {
        if (!this.follow) {
            return;
        }
        if (this.follow.kill || !this.follow.scale) {
            this.follow = null;
            this.stop();
            return;
        }
        const delta = ct.u.rotate(
            this.deltaPosition.x * this.follow.scale.x,
            this.deltaPosition.y * this.follow.scale.y,
            this.follow.angle
        );
        for (const emitter of this.emitters) {
            emitter.updateOwnerPos(this.follow.x + delta.x, this.follow.y + delta.y);
            const ownDelta = ct.u.rotate(
                emitter.initialDeltaPos.x * this.follow.scale.x,
                emitter.initialDeltaPos.y * this.follow.scale.y,
                this.follow.angle
            );
            emitter.updateSpawnPos(ownDelta.x, ownDelta.y);
        }
    }
}

(function emittersAddon() {
    const defaultSettings = {
        prewarmDelay: 0,
        scale: {
            x: 1,
            y: 1
        },
        tint: 0xffffff,
        alpha: 1,
        position: {
            x: 0,
            y: 0
        },
        isUi: false,
        depth: Infinity
    };

    /**
     * @namespace
     */
    ct.emitters = {
        /**
         * A map of existing emitter templates.
         * @type Array<object>
         */
        templates: [{
    "Tandem_Sparks": [
        {
            "texture": "spark-1",
            "settings": {
                "alpha": {
                    "list": [
                        {
                            "value": 0,
                            "time": 0
                        },
                        {
                            "value": 1,
                            "time": 0.5
                        },
                        {
                            "value": 0,
                            "time": 1
                        }
                    ],
                    "isStepped": false
                },
                "scale": {
                    "list": [
                        {
                            "value": 1,
                            "time": 0
                        },
                        {
                            "value": 0.3,
                            "time": 1
                        }
                    ],
                    "isStepped": false
                },
                "color": {
                    "list": [
                        {
                            "value": "ffffff",
                            "time": 0
                        },
                        {
                            "value": "ffffff",
                            "time": 0.5
                        },
                        {
                            "value": "ffffff",
                            "time": 1
                        }
                    ],
                    "isStepped": false
                },
                "blendMode": "normal",
                "speed": {
                    "list": [
                        {
                            "value": 500,
                            "time": 0
                        },
                        {
                            "value": 100,
                            "time": 1
                        }
                    ],
                    "isStepped": false
                },
                "startRotation": {
                    "min": 0,
                    "max": 360
                },
                "rotationSpeed": {
                    "min": 0,
                    "max": 90
                },
                "rotationAcceleration": 0,
                "lifetime": {
                    "min": 0.5,
                    "max": 0.5
                },
                "frequency": 0.008,
                "spawnChance": 1,
                "particlesPerWave": -1,
                "angleStart": 270,
                "emitterLifetime": 0.5,
                "maxParticles": 50,
                "maxSpeed": 0,
                "pos": {
                    "x": 0,
                    "y": 0
                },
                "acceleration": {
                    "x": 0,
                    "y": 1000
                },
                "addAtBack": false,
                "spawnType": "point",
                "spawnCircle": {
                    "x": 0,
                    "y": 0,
                    "r": 200,
                    "minR": 100
                },
                "delay": 0,
                "particleSpacing": 360,
                "spawnRect": {
                    "x": -150,
                    "y": -150,
                    "w": 300,
                    "h": 300
                }
            }
        }
    ],
    "SmokeFX": [
        {
            "texture": "blackSmoke00",
            "settings": {
                "alpha": {
                    "list": [
                        {
                            "value": 0,
                            "time": 0
                        },
                        {
                            "value": 1,
                            "time": 0.5
                        },
                        {
                            "value": 0,
                            "time": 1
                        }
                    ],
                    "isStepped": false
                },
                "scale": {
                    "list": [
                        {
                            "value": 0.27,
                            "time": 0
                        },
                        {
                            "value": 0.15,
                            "time": 1
                        }
                    ],
                    "isStepped": false
                },
                "color": {
                    "list": [
                        {
                            "value": "ffffff",
                            "time": 0
                        },
                        {
                            "value": "ffffff",
                            "time": 0.5
                        },
                        {
                            "value": "ffffff",
                            "time": 1
                        }
                    ],
                    "isStepped": false
                },
                "blendMode": "normal",
                "speed": {
                    "list": [
                        {
                            "value": 300,
                            "time": 0
                        },
                        {
                            "value": 100,
                            "time": 1
                        }
                    ],
                    "isStepped": false
                },
                "startRotation": {
                    "min": 0,
                    "max": 360
                },
                "rotationSpeed": {
                    "min": 0,
                    "max": 0
                },
                "rotationAcceleration": 0,
                "lifetime": {
                    "min": 0.5,
                    "max": 1
                },
                "frequency": 0.1,
                "spawnChance": 0.85,
                "particlesPerWave": 1,
                "angleStart": 270,
                "emitterLifetime": 0,
                "maxParticles": 20,
                "maxSpeed": 0,
                "pos": {
                    "x": 0,
                    "y": 0
                },
                "acceleration": {
                    "x": 0,
                    "y": -448
                },
                "addAtBack": false,
                "spawnType": "circle",
                "spawnCircle": {
                    "x": 0,
                    "y": 0,
                    "r": 32
                },
                "delay": 0,
                "minimumScaleMultiplier": 0.29,
                "minimumSpeedMultiplier": 0.2
            }
        }
    ]
}][0] || {},
        /**
         * A list of all the emitters that are simulated in UI time scale.
         * @type Array<EmitterTandem>
         */
        uiTandems: [],
        /**
         * A list of all the emitters that are simulated in a regular game loop.
         * @type Array<EmitterTandem>
         */
        tandems: [],
        /**
         * Creates a new emitter tandem in the world at the given position.
         * @param {string} name The name of the tandem template, as it was named in ct.IDE.
         * @param {number} x The x coordinate of the new tandem.
         * @param {number} y The y coordinate of the new tandem.
         * @param {ITandemSettings} [settings] Additional configs for the created tandem.
         * @return {EmitterTandem} The newly created tandem.
         */
        fire(name, x, y, settings) {
            if (!(name in ct.emitters.templates)) {
                throw new Error(`[ct.emitters] An attempt to create a non-existent emitter ${name}.`);
            }
            const opts = Object.assign({}, defaultSettings, settings);
            const tandem = new EmitterTandem(ct.emitters.templates[name], opts);
            tandem.x = x;
            tandem.y = y;
            if (!opts.room) {
                ct.room.addChild(tandem);
                tandem.isUi = ct.room.isUi;
            } else {
                opts.room.addChild(tandem);
                tandem.isUi = opts.room.isUi;
            }
            return tandem;
        },
        /**
         * Creates a new emitter tandem and attaches it to the given copy
         * (or to any other DisplayObject).
         * @param {Copy|PIXI.DisplayObject} parent The parent of the created tandem.
         * @param {string} name The name of the tandem template.
         * @param {ITandemSettings} [settings] Additional options for the created tandem.
         * @returns {EmitterTandem} The newly created emitter tandem.
         */
        append(parent, name, settings) {
            if (!(name in ct.emitters.templates)) {
                throw new Error(`[ct.emitters] An attempt to create a non-existent emitter ${name}.`);
            }
            const opts = Object.assign({}, defaultSettings, settings);
            const tandem = new EmitterTandem(ct.emitters.templates[name], opts);
            if (opts.position) {
                tandem.x = opts.position.x;
                tandem.y = opts.position.y;
            }
            tandem.appendant = parent;
            parent.addChild(tandem);
            return tandem;
        },
        /**
         * Creates a new emitter tandem in the world, and configs it so it will follow a given copy.
         * This includes handling position, scale, and rotation.
         * @param {Copy|PIXI.DisplayObject} parent The copy to follow.
         * @param {string} name The name of the tandem template.
         * @param {ITandemSettings} [settings] Additional options for the created tandem.
         * @returns {EmitterTandem} The newly created emitter tandem.
         */
        follow(parent, name, settings) {
            if (!(name in ct.emitters.templates)) {
                throw new Error(`[ct.emitters] An attempt to create a non-existent emitter ${name}.`);
            }
            const opts = Object.assign({}, defaultSettings, settings);
            const tandem = new EmitterTandem(ct.emitters.templates[name], opts);
            tandem.follow = parent;
            tandem.updateFollow();
            if (!('getRoom' in parent)) {
                ct.room.addChild(tandem);
            } else {
                parent.getRoom().addChild(tandem);
            }
            return tandem;
        }
    };

    PIXI.Ticker.shared.add(() => {
        for (const tandem of ct.emitters.uiTandems) {
            tandem.update();
        }
        for (const tandem of ct.emitters.tandems) {
            tandem.update();
        }
    });
})();
/**
 * @extends {PIXI.AnimatedSprite}
 * @class
 * @property {string} template The name of the template from which the copy was created
 * @property {IShapeTemplate} shape The collision shape of a copy
 * @property {number} depth The relative position of a copy in a drawing stack.
 * Higher values will draw the copy on top of those with lower ones
 * @property {number} xprev The horizontal location of a copy in the previous frame
 * @property {number} yprev The vertical location of a copy in the previous frame
 * @property {number} xstart The starting location of a copy,
 * meaning the point where it was created — either by placing it in a room with ct.IDE
 * or by calling `ct.templates.copy`.
 * @property {number} ystart The starting location of a copy,
 * meaning the point where it was created — either by placing it in a room with ct.IDE
 * or by calling `ct.templates.copy`.
 * @property {number} hspeed The horizontal speed of a copy
 * @property {number} vspeed The vertical speed of a copy
 * @property {number} gravity The acceleration that pulls a copy at each frame
 * @property {number} gravityDir The direction of acceleration that pulls a copy at each frame
 * @property {number} depth The position of a copy in draw calls
 * @property {boolean} kill If set to `true`, the copy will be destroyed by the end of a frame.
 * @property {number} timer1 Time for the next run of the 1st timer, in seconds.
 * @property {number} timer2 Time for the next run of the 2nd timer, in seconds.
 * @property {number} timer3 Time for the next run of the 3rd timer, in seconds.
 * @property {number} timer4 Time for the next run of the 4th timer, in seconds.
 * @property {number} timer5 Time for the next run of the 5th timer, in seconds.
 * @property {number} timer6 Time for the next run of the 6th timer, in seconds.
 */
const Copy = (function Copy() {
    const textureAccessor = Symbol('texture');
    const zeroDirectionAccessor = Symbol('zeroDirection');
    const hspeedAccessor = Symbol('hspeed');
    const vspeedAccessor = Symbol('vspeed');
    let uid = 0;
    class Copy extends PIXI.AnimatedSprite {
        /**
         * Creates an instance of Copy.
         * @param {string} template The name of the template to copy
         * @param {number} [x] The x coordinate of a new copy. Defaults to 0.
         * @param {number} [y] The y coordinate of a new copy. Defaults to 0.
         * @param {object} [exts] An optional object with additional properties
         * that will exist prior to a copy's OnCreate event
         * @param {PIXI.DisplayObject|Room} [container] A container to set as copy's parent
         * before its OnCreate event. Defaults to ct.room.
         * @memberof Copy
         */
        // eslint-disable-next-line complexity, max-lines-per-function
        constructor(template, x, y, exts, container) {
            container = container || ct.room;
            var t;
            if (template) {
                if (!(template in ct.templates.templates)) {
                    throw new Error(`[ct.templates] An attempt to create a copy of a non-existent template \`${template}\` detected. A typo?`);
                }
                t = ct.templates.templates[template];
                if (t.texture && t.texture !== '-1') {
                    const textures = ct.res.getTexture(t.texture);
                    super(textures);
                    this[textureAccessor] = t.texture;
                    this.anchor.x = textures[0].defaultAnchor.x;
                    this.anchor.y = textures[0].defaultAnchor.y;
                } else {
                    const emptyRect = new PIXI.Rectangle(0, 0, t.width || 1, t.height || 1);
                    super([new PIXI.Texture(PIXI.Texture.EMPTY, emptyRect)]);
                    this.anchor.x = t.anchorX || 0;
                    this.anchor.y = t.anchorY || 0;
                }
                this.template = template;
                this.parent = container;
                this.blendMode = t.blendMode || PIXI.BLEND_MODES.NORMAL;
                this.loop = t.loopAnimation;
                this.animationSpeed = t.animationFPS / 60;
                if (t.visible === false) { // ignore nullish values
                    this.visible = false;
                }
                if (t.playAnimationOnStart) {
                    this.play();
                }
                if (t.extends) {
                    ct.u.ext(this, t.extends);
                }
            } else {
                super([PIXI.Texture.EMPTY]);
            }
            const oldScale = this.scale;
            Object.defineProperty(this, 'scale', {
                get: () => oldScale,
                set: value => {
                    this.scale.x = this.scale.y = Number(value);
                }
            });
            // it is defined in main.js
            // eslint-disable-next-line no-undef
            this[copyTypeSymbol] = true;
            this.position.set(x || 0, y || 0);
            this.xprev = this.xstart = this.x;
            this.yprev = this.ystart = this.y;
            this[hspeedAccessor] = 0;
            this[vspeedAccessor] = 0;
            this[zeroDirectionAccessor] = 0;
            this.speed = this.direction = this.gravity = 0;
            this.gravityDir = 90;
            this.depth = 0;
            this.timer1 = this.timer2 = this.timer3 = this.timer4 = this.timer5 = this.timer6 = 0;
            if (exts) {
                ct.u.ext(this, exts);
                if (exts.scaleX) {
                    this.scale.x = exts.scaleX;
                }
                if (exts.scaleY) {
                    this.scale.y = exts.scaleY;
                }
            }
            this.uid = ++uid;
            if (template) {
                ct.u.ext(this, {
                    template,
                    depth: t.depth,
                    onStep: t.onStep,
                    onDraw: t.onDraw,
                    onCreate: t.onCreate,
                    onDestroy: t.onDestroy
                });
                if (exts && exts.tex !== void 0) {
                    this.shape = ct.res.getTextureShape(exts.tex || -1, t);
                } else {
                    this.shape = ct.res.getTextureShape(t.texture || -1, t);
                }
                if (exts && exts.depth !== void 0) {
                    this.depth = exts.depth;
                }
                if (ct.templates.list[template]) {
                    ct.templates.list[template].push(this);
                } else {
                    ct.templates.list[template] = [this];
                }
                this.onBeforeCreateModifier();
                ct.templates.templates[template].onCreate.apply(this);
            }
            return this;
        }

        /**
         * The name of the current copy's texture, or -1 for an empty texture.
         * @param {string} value The name of the new texture
         * @type {(string|number)}
         */
        set tex(value) {
            if (this[textureAccessor] === value) {
                return value;
            }
            var {playing} = this;
            this.textures = ct.res.getTexture(value);
            this[textureAccessor] = value;
            this.shape = ct.res.getTextureShape(value);
            this.anchor.x = this.textures[0].defaultAnchor.x;
            this.anchor.y = this.textures[0].defaultAnchor.y;
            if (playing) {
                this.play();
            }
            return value;
        }
        get tex() {
            return this[textureAccessor];
        }

        get speed() {
            return Math.hypot(this.hspeed, this.vspeed);
        }
        /**
         * The speed of a copy that is used in `this.move()` calls
         * @param {number} value The new speed value
         * @type {number}
         */
        set speed(value) {
            if (value === 0) {
                this[zeroDirectionAccessor] = this.direction;
                this.hspeed = this.vspeed = 0;
                return;
            }
            if (this.speed === 0) {
                const restoredDir = this[zeroDirectionAccessor];
                this[hspeedAccessor] = value * Math.cos(restoredDir * Math.PI / 180);
                this[vspeedAccessor] = value * Math.sin(restoredDir * Math.PI / 180);
                return;
            }
            var multiplier = value / this.speed;
            this.hspeed *= multiplier;
            this.vspeed *= multiplier;
        }
        get hspeed() {
            return this[hspeedAccessor];
        }
        set hspeed(value) {
            if (this.vspeed === 0 && value === 0) {
                this[zeroDirectionAccessor] = this.direction;
            }
            this[hspeedAccessor] = value;
            return value;
        }
        get vspeed() {
            return this[vspeedAccessor];
        }
        set vspeed(value) {
            if (this.hspeed === 0 && value === 0) {
                this[zeroDirectionAccessor] = this.direction;
            }
            this[vspeedAccessor] = value;
            return value;
        }
        get direction() {
            if (this.speed === 0) {
                return this[zeroDirectionAccessor];
            }
            return (Math.atan2(this.vspeed, this.hspeed) * 180 / Math.PI + 360) % 360;
        }
        /**
         * The moving direction of the copy, in degrees, starting with 0 at the right side
         * and going with 90 facing upwards, 180 facing left, 270 facing down.
         * This parameter is used by `this.move()` call.
         * @param {number} value New direction
         * @type {number}
         */
        set direction(value) {
            this[zeroDirectionAccessor] = value;
            if (this.speed > 0) {
                var speed = this.speed;
                this.hspeed = speed * Math.cos(value * Math.PI / 180);
                this.vspeed = speed * Math.sin(value * Math.PI / 180);
            }
            return value;
        }

        /**
         * Performs a movement step, reading such parameters as `gravity`, `speed`, `direction`.
         * @returns {void}
         */
        move() {
            if (this.gravity) {
                this.hspeed += this.gravity * ct.delta * Math.cos(this.gravityDir * Math.PI / 180);
                this.vspeed += this.gravity * ct.delta * Math.sin(this.gravityDir * Math.PI / 180);
            }
            this.x += this.hspeed * ct.delta;
            this.y += this.vspeed * ct.delta;
        }
        /**
         * Adds a speed vector to the copy, accelerating it by a given delta speed
         * in a given direction.
         * @param {number} spd Additive speed
         * @param {number} dir The direction in which to apply additional speed
         * @returns {void}
         */
        addSpeed(spd, dir) {
            this.hspeed += spd * Math.cos(dir * Math.PI / 180);
            this.vspeed += spd * Math.sin(dir * Math.PI / 180);
        }

        /**
         * Returns the room that owns the current copy
         * @returns {Room} The room that owns the current copy
         */
        getRoom() {
            let parent = this.parent;
            while (!(parent instanceof Room)) {
                parent = parent.parent;
            }
            return parent;
        }

        // eslint-disable-next-line class-methods-use-this
        onBeforeCreateModifier() {
            // Filled by ct.IDE and catmods
            if ((this instanceof ct.templates.Copy) && this.inheritedTemplate) {
    this.inherit = {
        onCreate: () => {
            const oldTemplate = this.template,
                  oldInherited = this.inheritedTemplate;
            this.template = this.inheritedTemplate;
            this.inheritedTemplate = ct.templates.templates[this.inheritedTemplate].extends.inheritedTemplate;
            ct.templates.templates[oldInherited].onCreate.apply(this);
            this.template = oldTemplate;
            this.inheritedTemplate = oldInherited;
        },
        onStep: () => {
            const oldTemplate = this.template,
                  oldInherited = this.inheritedTemplate;
            this.template = this.inheritedTemplate;
            this.inheritedTemplate = ct.templates.templates[this.inheritedTemplate].extends.inheritedTemplate;
            ct.templates.templates[oldInherited].onStep.apply(this);
            this.template = oldTemplate;
            this.inheritedTemplate = oldInherited;
        },
        onDraw: () => {
            const oldTemplate = this.template,
                  oldInherited = this.inheritedTemplate;
            this.template = this.inheritedTemplate;
            this.inheritedTemplate = ct.templates.templates[this.inheritedTemplate].extends.inheritedTemplate;
            ct.templates.templates[oldInherited].onDraw.apply(this);
            this.template = oldTemplate;
            this.inheritedTemplate = oldInherited;
        },
        onDestroy: () => {
            const oldTemplate = this.template,
                  oldInherited = this.inheritedTemplate;
            this.template = this.inheritedTemplate;
            this.inheritedTemplate = ct.templates.templates[this.inheritedTemplate].extends.inheritedTemplate;
            ct.templates.templates[oldInherited].onDestroy.apply(this);
            this.template = oldTemplate;
            this.inheritedTemplate = oldInherited;
        }
    };
}

        }
    }
    return Copy;
})();

(function ctTemplateAddon(ct) {
    const onCreateModifier = function () {
        this.$chashes = ct.place.getHashes(this);
for (const hash of this.$chashes) {
    if (!(hash in ct.place.grid)) {
        ct.place.grid[hash] = [this];
    } else {
        ct.place.grid[hash].push(this);
    }
}
if ([false][0] && this instanceof ct.templates.Copy) {
    this.$cDebugText = new PIXI.Text('Not initialized', {
        fill: 0xffffff,
        dropShadow: true,
        dropShadowDistance: 2,
        fontSize: [16][0] || 16
    });
    this.$cDebugCollision = new PIXI.Graphics();
    this.addChild(this.$cDebugCollision, this.$cDebugText);
}

    };

    /**
     * An object with properties and methods for manipulating templates and copies,
     * mainly for finding particular copies and creating new ones.
     * @namespace
     */
    ct.templates = {
        Copy,
        /**
         * An object that contains arrays of copies of all templates.
         * @type {Object.<string,Array<Copy>>}
         */
        list: {
            BACKGROUND: [],
            TILEMAP: []
        },
        /**
         * A map of all the templates of templates exported from ct.IDE.
         * @type {object}
         */
        templates: { },
        /**
         * Creates a new copy of a given template inside a specific room.
         * @param {string} template The name of the template to use
         * @param {number} [x] The x coordinate of a new copy. Defaults to 0.
         * @param {number} [y] The y coordinate of a new copy. Defaults to 0.
         * @param {Room} [room] The room to which add the copy.
         * Defaults to the current room.
         * @param {object} [exts] An optional object which parameters will be applied
         * to the copy prior to its OnCreate event.
         * @returns {Copy} the created copy.
         */
        copyIntoRoom(template, x = 0, y = 0, room, exts) {
            // An advanced constructor. Returns a Copy
            if (!room || !(room instanceof Room)) {
                throw new Error(`Attempt to spawn a copy of template ${template} inside an invalid room. Room's value provided: ${room}`);
            }
            const obj = new Copy(template, x, y, exts);
            room.addChild(obj);
            ct.stack.push(obj);
            onCreateModifier.apply(obj);
            return obj;
        },
        /**
         * Creates a new copy of a given template inside the current root room.
         * A shorthand for `ct.templates.copyIntoRoom(template, x, y, ct.room, exts)`
         * @param {string} template The name of the template to use
         * @param {number} [x] The x coordinate of a new copy. Defaults to 0.
         * @param {number} [y] The y coordinate of a new copy. Defaults to 0.
         * @param {object} [exts] An optional object which parameters will be applied
         * to the copy prior to its OnCreate event.
         * @returns {Copy} the created copy.
         */
        copy(template, x = 0, y = 0, exts) {
            return ct.templates.copyIntoRoom(template, x, y, ct.room, exts);
        },
        /**
         * Applies a function to each copy in the current room
         * @param {Function} func The function to apply
         * @returns {void}
         */
        each(func) {
            for (const copy of ct.stack) {
                if (!(copy instanceof Copy)) {
                    continue; // Skip backgrounds and tile layers
                }
                func.apply(copy, this);
            }
        },
        /**
         * Applies a function to a given object (e.g. to a copy)
         * @param {Copy} obj The copy to perform function upon.
         * @param {Function} function The function to be applied.
         */
        withCopy(obj, func) {
            func.apply(obj, this);
        },
        /**
         * Applies a function to every copy of the given template name
         * @param {string} template The name of the template to perform function upon.
         * @param {Function} function The function to be applied.
         */
        withTemplate(template, func) {
            for (const copy of ct.templates.list[template]) {
                func.apply(copy, this);
            }
        },
        /**
         * Checks whether there are any copies of this template's name.
         * Will throw an error if you pass an invalid template name.
         * @param {string} template The name of a template to check.
         * @returns {boolean} Returns `true` if at least one copy exists in a room;
         * `false` otherwise.
         */
        exists(template) {
            if (!(template in ct.templates.templates)) {
                throw new Error(`[ct.templates] ct.templates.exists: There is no such template ${template}.`);
            }
            return ct.templates.list[template].length > 0;
        },
        /*
         * ⚠ Actual typings for this is in src\typedefs\ct.js\ct.templates.d.ts ⚠
         * Checks whether a given object exists in game's world.
         * Intended to be applied to copies, but may be used with other PIXI entities.
         * @param {Copy|PIXI.DisplayObject|any} obj The copy which existence needs to be checked.
         * @returns {boolean} Returns `true` if a copy exists; `false` otherwise.
         */
        valid(obj) {
            if (obj instanceof Copy) {
                return !obj.kill;
            }
            if (obj instanceof PIXI.DisplayObject) {
                return Boolean(obj.position);
            }
            return Boolean(obj);
        },
        /*
         * ⚠ Actual typings for this is in src\typedefs\ct.js\ct.templates.d.ts ⚠
         * Checks whether a given object is a ct.js copy.
         * @param {any} obj The object which needs to be checked.
         * @returns {boolean} Returns `true` if the passed object is a copy; `false` otherwise.
         */
        isCopy(obj) {
            return obj instanceof Copy;
        }
    };

    
ct.templates.templates["chimp"] = {
    depth: 0,
    blendMode: PIXI.BLEND_MODES.NORMAL,
    animationFPS: 30,
    playAnimationOnStart: false,
    loopAnimation: true,
    visible: true,
    group: "ungrouped",
    texture: "chimp-idle",
    onStep: function () {
        /* template chimp — core_OnStep (On frame start event) */
{
 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }
let MAX_X = 1060;

function occupied(This, x, y) {
    assert(x);
    return ct.place.occupied(This, x, y, "Solid");
}

this.depth = 10;
this.action = "";


// Repel out of a jam? 
let bump = occupied(this, this.x, this.y);
if (bump) {
    console.error("start stuck?!");
    let b1 = {
        x: this.x - this.shape.left, 
        y: this.y - this.shape.top + this.height,
        width: this.width - this.shape.left - this.shape.right, 
        height: this.height - this.shape.top - this.shape.bottom
    };
    let b2 = {
        x: bump.x - bump.shape.left, 
        y: bump.y - bump.shape.top,
        width: bump.width, // - bump.shape.left - bump.shape.right + 5, 
        height: bump.height// - this.shape.top - this.shape.bottom
    };
    // NB: all -ive for max (min abs)
    // amount to add (ie dxl would be -ive) to b1.x to move left and be clear
    let dxl = b2.x - b1.x - b1.width;
    let dxr =-(b2.x + b2.width - b1.x); // subtract to move right and be clear (also -ive)
    let dyu = b2.y - b1.y - b1.height; // add (-ive) to clear up // TODO
    let dyd = -(b2.y + b2.height - b1.y);// subtract (-ive) to clear down
    // avoid bump-off-screen
    // if (b1.x < 50) dxl = 0;
    // if (b1.x > MAX_X-50) dxr = 0;
    // pick the smallest bump
    let dMin = Math.max(dxl, dxr, dyu, dyd);
    console.log("BUMP lrud min",dxl,dxr,dyu,dyd,dMin, "xy",this.x, this.y);
    assert(Math.max(dxl,dxr,dyu,dyd) <=0);
    if (dMin === dxl) {
        this.x += dxl - 1;
    } else if (dMin === dxr) {
        this.x -= dxr + 1;
    } else if (dMin === dyu) {
        this.y += dyu - 5;
    } else {
        this.y -= dyd + 5;
    }
    // ?? drop cached info?? _shape
    console.log("BUMP new xy",this.x, this.y, ct.place.occupied(this, this.x, this.y, "Solid"),"dx dy",this.dx,this.dy);
} else {
    // console.log("No bump xy",this.x, this.y, bump,"dx dy",this.dx,this.dy);
}

if (ct.actions.VJoyX && ct.actions.VJoyX.value) {
    console.log("VJoyX", ct.actions.VJoyX.value, ct.actions.VJoyX.down);
}

// Left / Right
if (ct.actions.MoveLeftRight.down) {
    // If the A key or left arrow on a keyboard is down, then move to left    
    let multiplier = ct.actions.MoveLeftRight.value;
    this.dx = this.SPEED_LR * multiplier;
    // console.log("MoveLeftRight",this.dx);
    this.action = "LR";
    this.scale.x = multiplier * Math.abs(this.scale.x); // mirror left/right
    if (this.tex !== "chimp-walk") {
        this.tex = 'chimp-walk';
        this.play(); 
    }
} else {
    // Don't move horizontally if no input
    this.dx = 0;
    if (this.tex !== "chimp-idle") {
        this.tex = 'chimp-idle';
    }
    // console.log("idle",this.dx);
    this.action = "idle";
}
// duck
if (ct.actions.Down.down) {
    this.scale.y = 0.3;
} else {
    this.scale.y = 1;
}

if ( ! this.collisionCheck) {
    this.y = this.y + this.dy;
    this.x = this.x + this.dx;
    // console.log("no check");
    return;
}

// always down
this.dy += this.gravity;

// for checking the move
let fullY = this.y + this.dy;

// Move! maybe
// ...stick to whole pixels
let oldX = this.x, oldY = this.y;
let dx = Math.floor(this.dx * ct.delta);
let dy = Math.floor(this.dy * ct.delta);
let newX;
let newY = this.y + dy;
let hit = {};
// ...x
// while(Math.abs(dx) >= 1) {
newX = this.x + dx;
hit.x = occupied(this, newX, oldY);
//     if ( ! hit.x) break; // success
//     console.log("hit x", newX, oldY, "go back to ",oldX, oldY,"dx dy", this.dx, this.dy);
//     if (Math.abs(dx) > 1) { // try again, 1 pixel
//         dx = Math.sign(dx);
//     } else {
//         break;
//     }
// }
if (hit.x) {
    this.dx = 0; // full stop, no half measures
    newX = oldX;
}
// ...y
hit.y = occupied(this, newX, newY);
if (hit.y) {
    // console.log("hit y", this.x, newY, "go back to ",this.x, oldY,"dx dy", this.dx, this.dy);
    newY = oldY;
    this.dy = 0;
}

// on screen always
if (newX<0) newX = 0;
if (newY<0) newY = 0;
if (newX>MAX_X) newX = MAX_X;
if (newY>ct.room.height) newY = ct.room.height;

this.x = newX;
this.y = newY;

// let hit = ct.place.moveByAxes(this, Math.round(this.dx), Math.round(this.dy), "Solid", 1);

// console.log("xy", this.x, this.y, "hit",hit);

if ( ! hit.x && ! hit.y) {
    return; // done
}

// If there is ground underneath the Chimp
let grounded = !!hit.y;
if (grounded) {
    // …and the W key or the spacebar is down…
    if (ct.actions.Up.down) {
        // …then jump!
        this.dy = this.jumpSpeed;
        this.action += "Jump";
    } else {
        // Reset our vspeed. We don't want to be buried underground!
        this.dy = 0;
        // console.log("ground vspeed",this.dy,"y",this.y);
    }
}

if ( ! grounded) {
    if (this.y > ct.camera.height) {
        console.log("!grounded stop up")
        this.dy = 0;
        this.action += "gone";
    } else {
        console.log("!grounded fall")
        this.action += "fall";
    }
}


if (_optionalChain([hit, 'access', _ => _.x, 'optionalAccess', _2 => _2.template]) === "door") {
    // TODO refactor to share code with manholes
    const door = hit.x;
    if (ct.actions.MoveLeftRight.down) {
        console.log("lr door?", getSymbol(), "nextSymbol",door.nextSymbol, "unlocked",isUnlocked(getSymbol(), door.nextSymbol),ct.actions.MoveLeftRight.value, door);
        if (door.unlocked || isUnlocked(getSymbol(), door.nextSymbol)) {
            assert(door.nextSymbol, hit);
            moveRoom("Room_Platformer", {symbol:door.nextSymbol});
        } else {
            if (UI.modal) {
                console.log("modal already", UI.modal);
                return;
            }
            console.log("Make modal!");
            updateRoomState("Room_CodewordModal", {nextSymbol: door.nextSymbol});
            let codeRoom = ct.rooms.append('Room_CodewordModal');                    
            UI.modal = codeRoom;
        }
    }
}
    
if (this.dy < 0 && this.y - fullY > 1) { // crash into ceiling? then stop going up
    // console.log(this.dy, fullY, this.y)
    this.dy = 0;
}


// if (ct.place.occupied(this, this.x, this.y, "Solid")) {
//     console.error("moved into occupied?!", "xy", this.x, this.y);
//     this.kill = true;
//     return;
//     // back off one
//     // this.x = oldX; //-= Math.sign(this.dx);
//     // this.y = oldY; //-= Math.sign(this.dy);
//     // if (ct.place.occupied(this, "Solid")) {
//     //     console.error("Still moved into occupied?!", "xy", this.x, this.y,"dx",this.dx, "dy",this.dy);

//     // }
// }


// // leads to stuck monkey bugs 'cos movement is blocked by collide
// function isGrounded(This, groundCollide) {
//         bottom: 1
// left: 26
// right: 32
// top: 115
//     let feetBounds = {
//         x: This.x - This.shape.left + 1, 
//         y: This.y - This.shape.top + This.height - 2,
//         width: This.width - This.shape.left - This.shape.right - 2, 
//         height: 50 //this.height + 1// - this.shape.top - this.shape.bottom
//     };
// //     bottom: 1
// // left: 26
// // right: 32
// // top: 115
//     // let gBounds = groundCollide.getBounds(true);
//     let gb2 = {
//         x: groundCollide.x - groundCollide.shape.left, 
//         y: groundCollide.y - groundCollide.shape.top,
//         width: groundCollide.width, // - groundCollide.shape.left - groundCollide.shape.right + 5, 
//         height: groundCollide.height// - this.shape.top - this.shape.bottom
//     };
//     return testBoxCollision(feetBounds, gb2);
// }

}
/* template chimp — place_collisionTemplate (Collision with a template event) */
{
    const other = ct.place.meet(this, 'manhole');
    if (ct.templates.valid(other)) {
        
let dy = this.y > 200? 1 : -1;
// Must press the right key
if (dy===1 && ! ct.actions.Down.down) return;
if (dy===-1 && ! ct.actions.Up.down) return;
// console.log("Down?");
let manhole = getTemplates(ct.room, "manhole")[0];
// is it open
let symbol = getSymbol();
let nextSymbol = getNextElementSymbol(symbol, 0, dy);
if ( ! symbol || ! nextSymbol) return;

let open = isUnlocked(symbol, nextSymbol);
if (open) {
    console.log("Yes go down", symbol, nextSymbol, open);
    this.dy = - this.jumpSpeed;
    this.collisionCheck = false;
    moveRoom("Room_Platformer", {symbol:nextSymbol});
    roomOptions[ct.room.name].playery = dy===1? 20 : ct.room.height - 100;
} else {
    // jump up to locked? do nothing
    if (dy===-1) {
        console.log("jump up to locked manhoel = no-op");
        return;
    }
    console.log("collide symbols", getSymbol(), nextSymbol);
    // open as a modal
    if (UI.modal) {
        console.log("modal already", UI.modal);
        return;
    }
    console.log("Make modal!");
    updateRoomState("Room_CodewordModal", {nextSymbol: nextSymbol});
    let codeRoom = ct.rooms.append('Room_CodewordModal');
    UI.modal = codeRoom;
}

    }
}


    },
    onDraw: function () {
        
    },
    onDestroy: function () {
        
    },
    onCreate: function () {
        /* template chimp — core_OnCreate (On create event) */
{
window.chimp = this; // debug

this.animationSpeed = 0.15;

this.dx = 0; // Horizontal speed
this.dy = 0; // Vertical speed

this.SPEED_LR = 6;
this.jumpSpeed = -14;
this.gravity = 0.5;

this.getRoom().player = this;
this.collisionCheck = true;

// paranoia - clamp
this.x = Math.round(this.x);
this.y = Math.round(this.y);

}

    },
    extends: {
    "cgroup": ""
}
};
ct.templates.list['chimp'] = [];
        
ct.templates.templates["Block"] = {
    depth: 0,
    blendMode: PIXI.BLEND_MODES.NORMAL,
    animationFPS: 30,
    playAnimationOnStart: false,
    loopAnimation: true,
    visible: true,
    group: "ungrouped",
    texture: "block",
    onStep: function () {
        /* template Block — core_OnStep (On frame start event) */
{
this.move();
}

    },
    onDraw: function () {
        
    },
    onDestroy: function () {
        
    },
    onCreate: function () {
        
    },
    extends: {
    "cgroup": "Solid"
}
};
ct.templates.list['Block'] = [];
        
ct.templates.templates["Platform"] = {
    depth: 0,
    blendMode: PIXI.BLEND_MODES.NORMAL,
    animationFPS: 30,
    playAnimationOnStart: false,
    loopAnimation: true,
    visible: true,
    group: "ungrouped",
    texture: "platform",
    onStep: function () {
        /* template Platform — core_OnStep (On frame start event) */
{
this.move();
}

    },
    onDraw: function () {
        
    },
    onDestroy: function () {
        
    },
    onCreate: function () {
        
    },
    extends: {
    "cgroup": "Solid"
}
};
ct.templates.list['Platform'] = [];
        
ct.templates.templates["cat-1"] = {
    depth: 0,
    blendMode: PIXI.BLEND_MODES.NORMAL,
    animationFPS: 30,
    playAnimationOnStart: false,
    loopAnimation: true,
    visible: true,
    group: "ungrouped",
    texture: "cat-1",
    onStep: function () {
        /* template cat-1 — place_collisionTemplate (Collision with a template event) */
{
    const other = ct.place.meet(this, 'chimp');
    if (ct.templates.valid(other)) {
         function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }
let msg = chat4symbol[_optionalChain([ct, 'access', _ => _.room, 'access', _2 => _2.element, 'optionalAccess', _3 => _3.symbol])];
if ( ! msg) {
    msg = new Chat("Meow. You're in the "+_optionalChain([ct, 'access', _4 => _4.room, 'access', _5 => _5.element, 'optionalAccess', _6 => _6.name])+" room.");
}

if ( ! this.meow) {
    this.meow = true;
    ct.sound.spawn("Sound_Cat", {volume:0.5});
}

if (this.pTalkToMe) this.pTalkToMe.visible = false;

doTalk(this, msg);

    }
}

/* template cat-1 — core_OnStep (On frame start event) */
{
 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }
if (this.talking || this.pSpeechBubble) { // bug - this.talking isnt a reliable marker??
    if (this.pTalkToMe) {
        this.pTalkToMe.visible = false;
        this.pTalkToMe.alpha = 0;
    }
}

if (this.talking) {
    let chimp = getPlayer();
    if (chimp && ! ct.place.collide(this, chimp)) {
        console.log("Stop talking?", this.talking);
        if (this.talking.control) {
            this.talking.control.stop = true;
            this.talking = null;
        }
    }
    return;
} else if ( ! this.pSpeechBubble) {
    let msg = chat4symbol[_optionalChain([ct, 'access', _ => _.room, 'access', _2 => _2.element, 'optionalAccess', _3 => _3.symbol])];
    if (msg && msg.lines.find(line => ! line.done)) {
        if ( ! this.pTalkToMe) {
            this.pTalkToMe = ct.templates.copy("speech-bubble", -5, -this.height -5);
            this.addChild(this.pTalkToMe);
            this.pTalkToMe.scale.x = 0.2;
            this.pTalkToMe.scale.y = 0.2;            
        }
        this.pTalkToMe.visible = true;
        this.pTalkToMe.alpha = 0.75;
    }
}
}

    },
    onDraw: function () {
        
    },
    onDestroy: function () {
        
    },
    onCreate: function () {
        
    },
    extends: {}
};
ct.templates.list['cat-1'] = [];
        
ct.templates.templates["snake-spit"] = {
    depth: 0,
    blendMode: PIXI.BLEND_MODES.NORMAL,
    animationFPS: 30,
    playAnimationOnStart: false,
    loopAnimation: true,
    visible: true,
    group: "ungrouped",
    texture: "snake-spit",
    onStep: function () {
        /* template snake-spit — core_OnStep (On frame start event) */
{
let chimp = getPlayer();
if ( ! chimp || chimp.dying) return;
if (this.dying) return;

let leftRight = this.scale.x > 0? 1 : -1;

// // turn left / right?
// if (chimp.x < this.x) {
//     this.scale.x = - 1;
// } else {
//     this.scale.x = 1;
// }

// spit?
if (this.lastSpit < new Date().getTime() - 2500) {
    if (Math.abs(chimp.y - this.y) < 50) { // same level
        if ((this.scale.x < 0 && this.x > chimp.x) || (this.scale.x > 0 && this.x < chimp.x)) {
            console.log("SPIT!");
            this.lastSpit = new Date().getTime();
            this.tex = 'snake-spitting';
            this.loop = false;
            this.onComplete = () => {
                if (this.dying) return;
                let pSpit = ct.templates.copy("spit-bullet");
                pSpit.y = this.y - this.height + pSpit.height;
                pSpit.x = this.x + this.width * 0.2;
                pSpit.dx = 8*leftRight;      
                this.tex = 'snake-spit';
                this.onComplete = null;          
            };
            this.play(); 
        }
    }
}

}
/* template snake-spit — place_collisionTemplate (Collision with a template event) */
{
    const other = ct.place.meet(this, 'chimp');
    if (ct.templates.valid(other)) {
         function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }if (this.dying) return;

function doKillMonster(pSnake) {
    if (pSnake.dying) return;
    pSnake.depth = 100;
    pSnake.dying = true;
    pSnake.dx = 0;
    if (pSnake.dieTex) pSnake.tex = pSnake.dieTex;
    pSnake.play(); 
    let smaller = pSnake.scale.y * 0.8;
    ct.tween.add({
        obj:pSnake.scale,
        duration:1000,
        fields: {
            y: smaller,
            x: smaller
        }
    });
    ct.timer.add(1000).then(() => pSnake.kill = true);
}

// jumped on??
let chimp = getPlayer();
if (_optionalChain([chimp, 'optionalAccess', _ => _.dy]) > 0 && chimp.y < this.y - 5 && ! chimp.dying) {
    console.warn("possible jumping event", chimp.dy, chimp.y, "snake", this.y - this.height);
    doKillMonster(this);
    return;
}

// console.log("Argh!");
doLoseLife();
    }
}


    },
    onDraw: function () {
        
    },
    onDestroy: function () {
        
    },
    onCreate: function () {
        /* template snake-spit — core_OnCreate (On create event) */
{
this.lastSpit = new Date().getTime();
}

    },
    extends: {
    "inheritedTemplate": "AbstractEnemy"
}
};
ct.templates.list['snake-spit'] = [];
        
ct.templates.templates["coin"] = {
    depth: 0,
    blendMode: PIXI.BLEND_MODES.NORMAL,
    animationFPS: 30,
    playAnimationOnStart: false,
    loopAnimation: true,
    visible: true,
    group: "ungrouped",
    texture: "coin-32",
    onStep: function () {
        /* template coin — core_OnStep (On frame start event) */
{
this.move();
}
/* template coin — place_collisionTemplate (Collision with a template event) */
{
    const other = ct.place.meet(this, 'chimp');
    if (ct.templates.valid(other)) {
        
if ( ! this.kill) {
    counters.coins++;
    this.kill = true;
    ct.sound.spawn("ChaChing", {volume:0.1});
}

    }
}


    },
    onDraw: function () {
        
    },
    onDestroy: function () {
        
    },
    onCreate: function () {
        /* template coin — core_OnCreate (On create event) */
{
// this.scale.x = 0.25;
// this.scale.y = 0.25;
}

    },
    extends: {}
};
ct.templates.list['coin'] = [];
        
ct.templates.templates["coin_score"] = {
    depth: 0,
    blendMode: PIXI.BLEND_MODES.NORMAL,
    animationFPS: 30,
    playAnimationOnStart: false,
    loopAnimation: true,
    visible: true,
    group: "ungrouped",
    texture: "coin-32",
    onStep: function () {
        
    },
    onDraw: function () {
        /* template coin_score — core_OnDraw (On frame end event) */
{
this.pText.text = counters.coins;
}

    },
    onDestroy: function () {
        
    },
    onCreate: function () {
        /* template coin_score — core_OnCreate (On create event) */
{

setText(this, "0", 24, -20, {style:'Style_Score'});

}

    },
    extends: {}
};
ct.templates.list['coin_score'] = [];
        
ct.templates.templates["door"] = {
    depth: 0,
    blendMode: PIXI.BLEND_MODES.NORMAL,
    animationFPS: 30,
    playAnimationOnStart: false,
    loopAnimation: true,
    visible: true,
    group: "ungrouped",
    texture: "door-locked",
    onStep: function () {
        /* template door — place_collisionTemplate (Collision with a template event) */
{
    const other = ct.place.meet(this, 'chimp');
    if (ct.templates.valid(other)) {
        if ( ! ct.actions.MoveLeftRight.down) return;
// is it the right way??
console.log("lr door?",ct.actions.MoveLeftRight.value, this.x);
if (this.unlocked) {
    assert(this.nextSymbol, this);
    moveRoom("Room_Platformer", {symbol:this.nextSymbol});
} else {
    console.log("locked to ",this.nextSymbol);
}
    }
}

/* template door — core_OnStep (On frame start event) */
{
if (this.unlocked || isUnlocked(getSymbol(), this.nextSymbol)) {
    this.tex = "door-open";
}

}

    },
    onDraw: function () {
        
    },
    onDestroy: function () {
        
    },
    onCreate: function () {
        /* template door — core_OnCreate (On create event) */
{
this.zIndex = -10;
this.depth = 0;

}

    },
    extends: {
    "cgroup": "Solid"
}
};
ct.templates.list['door'] = [];
        
ct.templates.templates["captain"] = {
    depth: 0,
    blendMode: PIXI.BLEND_MODES.NORMAL,
    animationFPS: 30,
    playAnimationOnStart: false,
    loopAnimation: true,
    visible: true,
    group: "ungrouped",
    texture: "captain",
    onStep: function () {
        /* template captain — core_OnStep (On frame start event) */
{
this.move();
}

    },
    onDraw: function () {
        
    },
    onDestroy: function () {
        
    },
    onCreate: function () {
        
    },
    extends: {}
};
ct.templates.list['captain'] = [];
        
ct.templates.templates["tank-2"] = {
    depth: 0,
    blendMode: PIXI.BLEND_MODES.NORMAL,
    animationFPS: 30,
    playAnimationOnStart: false,
    loopAnimation: true,
    visible: true,
    group: "ungrouped",
    texture: "tank-2-red",
    onStep: function () {
        /* template tank-2 — core_OnStep (On frame start event) */
{
if (this.unlocked) {
    this.tex = "tank-2";
} else {
    this.tex = "tank-2-red";
    if ( ! this.smoke) {
        this.smoke = ct.emitters.fire("SmokeFX", this.x, this.y, {depth:-1});
        // this.smoke.x = this.width / 2;
        // this.smoke.y = this.height / 2;
        // this.smoke.zIndex = -10; //this.zIndex - 1;
    }
}
}
/* template tank-2 — place_collisionTemplate (Collision with a template event) */
{
    const other = ct.place.meet(this, 'chimp');
    if (ct.templates.valid(other)) {
        
if ( ! ct.actions.MoveLeftRight.down) {
    return; // must push a key
}

let symbol = getSymbol();

// add as layer??
function switchToPuzzle() {
    let puzzleRoomName = "Room_Puzzle_Pipes";
    moveRoom(puzzleRoomName, {symbol}, {});
}

assert(symbol, "no symbol");
if (unlocked[symbol]) {
    // unlocked!
    this.unlocked = true;
    addCanister(symbol);   
} else {
    ct.sound.spawn("Sound_Squeaky_Open", {volume:0.5}, switchToPuzzle);
}

    }
}


    },
    onDraw: function () {
        
    },
    onDestroy: function () {
        /* template tank-2 — core_OnDestroy (On destroy event) */
{
if (this.smoke) {
    this.smoke.kill = true; //destroy();
    this.smoke = null;
}
}

    },
    onCreate: function () {
        /* template tank-2 — core_OnCreate (On create event) */
{
let symbol = getSymbol();
this.unlocked = unlocked[symbol];

}

    },
    extends: {}
};
ct.templates.list['tank-2'] = [];
        
ct.templates.templates["tank-1"] = {
    depth: 0,
    blendMode: PIXI.BLEND_MODES.NORMAL,
    animationFPS: 30,
    playAnimationOnStart: false,
    loopAnimation: true,
    visible: true,
    group: "ungrouped",
    texture: "tank-1",
    onStep: function () {
        /* template tank-1 — core_OnStep (On frame start event) */
{
this.move();
}

    },
    onDraw: function () {
        
    },
    onDestroy: function () {
        
    },
    onCreate: function () {
        
    },
    extends: {}
};
ct.templates.list['tank-1'] = [];
        
ct.templates.templates["telephone"] = {
    depth: 0,
    blendMode: PIXI.BLEND_MODES.NORMAL,
    animationFPS: 30,
    playAnimationOnStart: false,
    loopAnimation: true,
    visible: true,
    group: "ungrouped",
    texture: "telephone",
    onStep: function () {
        /* template telephone — core_OnStep (On frame start event) */
{
this.move();
}

    },
    onDraw: function () {
        
    },
    onDestroy: function () {
        
    },
    onCreate: function () {
        
    },
    extends: {}
};
ct.templates.list['telephone'] = [];
        
ct.templates.templates["speech-bubble"] = {
    depth: 0,
    blendMode: PIXI.BLEND_MODES.NORMAL,
    animationFPS: 30,
    playAnimationOnStart: false,
    loopAnimation: true,
    visible: true,
    group: "ungrouped",
    texture: "speech-bubble",
    onStep: function () {
        
    },
    onDraw: function () {
        
    },
    onDestroy: function () {
        
    },
    onCreate: function () {
        
    },
    extends: {}
};
ct.templates.list['speech-bubble'] = [];
        
ct.templates.templates["info-bar"] = {
    depth: 0,
    blendMode: PIXI.BLEND_MODES.NORMAL,
    animationFPS: 30,
    playAnimationOnStart: false,
    loopAnimation: true,
    visible: true,
    group: "ungrouped",
    texture: "side-panel",
    onStep: function () {
        
    },
    onDraw: function () {
        
    },
    onDestroy: function () {
        
    },
    onCreate: function () {
        /* template info-bar — core_OnCreate (On create event) */
{
console.log("Make info-bar", ct.room.element, roomOptions[ct.room.name], this.x,this.y, this);
this.alpha = 1;

}

    },
    extends: {
    "cgroup": "Solid"
}
};
ct.templates.list['info-bar'] = [];
        
ct.templates.templates["modal"] = {
    depth: 0,
    blendMode: PIXI.BLEND_MODES.NORMAL,
    animationFPS: 30,
    playAnimationOnStart: false,
    loopAnimation: true,
    visible: true,
    group: "ungrouped",
    texture: "modal",
    onStep: function () {
        /* template modal — core_OnStep (On frame start event) */
{
this.move();
}

    },
    onDraw: function () {
        
    },
    onDestroy: function () {
        
    },
    onCreate: function () {
        
    },
    extends: {}
};
ct.templates.list['modal'] = [];
        
ct.templates.templates["empty-tile"] = {
    depth: 0,
    blendMode: PIXI.BLEND_MODES.NORMAL,
    animationFPS: 30,
    playAnimationOnStart: false,
    loopAnimation: true,
    visible: true,
    group: "ungrouped",
    
    onStep: function () {
        
    },
    onDraw: function () {
        
    },
    onDestroy: function () {
        
    },
    onCreate: function () {
        /* template empty-tile — core_OnPointerClick (OnPointerClick event) */
this.interactive = true;
this.on('pointertap', () => {
    

this.getRoom().onTileClick(this);


});
/* template empty-tile — core_OnPointerDown (OnPointerDown event) */
this.interactive = true;
this.on('pointerdown', () => {
    

log1("p down",this.pipeColor,this.gridx,this.gridy);

let room = this.getRoom();
if (this.isEnd) {
    // select
    room.setPipeColor(this.pipeColor, room);
} else {
    room.doFillTile(this, room.downColor);
}


});
/* template empty-tile — core_OnPointerEnter (OnPointerEnter event) */
this.interactive = true;
this.on('pointerover', () => {
    

let color = this.getRoom().downColor;
log1("p enter",this.pipeColor,this.gridx,this.gridy, color);
if (color) {
    if (ct.pointer.down.length) {
        this.getRoom().doFillTile(this, color);
    }
}

});
/* template empty-tile — core_OnPointerUp (OnPointerUp event) */
this.interactive = true;
this.on('pointerup', () => {
    

log1("p up",this.pipeColor,this.gridx,this.gridy);
this.getRoom().downColor = null;


});
/* template empty-tile — core_OnPointerUpOutside (OnPointerUpOutside event) */
this.interactive = true;
this.on('pointerupoutside', () => {
    

log1("p up outside",this.pipeColor,this.gridx,this.gridy);
let color = this.getRoom().downColor;


});

    },
    extends: {}
};
ct.templates.list['empty-tile'] = [];
        
ct.templates.templates["TextBlock"] = {
    depth: 0,
    blendMode: PIXI.BLEND_MODES.NORMAL,
    animationFPS: 30,
    playAnimationOnStart: false,
    loopAnimation: true,
    visible: true,
    group: "ungrouped",
    texture: "paper",
    onStep: function () {
        /* template TextBlock — core_OnStep (On frame start event) */
{

}

    },
    onDraw: function () {
        
    },
    onDestroy: function () {
        
    },
    onCreate: function () {
        
    },
    extends: {}
};
ct.templates.list['TextBlock'] = [];
        
ct.templates.templates["manhole"] = {
    depth: 0,
    blendMode: PIXI.BLEND_MODES.NORMAL,
    animationFPS: 30,
    playAnimationOnStart: false,
    loopAnimation: true,
    visible: true,
    group: "ungrouped",
    texture: "manhole-closed",
    onStep: function () {
        /* template manhole — core_OnStep (On frame start event) */
{

let symbol = getSymbol();

if (isUnlocked(symbol, this.nextSymbol)) {
    this.tex = "manhole-open";
}
}

    },
    onDraw: function () {
        
    },
    onDestroy: function () {
        
    },
    onCreate: function () {
        /* template manhole — core_OnPointerEnter (OnPointerEnter event) */
this.interactive = true;
this.on('pointerover', () => {
    
 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }
// console.log("on hover?", this, ct.room.element, this.nextSymbol);

let label = getLabel(_optionalChain([ct, 'access', _ => _.room, 'access', _2 => _2.element, 'optionalAccess', _3 => _3.symbol]), this.nextSymbol);
if (label) {
    showTooltip(this, label);
}

});
/* template manhole — core_OnPointerLeave (OnPointerLeave event) */
this.interactive = true;
this.on('pointerout', () => {
    
hideTooltip(this);

});
/* template manhole — core_OnCreate (On create event) */
{
this.depth = 0;
}

    },
    extends: {}
};
ct.templates.list['manhole'] = [];
        
ct.templates.templates["exit-button"] = {
    depth: 0,
    blendMode: PIXI.BLEND_MODES.NORMAL,
    animationFPS: 30,
    playAnimationOnStart: false,
    loopAnimation: true,
    visible: true,
    group: "ungrouped",
    texture: "exit-button",
    onStep: function () {
        /* template exit-button — core_OnStep (On frame start event) */
{

if (ct.actions.Esc.released) {
    this.exitPuzzle();
}

}

    },
    onDraw: function () {
        
    },
    onDestroy: function () {
        
    },
    onCreate: function () {
        /* template exit-button — core_OnPointerClick (OnPointerClick event) */
this.interactive = true;
this.on('pointertap', () => {
    

this.exitPuzzle();


});
/* template exit-button — core_OnCreate (On create event) */
{

this.exitPuzzle = () => { 
    console.log("exitPuzzle", UI.modal, ct.room.name, ct.room, this);
    if (UI.modal && UI.modal.name.startsWith("Room_CodewordModal")) {
        // remove??
        ct.rooms.remove(UI.modal);
        UI.modal = null;
        return;
    }
    if (ct.room.name.startsWith("Room_Puzzle")) {
        let roomName = "Room_Platformer";
        console.log("switch", roomName);
        moveRoom(roomName, null, {transition:"none"});
    }
}

}

    },
    extends: {}
};
ct.templates.list['exit-button'] = [];
        
ct.templates.templates["canister"] = {
    depth: 0,
    blendMode: PIXI.BLEND_MODES.NORMAL,
    animationFPS: 30,
    playAnimationOnStart: false,
    loopAnimation: true,
    visible: true,
    group: "ungrouped",
    texture: "canister-label",
    onStep: function () {
        /* template canister — core_OnStep (On frame start event) */
{

// UI room!
let i = this.i;
let canister = canisters[i];
if ( ! canister) {
    // this.alpha = 0.5;
} else {
    let label = canister.symbol;
// if (label) {
    // console.log("canister", this, i, label, canisters[i], canisters);
    setText(this, label, 145, 20);
}
}

    },
    onDraw: function () {
        
    },
    onDestroy: function () {
        
    },
    onCreate: function () {
        /* template canister — core_OnCreate (On create event) */
{

// setText(this, "FOO", 145, 20);
}
/* template canister — core_OnPointerEnter (OnPointerEnter event) */
this.interactive = true;
this.on('pointerover', () => {
    
let canister = canisters[this.i];
if (canister) {
    let e = info4symbol[canister.symbol];
    if ( ! e) return;
    let gasSolid = e.standard_conditions_state || "";
    let appearance = e.appearance || gasSolid;
    if ( ! appearance.includes(gasSolid) && ! appearance.includes("metal")) appearance += " "+gasSolid;
    showTooltip(this, e.name+"; "+appearance);
}

});
/* template canister — core_OnPointerLeave (OnPointerLeave event) */
this.interactive = true;
this.on('pointerout', () => {
    
hideTooltip(this);

});

    },
    extends: {}
};
ct.templates.list['canister'] = [];
        
ct.templates.templates["empty-button"] = {
    depth: 0,
    blendMode: PIXI.BLEND_MODES.NORMAL,
    animationFPS: 30,
    playAnimationOnStart: false,
    loopAnimation: true,
    visible: true,
    group: "ungrouped",
    texture: "exit-button",
    onStep: function () {
        /* template empty-button — core_OnStep (On frame start event) */
{

}

    },
    onDraw: function () {
        
    },
    onDestroy: function () {
        
    },
    onCreate: function () {
        /* template empty-button — core_OnPointerClick (OnPointerClick event) */
this.interactive = true;
this.on('pointertap', () => {
    
console.log("click empty", this.i);
let canister = canisters[this.i];
if (canister) canister.symbol = null;
else {
    console.log("no canister?!", canisters, this.i);
}

});

    },
    extends: {}
};
ct.templates.list['empty-button'] = [];
        
ct.templates.templates["code-blank"] = {
    depth: 0,
    blendMode: PIXI.BLEND_MODES.NORMAL,
    animationFPS: 30,
    playAnimationOnStart: false,
    loopAnimation: true,
    visible: true,
    group: "ungrouped",
    texture: "code-blank",
    onStep: function () {
        /* template code-blank — core_OnStep (On frame start event) */
{
this.move();
}

    },
    onDraw: function () {
        
    },
    onDestroy: function () {
        
    },
    onCreate: function () {
        
    },
    extends: {}
};
ct.templates.list['code-blank'] = [];
        
ct.templates.templates["element-button"] = {
    depth: 0,
    blendMode: PIXI.BLEND_MODES.NORMAL,
    animationFPS: 30,
    playAnimationOnStart: false,
    loopAnimation: true,
    visible: true,
    group: "ungrouped",
    texture: "element",
    onStep: function () {
        
    },
    onDraw: function () {
        
    },
    onDestroy: function () {
        
    },
    onCreate: function () {
        /* template element-button — core_OnPointerClick (OnPointerClick event) */
this.interactive = true;
this.on('pointertap', () => {
    

// console.log("click",this.canister, UI.puzzle);
UI.puzzle.useCanister(this.canister);

});

    },
    extends: {}
};
ct.templates.list['element-button'] = [];
        
ct.templates.templates["spit-bullet"] = {
    depth: 0,
    blendMode: PIXI.BLEND_MODES.NORMAL,
    animationFPS: 30,
    playAnimationOnStart: false,
    loopAnimation: true,
    visible: true,
    group: "ungrouped",
    texture: "spit",
    onStep: function () {
        /* template spit-bullet — core_OnStep (On frame start event) */
{
// console.log(ct.delta);
if (this.dx || this.dy) {
    let hit = ct.place.moveByAxes(this, this.dx*ct.delta, this.dy*ct.delta, "Solid", 1);
    if (hit) {
        this.kill = true;
        this.visible = false;
    }
}

}
/* template spit-bullet — place_collisionTemplate (Collision with a template event) */
{
    const other = ct.place.meet(this, 'chimp');
    if (ct.templates.valid(other)) {
        
// double check (seeing false height hit)
console.log("hit?");

let isHit = testBoxCollision(getBounds(other), getBounds(this));
console.log("hit", isHit, this);
if (isHit) {
	doLoseLife();
}
    }
}

/* template spit-bullet — place_collisionCGroup (Collision with a group event) */
{
    const other = ct.place.occupied(this, 'Solid');
    if (ct.templates.valid(other)) {
        console.log("collide Solid");
this.kill = true; // collision
this.visible = false;

    }
}


    },
    onDraw: function () {
        
    },
    onDestroy: function () {
        
    },
    onCreate: function () {
        
    },
    extends: {}
};
ct.templates.list['spit-bullet'] = [];
        
ct.templates.templates["table-ship"] = {
    depth: 0,
    blendMode: PIXI.BLEND_MODES.NORMAL,
    animationFPS: 30,
    playAnimationOnStart: false,
    loopAnimation: true,
    visible: true,
    group: "ungrouped",
    texture: "table-ship",
    onStep: function () {
        /* template table-ship — core_OnStep (On frame start event) */
{
this.move();
}

    },
    onDraw: function () {
        
    },
    onDestroy: function () {
        
    },
    onCreate: function () {
        
    },
    extends: {}
};
ct.templates.list['table-ship'] = [];
        
ct.templates.templates["skip-button"] = {
    depth: 0,
    blendMode: PIXI.BLEND_MODES.NORMAL,
    animationFPS: 30,
    playAnimationOnStart: false,
    loopAnimation: true,
    visible: true,
    group: "ungrouped",
    texture: "button.scaled",
    onStep: function () {
        
    },
    onDraw: function () {
        
    },
    onDestroy: function () {
        
    },
    onCreate: function () {
        /* template skip-button — core_OnPointerClick (OnPointerClick event) */
this.interactive = true;
this.on('pointertap', () => {
    
ct.room.skipped = true;

moveRoom("Room_Platformer");

});
/* template skip-button — core_OnCreate (On create event) */
{

setText(this, "skip", 0, 0, {style:"Style_BodyText",center:true,verticalCenter:true});

}

    },
    extends: {}
};
ct.templates.list['skip-button'] = [];
        
ct.templates.templates["bridge"] = {
    depth: 0,
    blendMode: PIXI.BLEND_MODES.NORMAL,
    animationFPS: 30,
    playAnimationOnStart: false,
    loopAnimation: true,
    visible: true,
    group: "ungrouped",
    texture: "DALL·E_2023-11-26_14.05.24_-_An_updated_version_of_the_backdrop_for_a_2D_game,_depicting_the_bridge_of_a_steampunk_spaceship,_now_with_more_space_for_people._Retain_the_original_r",
    onStep: function () {
        /* template bridge — core_OnStep (On frame start event) */
{
this.move();
}

    },
    onDraw: function () {
        
    },
    onDestroy: function () {
        
    },
    onCreate: function () {
        
    },
    extends: {}
};
ct.templates.list['bridge'] = [];
        
ct.templates.templates["sailor"] = {
    depth: 0,
    blendMode: PIXI.BLEND_MODES.NORMAL,
    animationFPS: 30,
    playAnimationOnStart: false,
    loopAnimation: true,
    visible: true,
    group: "ungrouped",
    texture: "sailor",
    onStep: function () {
        /* template sailor — core_OnStep (On frame start event) */
{
this.move();
}

    },
    onDraw: function () {
        
    },
    onDestroy: function () {
        
    },
    onCreate: function () {
        
    },
    extends: {}
};
ct.templates.list['sailor'] = [];
        
ct.templates.templates["asteroid"] = {
    depth: 0,
    blendMode: PIXI.BLEND_MODES.NORMAL,
    animationFPS: 30,
    playAnimationOnStart: false,
    loopAnimation: true,
    visible: true,
    group: "ungrouped",
    texture: "asteroid",
    onStep: function () {
        /* template asteroid — core_OnStep (On frame start event) */
{
this.move();
}

    },
    onDraw: function () {
        
    },
    onDestroy: function () {
        
    },
    onCreate: function () {
        
    },
    extends: {}
};
ct.templates.list['asteroid'] = [];
        
ct.templates.templates["black-hole"] = {
    depth: 0,
    blendMode: PIXI.BLEND_MODES.NORMAL,
    animationFPS: 30,
    playAnimationOnStart: false,
    loopAnimation: true,
    visible: true,
    group: "ungrouped",
    texture: "black-hole",
    onStep: function () {
        /* template black-hole — core_OnStep (On frame start event) */
{

this.rotation += Math.PI / 60;
}

    },
    onDraw: function () {
        
    },
    onDestroy: function () {
        
    },
    onCreate: function () {
        
    },
    extends: {}
};
ct.templates.list['black-hole'] = [];
        
ct.templates.templates["explosion"] = {
    depth: 0,
    blendMode: PIXI.BLEND_MODES.NORMAL,
    animationFPS: 30,
    playAnimationOnStart: false,
    loopAnimation: true,
    visible: true,
    group: "ungrouped",
    texture: "explosion",
    onStep: function () {
        /* template explosion — core_OnStep (On frame start event) */
{
this.move();
}

    },
    onDraw: function () {
        
    },
    onDestroy: function () {
        
    },
    onCreate: function () {
        
    },
    extends: {}
};
ct.templates.list['explosion'] = [];
        
ct.templates.templates["start-button"] = {
    depth: 0,
    blendMode: PIXI.BLEND_MODES.NORMAL,
    animationFPS: 30,
    playAnimationOnStart: false,
    loopAnimation: true,
    visible: true,
    group: "ungrouped",
    texture: "element",
    onStep: function () {
        /* template start-button — core_OnStep (On frame start event) */
{
this.move();
}

    },
    onDraw: function () {
        
    },
    onDestroy: function () {
        
    },
    onCreate: function () {
        /* template start-button — core_OnPointerClick (OnPointerClick event) */
this.interactive = true;
this.on('pointertap', () => {
    

// if (this.lastClick && this.lastClick > new Date().getTime() - 1000) {
//     return;
// }
// this.tex = "element-b";
// ct.timer.add(500).then(() => {
//     this.tex = "element";
// });

moveRoom("Room_Space");


});
/* template start-button — core_OnCreate (On create event) */
{
setText(this, "Start Game",0,0,{center:true,verticalCenter:true, style:"Style_BodyText"});
}

    },
    extends: {}
};
ct.templates.list['start-button'] = [];
        
ct.templates.templates["snake-3"] = {
    depth: 0,
    blendMode: PIXI.BLEND_MODES.NORMAL,
    animationFPS: 30,
    playAnimationOnStart: false,
    loopAnimation: true,
    visible: true,
    group: "ungrouped",
    texture: "snake-3",
    onStep: function () {
        /* template snake-3 — core_OnStep (On frame start event) */
{
if (this.dying) return;

if (this.tex !== "snake-slither") {
    this.tex = 'snake-slither';
    this.animationSpeed = 0.05;
    this.play(); 
}

// If there is not ground underneath - turn
if ( ! ct.place.occupied(this, this.x + this.dx, this.y + 1, 'Solid')) {
    this.turn();
}

this.x += this.dx * ct.delta;

}
/* template snake-3 — place_collisionCGroup (Collision with a group event) */
{
    const other = ct.place.occupied(this, 'Solid');
    if (ct.templates.valid(other)) {
        
this.turn();

    }
}

/* template snake-3 — place_collisionTemplate (Collision with a template event) */
{
    const other = ct.place.meet(this, 'chimp');
    if (ct.templates.valid(other)) {
         function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }if (this.dying) return;

function doKillMonster(pSnake) {
    if (pSnake.dying) return;
    pSnake.depth = 100;
    pSnake.dying = true;
    pSnake.dx = 0;
    if (pSnake.dieTex) pSnake.tex = pSnake.dieTex;
    pSnake.play(); 
    let smaller = pSnake.scale.y * 0.8;
    ct.tween.add({
        obj:pSnake.scale,
        duration:1000,
        fields: {
            y: smaller,
            x: smaller
        }
    });
    ct.timer.add(1000).then(() => pSnake.kill = true);
}

// jumped on??
let chimp = getPlayer();
if (_optionalChain([chimp, 'optionalAccess', _ => _.dy]) > 0 && chimp.y < this.y - 5 && ! chimp.dying) { //} && chimp.y > this.y) { // chimp coming down, generous 'cos sideways collisions favour chimp
    console.warn("possible jumping event", chimp.dy, chimp.y, "snake", this.y, this.y - this.height);
    doKillMonster(this);
    return;
}

// console.log("Argh!");
doLoseLife();
    }
}


    },
    onDraw: function () {
        
    },
    onDestroy: function () {
        
    },
    onCreate: function () {
        /* template snake-3 — core_OnCreate (On create event) */
{
this.dx = 1.5;
// go the right way
if (this.scale.x > 0) this.dx = - this.dx;

this.dieTex = "snake-slither-die";   

/**
 * pause then turn
 */
this.turn = () => {
    if (this.turning) return;
    this.turning = true;
    const dx2 = - this.dx;
    this.dx = 0;
    ct.timer.add(500).then(() => {
        this.dx = dx2;
        this.scale.x = -this.scale.x;
        this.turning = false;
    });

    // shrink to the head then turn that then extend??
//     const mask = new PIXI.Graphics()
// mask.beginFill(0x000000)
// mask.drawEllipse(75, 30, 60, 40)
// sprite.mask = mask
};
}

    },
    extends: {
    "inheritedTemplate": "AbstractEnemy"
}
};
ct.templates.list['snake-3'] = [];
        
ct.templates.templates["pipe-bit"] = {
    depth: 0,
    blendMode: PIXI.BLEND_MODES.NORMAL,
    animationFPS: 30,
    playAnimationOnStart: false,
    loopAnimation: true,
    visible: true,
    group: "ungrouped",
    texture: "pipe-bit-1",
    onStep: function () {
        /* template pipe-bit — core_OnStep (On frame start event) */
{
this.move();
}

    },
    onDraw: function () {
        
    },
    onDestroy: function () {
        
    },
    onCreate: function () {
        
    },
    extends: {}
};
ct.templates.list['pipe-bit'] = [];
        
ct.templates.templates["atom_score"] = {
    depth: 0,
    blendMode: PIXI.BLEND_MODES.NORMAL,
    animationFPS: 30,
    playAnimationOnStart: false,
    loopAnimation: true,
    visible: true,
    group: "ungrouped",
    texture: "atom.64",
    onStep: function () {
        
    },
    onDraw: function () {
        /* template atom_score — core_OnDraw (On frame end event) */
{
let v = ""+(counters.elements || 0)+" / "+this.total;
if (this.pText.text !== v) this.pText.text = v;
}

    },
    onDestroy: function () {
        
    },
    onCreate: function () {
        /* template atom_score — core_OnCreate (On create event) */
{

this.total =+Object.keys(info4symbol).length;
// HACK numbers by tweaking
setText(this, "0 / "+this.total, 55, -35, {style:'Style_Score'});

}
/* template atom_score — core_OnPointerEnter (OnPointerEnter event) */
this.interactive = true;
this.on('pointerover', () => {
    
showTooltip(this, "You have unlocked "+counters.elements+" elements of "+Object.keys(info4symbol).length);

});
/* template atom_score — core_OnPointerLeave (OnPointerLeave event) */
this.interactive = true;
this.on('pointerout', () => {
    
hideTooltip(this);

});

    },
    extends: {}
};
ct.templates.list['atom_score'] = [];
        
ct.templates.templates["PlumbingContainer"] = {
    depth: 0,
    blendMode: PIXI.BLEND_MODES.NORMAL,
    animationFPS: 30,
    playAnimationOnStart: false,
    loopAnimation: true,
    visible: true,
    group: "ungrouped",
    texture: "pluming-container",
    onStep: function () {
        
    },
    onDraw: function () {
        
    },
    onDestroy: function () {
        
    },
    onCreate: function () {
        
    },
    extends: {}
};
ct.templates.list['PlumbingContainer'] = [];
        
ct.templates.templates["PipeColorMarker"] = {
    depth: 0,
    blendMode: PIXI.BLEND_MODES.NORMAL,
    animationFPS: 30,
    playAnimationOnStart: false,
    loopAnimation: true,
    visible: true,
    group: "ungrouped",
    texture: "pipe-end-block",
    onStep: function () {
        /* template PipeColorMarker — core_OnStep (On frame start event) */
{
this.move();
}

    },
    onDraw: function () {
        
    },
    onDestroy: function () {
        
    },
    onCreate: function () {
        
    },
    extends: {}
};
ct.templates.list['PipeColorMarker'] = [];
        
ct.templates.templates["Empty"] = {
    depth: 0,
    blendMode: PIXI.BLEND_MODES.NORMAL,
    animationFPS: 30,
    playAnimationOnStart: false,
    loopAnimation: true,
    visible: true,
    group: "ungrouped",
    texture: "pipe-empty",
    onStep: function () {
        
    },
    onDraw: function () {
        
    },
    onDestroy: function () {
        
    },
    onCreate: function () {
        
    },
    extends: {}
};
ct.templates.list['Empty'] = [];
        
ct.templates.templates["AbstractEnemy"] = {
    depth: 0,
    blendMode: PIXI.BLEND_MODES.NORMAL,
    animationFPS: 30,
    playAnimationOnStart: false,
    loopAnimation: true,
    visible: true,
    group: "ungrouped",
    
    onStep: function () {
        /* template AbstractEnemy — place_collisionTemplate (Collision with a template event) */
{
    const other = ct.place.meet(this, 'chimp');
    if (ct.templates.valid(other)) {
        console.log("Common collide - not firing?!");
    }
}


    },
    onDraw: function () {
        
    },
    onDestroy: function () {
        
    },
    onCreate: function () {
        
    },
    extends: {}
};
ct.templates.list['AbstractEnemy'] = [];
        
ct.templates.templates["magnifier"] = {
    depth: 0,
    blendMode: PIXI.BLEND_MODES.NORMAL,
    animationFPS: 30,
    playAnimationOnStart: false,
    loopAnimation: true,
    visible: true,
    group: "ungrouped",
    texture: "magnifier",
    onStep: function () {
        /* template magnifier — core_OnStep (On frame start event) */
{
let symbol = getSymbol();
if ( ! symbol) return;
// if (this.symbol = symbol) return;
this.symbol = symbol;

if ( ! isUnlocked(symbol)) {
    return;
}

if ( ! this.theta) this.theta = 0;
this.theta += 0.01*ct.delta;


const pg = new PIXI.Graphics();

// TODO sit pg behind this
// pg.x = this.x;
// pg.y = this.y;
// this.parent.addChild(pg);

this.addChild(pg);
const RADIUS = (this.height*0.35)

// black backdrop
pg.clear();
pg.beginFill(0x000000, 0.5);
// pg.drawRect(0,0,5,5);
pg.drawCircle(0, 0, RADIUS);

// draw the atom
let info = info4symbol[symbol];
let orbitals = info.electron_configuration.split(" ");
let lasto = orbitals[orbitals.length-1];
let maxn = new Number(lasto[0]);

const R = RADIUS / (1+maxn);
// console.log(R, RADIUS, maxn);
// console.log(info);
let n = info.atomic_number;
// spiral nucleus
for(let i=0; i<2*n; i++) {
    let nmi = 2*n - i;
    let a = 0.5 + (i/(4*n));
    pg.beginFill(i%2===0? 0xcccccc : 0xff3333, a);
    let x = 0.1*R * Math.sqrt(nmi)*Math.cos(1*i);
    let y = 0.1*R * Math.sqrt(nmi)*Math.sin(1*i);
    pg.drawCircle(x, y, 2);
}
// electron_configuration 1s^2
let now = new Date().getTime();
let blink = 0x6666cc;
let blinkAlpha = Math.cos(now/500);

for(let i=0; i<orbitals.length; i++) {
    let orbital = orbitals[i];
    if (orbital[0] === "[") continue; // TODO draw e.g. Silver = "[Kr] 4d^10 5s^1"
    let r = R * new Number(orbital[0]);
    let n = new Number(orbital.substr(orbital.indexOf("^")+1));
    let shell = orbital.substr(0, orbital.indexOf("^"));
    let shellSize = size4shell[shell];
    assert(shellSize, orbital);
    let spread = 2*Math.PI/shellSize;
    for(let e=0; e<shellSize; e++) {
        let x = r*Math.cos(spread*(e+i*0.5) +this.theta/(i+1));
        let y = r*Math.sin(spread*(e+i*0.5) +this.theta/(i+1));
        if (e<n) {
            pg.beginFill(0x0000ff);
        } else {
            // missing electrons in the valence shell
            if (blinkAlpha <= 0) continue;
            pg.beginFill(blink, blinkAlpha); 
        }
        pg.drawCircle(x, y, 2);
    }
}
}

    },
    onDraw: function () {
        
    },
    onDestroy: function () {
        
    },
    onCreate: function () {
        /* template magnifier — core_OnCreate (On create event) */
{

}

    },
    extends: {}
};
ct.templates.list['magnifier'] = [];
        
    /* eslint-disable max-lines-per-function */
(function ctTransitionTemplates() {
    const devourer = () => {
        void 0;
    };
    ct.templates.templates.CTTRANSITION_FADE = {
        onStep() {
            void 0;
        },
        onDraw() {
            void 0;
        },
        onDestroy() {
            ct.rooms.remove(this.room);
        },
        onCreate() {
            this.tex = -1;
            this.overlay = new PIXI.Graphics();
            this.overlay.beginFill(this.color);
            this.overlay.drawRect(0, 0, ct.camera.width + 1, ct.camera.height + 1);
            this.overlay.endFill();
            this.overlay.alpha = this.in ? 1 : 0;
            this.addChild(this.overlay);
            this.promise = ct.tween.add({
                obj: this.overlay,
                fields: {
                    alpha: this.in ? 0 : 1
                },
                duration: this.duration,
                silent: true
            }).then(() => {
                this.kill = true;
            });
        }
    };
    ct.templates.templates.CTTRANSITION_SCALE = {
        onStep() {
            void 0;
        },
        onDraw() {
            void 0;
        },
        onDestroy() {
            ct.rooms.remove(this.room);
        },
        onCreate() {
            this.tex = -1;
            this.overlay = new PIXI.Graphics();
            this.overlay.beginFill(this.color);
            this.overlay.drawRect(0, 0, ct.camera.width + 1, ct.camera.height + 1);
            this.overlay.endFill();
            this.overlay.alpha = this.in ? 1 : 0;
            this.addChild(this.overlay);
            var sourceX = ct.camera.scale.x,
                sourceY = ct.camera.scale.y,
                endX = this.in ? sourceX : sourceX * this.scaling,
                endY = this.in ? sourceY : sourceY * this.scaling,
                startX = this.in ? sourceX * this.scaling : sourceX,
                startY = this.in ? sourceY * this.scaling : sourceY;
            ct.camera.scale.x = startX;
            ct.camera.scale.y = startY;
            this.promise = ct.tween.add({
                obj: ct.camera.scale,
                fields: {
                    x: endX,
                    y: endY
                },
                duration: this.duration,
                silent: true
            }).then(() => {
                ct.camera.scale.x = sourceX;
                ct.camera.scale.y = sourceY;
                this.kill = true;
            });
            ct.tween.add({
                obj: this.overlay,
                fields: {
                    alpha: this.in ? 0 : 1
                },
                duration: this.duration,
                silent: true
            })
            .catch(devourer);
        }
    };
    ct.templates.templates.CTTRANSITION_SLIDE = {
        onStep() {
            void 0;
        },
        onDraw() {
            void 0;
        },
        onDestroy() {
            ct.rooms.remove(this.room);
        },
        onCreate() {
            this.tex = -1;
            this.overlay = new PIXI.Graphics();
            this.overlay.beginFill(this.color);
            this.overlay.drawRect(0, 0, (ct.camera.width + 1), (ct.camera.height + 1));
            this.overlay.endFill();

            if (this.endAt === 'left' || this.endAt === 'right') {
                this.scale.x = this.in ? 1 : 0;
                this.promise = ct.tween.add({
                    obj: this.scale,
                    fields: {
                        x: this.in ? 0 : 1
                    },
                    duration: this.duration,
                    curve: ct.tween.easeOutQuart,
                    silent: true
                }).then(() => {
                    this.kill = true;
                });
            } else {
                this.scale.y = this.in ? 1 : 0;
                this.promise = ct.tween.add({
                    obj: this.scale,
                    fields: {
                        y: this.in ? 0 : 1
                    },
                    duration: this.duration,
                    curve: ct.tween.easeOutQuart,
                    silent: true
                }).then(() => {
                    this.kill = true;
                });
            }
            if (!this.in && this.endAt === 'left') {
                this.x = (ct.camera.width + 1);
                ct.tween.add({
                    obj: this,
                    fields: {
                        x: 0
                    },
                    duration: this.duration,
                    curve: ct.tween.easeOutQuart,
                    silent: true
                })
                .catch(devourer);
            }
            if (!this.in && this.endAt === 'top') {
                this.y = (ct.camera.height + 1);
                ct.tween.add({
                    obj: this,
                    fields: {
                        y: 0
                    },
                    duration: this.duration,
                    curve: ct.tween.easeOutQuart,
                    silent: true
                })
                .catch(devourer);
            }
            if (this.in && this.endAt === 'right') {
                ct.tween.add({
                    obj: this,
                    fields: {
                        x: (ct.camera.width + 1)
                    },
                    duration: this.duration,
                    curve: ct.tween.easeOutQuart,
                    silent: true
                })
                .catch(devourer);
            }
            if (this.in && this.endAt === 'bottom') {
                ct.tween.add({
                    obj: this,
                    fields: {
                        y: (ct.camera.height + 1)
                    },
                    duration: this.duration,
                    curve: ct.tween.easeOutQuart,
                    silent: true
                })
                .catch(devourer);
            }

            this.addChild(this.overlay);
        }
    };

    ct.templates.templates.CTTRANSITION_CIRCLE = {
        onStep() {
            void 0;
        },
        onDraw() {
            void 0;
        },
        onDestroy() {
            ct.rooms.remove(this.room);
        },
        onCreate() {
            this.tex = -1;
            this.x = (ct.camera.width + 1) / 2;
            this.y = (ct.camera.height + 1) / 2;
            this.overlay = new PIXI.Graphics();
            this.overlay.beginFill(this.color);
            this.overlay.drawCircle(
                0,
                0,
                ct.u.pdc(0, 0, (ct.camera.width + 1) / 2, (ct.camera.height + 1) / 2)
            );
            this.overlay.endFill();
            this.addChild(this.overlay);
            this.scale.x = this.scale.y = this.in ? 0 : 1;
            this.promise = ct.tween.add({
                obj: this.scale,
                fields: {
                    x: this.in ? 1 : 0,
                    y: this.in ? 1 : 0
                },
                duration: this.duration,
                silent: true
            }).then(() => {
                this.kill = true;
            });
        }
    };
})();
(function vkeysTemplates() {
    ct.templates.templates.VKEY = {
        onStep: function () {
            var down = false,
                hover = false;
            if (ct.mouse) {
                if (ct.mouse.hoversUi(this)) {
                    hover = true;
                    if (ct.mouse.down) {
                        down = true;
                    }
                }
            }
            if (ct.touch) {
                for (const touch of ct.touch.events) {
                    if (ct.touch.collideUi(this, touch.id)) {
                        down = hover = true;
                        break;
                    }
                }
            }
            if (ct.pointer) {
                if (ct.pointer.hoversUi(this)) {
                    hover = true;
                    if (ct.pointer.collidesUi(this)) {
                        down = true;
                    }
                }
            }

            if (down) {
                this.tex = this.opts.texActive || this.opts.texNormal;
                ct.inputs.registry['vkeys.' + this.opts.key] = 1;
            } else {
                ct.inputs.registry['vkeys.' + this.opts.key] = 0;
                if (hover) {
                    this.tex = this.opts.texHover || this.opts.texNormal;
                } else {
                    this.tex = this.opts.texNormal;
                }
            }
        },
        onDraw: function () {
            this.x = (typeof this.opts.x === 'function') ? this.opts.x() : this.opts.x;
            this.y = (typeof this.opts.y === 'function') ? this.opts.y() : this.opts.y;
        },
        onDestroy: function () {
            void 0;
        },
        onCreate: function () {
            this.tex = this.opts.texNormal;
            this.depth = this.opts.depth;
            this.alpha = this.opts.alpha;
        }
    };

    ct.templates.templates.VJOYSTICK = {
        onCreate: function () {
            this.tex = this.opts.tex;
            this.depth = this.opts.depth;
            this.alpha = this.opts.alpha;
            this.down = false;
            this.trackball = new PIXI.Sprite(ct.res.getTexture(this.opts.trackballTex, 0));
            this.addChild(this.trackball);
        },
        // eslint-disable-next-line complexity
        onStep: function () {
            var dx = 0,
                dy = 0;
            if (ct.mouse) {
                if (ct.mouse.hoversUi(this)) {
                    if (ct.mouse.down) {
                        this.down = true;
                    }
                }
                if (ct.mouse.released) {
                    this.down = false;
                }
                if (this.down) {
                    dx = ct.mouse.xui - this.x;
                    dy = ct.mouse.yui - this.y;
                }
            }
            if (ct.touch) {
                if (!this.touchId) {
                    for (const touch of ct.touch.events) {
                        if (ct.touch.collideUi(this, touch.id)) {
                            this.down = true;
                            this.touchId = touch.id;
                            break;
                        }
                    }
                }
                var touch = ct.touch.getById(this.touchId);
                if (touch) {
                    dx = touch.xui - this.x;
                    dy = touch.yui - this.y;
                } else {
                    this.touchId = false;
                    this.down = false;
                }
            }
            if (ct.pointer) {
                if (this.trackedPointer && !ct.pointer.down.includes(this.trackedPointer)) {
                    this.trackedPointer = void 0;
                }
                if (!this.trackedPointer) {
                    const pointer = ct.pointer.collidesUi(this);
                    if (pointer) {
                        this.down = true;
                        this.trackedPointer = pointer;
                    }
                }
                if (this.trackedPointer) {
                    dx = this.trackedPointer.xui - this.x;
                    dy = this.trackedPointer.yui - this.y;
                } else {
                    this.touchId = false;
                    this.down = false;
                }
            }
            var r = this.shape.r || this.shape.right || 64;
            if (this.down) {
                dx /= r;
                dy /= r;
                var length = Math.hypot(dx, dy);
                if (length > 1) {
                    dx /= length;
                    dy /= length;
                }
                ct.inputs.registry['vkeys.' + this.opts.key + 'X'] = dx;
                ct.inputs.registry['vkeys.' + this.opts.key + 'Y'] = dy;
            } else {
                ct.inputs.registry['vkeys.' + this.opts.key + 'X'] = 0;
                ct.inputs.registry['vkeys.' + this.opts.key + 'Y'] = 0;
            }
            this.trackball.x = dx * r;
            this.trackball.y = dy * r;
        },
        onDraw: function () {
            this.x = (typeof this.opts.x === 'function') ? this.opts.x() : this.opts.x;
            this.y = (typeof this.opts.y === 'function') ? this.opts.y() : this.opts.y;
        },
        onDestroy: function () {
            void 0;
        }
    };
})();


    ct.templates.beforeStep = function beforeStep() {
        
    };
    ct.templates.afterStep = function afterStep() {
        
    };
    ct.templates.beforeDraw = function beforeDraw() {
        if ([false][0] && this instanceof ct.templates.Copy) {
    const inverse = this.transform.localTransform.clone().invert();
    this.$cDebugCollision.transform.setFromMatrix(inverse);
    this.$cDebugCollision.position.set(0, 0);
    this.$cDebugText.transform.setFromMatrix(inverse);
    this.$cDebugText.position.set(0, 0);

    const newtext = `Partitions: ${this.$chashes.join(', ')}
CGroup: ${this.cgroup || 'unset'}
Shape: ${(this._shape && this._shape.__type) || 'unused'}`;
    if (this.$cDebugText.text !== newtext) {
        this.$cDebugText.text = newtext;
    }
    this.$cDebugCollision
    .clear();
    ct.place.drawDebugGraphic.apply(this);
    this.$cHadCollision = false;
}

    };
    ct.templates.afterDraw = function afterDraw() {
        /* eslint-disable no-underscore-dangle */
if ((this.transform && (this.transform._localID !== this.transform._currentLocalID)) ||
    this.x !== this.xprev ||
    this.y !== this.yprev
) {
    delete this._shape;
    const oldHashes = this.$chashes || [];
    this.$chashes = ct.place.getHashes(this);
    for (const hash of oldHashes) {
        if (this.$chashes.indexOf(hash) === -1) {
            ct.place.grid[hash].splice(ct.place.grid[hash].indexOf(this), 1);
        }
    }
    for (const hash of this.$chashes) {
        if (oldHashes.indexOf(hash) === -1) {
            if (!(hash in ct.place.grid)) {
                ct.place.grid[hash] = [this];
            } else {
                ct.place.grid[hash].push(this);
            }
        }
    }
}

    };
    ct.templates.onDestroy = function onDestroy() {
        if (this.$chashes) {
    for (const hash of this.$chashes) {
        ct.place.grid[hash].splice(ct.place.grid[hash].indexOf(this), 1);
    }
}

    };
})(ct);
/**
 * @extends {PIXI.TilingSprite}
 * @property {number} shiftX How much to shift the texture horizontally, in pixels.
 * @property {number} shiftY How much to shift the texture vertically, in pixels.
 * @property {number} movementX The speed at which the background's texture moves by X axis,
 * wrapping around its area. The value is measured in pixels per frame, and takes
 * `ct.delta` into account.
 * @property {number} movementY The speed at which the background's texture moves by Y axis,
 * wrapping around its area. The value is measured in pixels per frame, and takes
 * `ct.delta` into account.
 * @property {number} parallaxX A value that makes background move faster
 * or slower relative to other objects. It is often used to create an effect of depth.
 * `1` means regular movement, values smaller than 1
 * will make it move slower and make an effect that a background is placed farther away from camera;
 * values larger than 1 will do the opposite, making the background appear closer than the rest
 * of object.
 * This property is for horizontal movement.
 * @property {number} parallaxY A value that makes background move faster
 * or slower relative to other objects. It is often used to create an effect of depth.
 * `1` means regular movement, values smaller than 1
 * will make it move slower and make an effect that a background is placed farther away from camera;
 * values larger than 1 will do the opposite, making the background appear closer than the rest
 * of object.
 * This property is for vertical movement.
 * @class
 */
class Background extends PIXI.TilingSprite {
    constructor(texName, frame = 0, depth = 0, exts = {}) {
        var width = ct.camera.width,
            height = ct.camera.height;
        const texture = texName instanceof PIXI.Texture ?
            texName :
            ct.res.getTexture(texName, frame || 0);
        if (exts.repeat === 'no-repeat' || exts.repeat === 'repeat-x') {
            height = texture.height * (exts.scaleY || 1);
        }
        if (exts.repeat === 'no-repeat' || exts.repeat === 'repeat-y') {
            width = texture.width * (exts.scaleX || 1);
        }
        super(texture, width, height);
        if (!ct.backgrounds.list[texName]) {
            ct.backgrounds.list[texName] = [];
        }
        ct.backgrounds.list[texName].push(this);
        ct.templates.list.BACKGROUND.push(this);
        ct.stack.push(this);
        this.anchor.x = this.anchor.y = 0;
        this.depth = depth;
        this.shiftX = this.shiftY = this.movementX = this.movementY = 0;
        this.parallaxX = this.parallaxY = 1;
        if (exts) {
            ct.u.extend(this, exts);
        }
        if (this.scaleX) {
            this.tileScale.x = Number(this.scaleX);
        }
        if (this.scaleY) {
            this.tileScale.y = Number(this.scaleY);
        }
        this.reposition();
    }
    onStep() {
        this.shiftX += ct.delta * this.movementX;
        this.shiftY += ct.delta * this.movementY;
    }
    /**
     * Updates the position of this background.
     */
    reposition() {
        const cameraBounds = this.isUi ?
            {
                x: 0, y: 0, width: ct.camera.width, height: ct.camera.height
            } :
            ct.camera.getBoundingBox();
        const dx = ct.camera.x - ct.camera.width / 2,
              dy = ct.camera.y - ct.camera.height / 2;
        if (this.repeat !== 'repeat-x' && this.repeat !== 'no-repeat') {
            this.y = cameraBounds.y;
            this.tilePosition.y = -this.y - dy * (this.parallaxY - 1) + this.shiftY;
            this.height = cameraBounds.height + 1;
        } else {
            this.y = this.shiftY + cameraBounds.y * (this.parallaxY - 1);
        }
        if (this.repeat !== 'repeat-y' && this.repeat !== 'no-repeat') {
            this.x = cameraBounds.x;
            this.tilePosition.x = -this.x - dx * (this.parallaxX - 1) + this.shiftX;
            this.width = cameraBounds.width + 1;
        } else {
            this.x = this.shiftX + cameraBounds.x * (this.parallaxX - 1);
        }
    }
    onDraw() {
        this.reposition();
    }
    static onCreate() {
        void 0;
    }
    static onDestroy() {
        void 0;
    }
    get isUi() {
        return this.parent ? Boolean(this.parent.isUi) : false;
    }
}
/**
 * @namespace
 */
ct.backgrounds = {
    Background,
    /**
     * An object that contains all the backgrounds of the current room.
     * @type {Object.<string,Array<Background>>}
     */
    list: {},
    /**
     * @param texName - Name of a texture to use as a background
     * @param [frame] - The index of a frame to use. Defaults to 0
     * @param [depth] - The depth to place the background at. Defaults to 0
     * @param [container] - Where to put the background. Defaults to current room,
     * can be a room or other pixi container.
     * @returns {Background} The created background
     */
    add(texName, frame = 0, depth = 0, container = ct.room) {
        if (!texName) {
            throw new Error('[ct.backgrounds] The texName argument is required.');
        }
        const bg = new Background(texName, frame, depth);
        container.addChild(bg);
        return bg;
    }
};
ct.templates.Background = Background;

/**
 * @extends {PIXI.Container}
 * @class
 */
class Tilemap extends PIXI.Container {
    /**
     * @param {object} template A template object that contains data about depth
     * and tile placement. It is usually used by ct.IDE.
     */
    constructor(template) {
        super();
        this.pixiTiles = [];
        if (template) {
            this.depth = template.depth;
            this.tiles = template.tiles.map(tile => ({
                ...tile
            }));
            if (template.extends) {
                Object.assign(this, template.extends);
            }
            for (let i = 0, l = template.tiles.length; i < l; i++) {
                const tile = template.tiles[i];
                const textures = ct.res.getTexture(tile.texture);
                const sprite = new PIXI.Sprite(textures[tile.frame]);
                sprite.anchor.x = textures[0].defaultAnchor.x;
                sprite.anchor.y = textures[0].defaultAnchor.y;
                sprite.shape = textures.shape;
                sprite.scale.set(tile.scale.x, tile.scale.y);
                sprite.rotation = tile.rotation;
                sprite.alpha = tile.opacity;
                sprite.tint = tile.tint;
                sprite.x = tile.x;
                sprite.y = tile.y;
                this.addChild(sprite);
                this.pixiTiles.push(sprite);
                this.tiles[i].sprite = sprite;
            }
        } else {
            this.tiles = [];
        }
        ct.templates.list.TILEMAP.push(this);
    }
    /**
     * Adds a tile to the tilemap. Will throw an error if a tilemap is cached.
     * @param {string} textureName The name of the texture to use
     * @param {number} x The horizontal location of the tile
     * @param {number} y The vertical location of the tile
     * @param {number} [frame] The frame to pick from the source texture. Defaults to 0.
     * @returns {PIXI.Sprite} The created tile
     */
    addTile(textureName, x, y, frame = 0) {
        if (this.cached) {
            throw new Error('[ct.tiles] Adding tiles to cached tilemaps is forbidden. Create a new tilemap, or add tiles before caching the tilemap.');
        }
        const texture = ct.res.getTexture(textureName, frame);
        const sprite = new PIXI.Sprite(texture);
        sprite.x = x;
        sprite.y = y;
        sprite.shape = texture.shape;
        this.tiles.push({
            texture: textureName,
            frame,
            x,
            y,
            width: sprite.width,
            height: sprite.height,
            sprite
        });
        this.addChild(sprite);
        this.pixiTiles.push(sprite);
        return sprite;
    }
    /**
     * Enables caching on this tileset, freezing it and turning it
     * into a series of bitmap textures. This proides great speed boost,
     * but prevents further editing.
     */
    cache(chunkSize = 1024) {
        if (this.cached) {
            throw new Error('[ct.tiles] Attempt to cache an already cached tilemap.');
        }

        // Divide tiles into a grid of larger cells so that we can cache these cells as
        // separate bitmaps
        const bounds = this.getLocalBounds();
        const cols = Math.ceil(bounds.width / chunkSize),
              rows = Math.ceil(bounds.height / chunkSize);
        this.cells = [];
        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
                const cell = new PIXI.Container();
                this.cells.push(cell);
            }
        }
        for (let i = 0, l = this.tiles.length; i < l; i++) {
            const tile = this.children[0],
                  // Sometimes indices exceed the range due to JS rounding errors
                  //  on map's boundaries, thus the clamping.
                  x = ct.u.clamp(0, Math.floor(tile.x - bounds.x / chunkSize), cols - 1),
                  y = ct.u.clamp(0, Math.floor(tile.y - bounds.y / chunkSize), rows - 1);
            this.cells[y * cols + x].addChild(tile);
        }
        this.removeChildren();

        // Filter out empty cells, cache the filled ones
        for (let i = 0, l = this.cells.length; i < l; i++) {
            if (this.cells[i].children.length === 0) {
                this.cells.splice(i, 1);
                i--;
                l--;
                continue;
            }
            this.addChild(this.cells[i]);
            this.cells[i].cacheAsBitmap = true;
        }

        this.cached = true;
    }
    /**
     * Enables caching on this tileset, freezing it and turning it
     * into a series of bitmap textures. This proides great speed boost,
     * but prevents further editing.
     *
     * This version packs tiles into rhombus-shaped chunks, and sorts them
     * from top to bottom. This fixes seam issues for isometric games.
     */
    cacheDiamond(chunkSize = 1024) {
        if (this.cached) {
            throw new Error('[ct.tiles] Attempt to cache an already cached tilemap.');
        }

        this.cells = [];
        this.diamondCellMap = {};
        for (let i = 0, l = this.tiles.length; i < l; i++) {
            const tile = this.children[0];
            const [xNormalized, yNormalized] = ct.u.rotate(tile.x, tile.y * 2, -45);
            const x = Math.floor(xNormalized / chunkSize),
                  y = Math.floor(yNormalized / chunkSize),
                  key = `${x}:${y}`;
            if (!(key in this.diamondCellMap)) {
                const chunk = new PIXI.Container();
                chunk.chunkX = x;
                chunk.chunkY = y;
                this.diamondCellMap[key] = chunk;
                this.cells.push(chunk);
            }
            this.diamondCellMap[key].addChild(tile);
        }
        this.removeChildren();

        this.cells.sort((a, b) => {
            const maxA = Math.max(a.chunkY, a.chunkX),
                  maxB = Math.max(b.chunkY, b.chunkX);
            if (maxA === maxB) {
                return b.chunkX - a.chunkX;
            }
            return maxA - maxB;
        });

        for (let i = 0, l = this.cells.length; i < l; i++) {
            this.addChild(this.cells[i]);
            this.cells[i].cacheAsBitmap = true;
        }

        this.cached = true;
    }
}
ct.templates.Tilemap = Tilemap;

/**
 * @namespace
 */
ct.tilemaps = {
    /**
     * Creates a new tilemap at a specified depth, and adds it to the main room (ct.room).
     * @param {number} [depth] The depth of a newly created tilemap. Defaults to 0.
     * @returns {Tilemap} The created tilemap.
     */
    create(depth = 0) {
        const tilemap = new Tilemap();
        tilemap.depth = depth;
        ct.room.addChild(tilemap);
        return tilemap;
    },
    /**
     * Adds a tile to the specified tilemap. It is the same as
     * calling `tilemap.addTile(textureName, x, y, frame).
     * @param {Tilemap} tilemap The tilemap to modify.
     * @param {string} textureName The name of the texture to use.
     * @param {number} x The horizontal location of the tile.
     * @param {number} y The vertical location of the tile.
     * @param {number} [frame] The frame to pick from the source texture. Defaults to 0.
     * @returns {PIXI.Sprite} The created tile
     */
    addTile(tilemap, textureName, x, y, frame = 0) {
        return tilemap.addTile(textureName, x, y, frame);
    },
    /**
     * Enables caching on this tileset, freezing it and turning it
     * into a series of bitmap textures. This proides great speed boost,
     * but prevents further editing.
     *
     * This is the same as calling `tilemap.cache();`
     *
     * @param {Tilemap} tilemap The tilemap which needs to be cached.
     * @param {number} chunkSize The size of one chunk.
     */
    cache(tilemap, chunkSize) {
        tilemap.cache(chunkSize);
    },
    /**
     * Enables caching on this tileset, freezing it and turning it
     * into a series of bitmap textures. This proides great speed boost,
     * but prevents further editing.
     *
     * This version packs tiles into rhombus-shaped chunks, and sorts them
     * from top to bottom. This fixes seam issues for isometric games.
     * Note that tiles should be placed on a flat plane for the proper sorting.
     * If you need an effect of elevation, consider shifting each tile with
     * tile.pivot.y property.
     *
     * This is the same as calling `tilemap.cacheDiamond();`
     *
     * @param {Tilemap} tilemap The tilemap which needs to be cached.
     * @param {number} chunkSize The size of one chunk.
     */
    cacheDiamond(tilemap, chunkSize) {
        tilemap.cacheDiamond(chunkSize);
    }
};

/**
 * This class represents a camera that is used by ct.js' cameras.
 * Usually you won't create new instances of it, but if you need, you can substitute
 * ct.camera with a new one.
 *
 * @extends {PIXI.DisplayObject}
 * @class
 *
 * @property {number} x The real x-coordinate of the camera.
 * It does not have a screen shake effect applied, as well as may differ from `targetX`
 * if the camera is in transition.
 * @property {number} y The real y-coordinate of the camera.
 * It does not have a screen shake effect applied, as well as may differ from `targetY`
 * if the camera is in transition.
 * @property {number} width The width of the unscaled shown region.
 * This is the base, unscaled value. Use ct.camera.scale.x to get a scaled version.
 * To change this value, see `ct.width` property.
 * @property {number} height The width of the unscaled shown region.
 * This is the base, unscaled value. Use ct.camera.scale.y to get a scaled version.
 * To change this value, see `ct.height` property.
 * @property {number} targetX The x-coordinate of the target location.
 * Moving it instead of just using the `x` parameter will trigger the drift effect.
 * @property {number} targetY The y-coordinate of the target location.
 * Moving it instead of just using the `y` parameter will trigger the drift effect.
 *
 * @property {Copy|false} follow If set, the camera will follow the given copy.
 * @property {boolean} followX Works if `follow` is set to a copy.
 * Enables following in X axis. Set it to `false` and followY to `true`
 * to limit automatic camera movement to vertical axis.
 * @property {boolean} followY Works if `follow` is set to a copy.
 * Enables following in Y axis. Set it to `false` and followX to `true`
 * to limit automatic camera movement to horizontal axis.
 * @property {number|null} borderX Works if `follow` is set to a copy.
 * Sets the frame inside which the copy will be kept, in game pixels.
 * Can be set to `null` so the copy is set to the center of the screen.
 * @property {number|null} borderY Works if `follow` is set to a copy.
 * Sets the frame inside which the copy will be kept, in game pixels.
 * Can be set to `null` so the copy is set to the center of the screen.
 * @property {number} shiftX Displaces the camera horizontally
 * but does not change x and y parameters.
 * @property {number} shiftY Displaces the camera vertically
 * but does not change x and y parameters.
 * @property {number} drift Works if `follow` is set to a copy.
 * If set to a value between 0 and 1, it will make camera movement smoother
 *
 * @property {number} shake The current power of a screen shake effect,
 * relative to the screen's max side (100 is 100% of screen shake).
 * If set to 0 or less, it, disables the effect.
 * @property {number} shakePhase The current phase of screen shake oscillation.
 * @property {number} shakeDecay The amount of `shake` units substracted in a second.
 * Default is 5.
 * @property {number} shakeFrequency The base frequency of the screen shake effect.
 * Default is 50.
 * @property {number} shakeX A multiplier applied to the horizontal screen shake effect.
 * Default is 1.
 * @property {number} shakeY A multiplier applied to the vertical screen shake effect.
 * Default is 1.
 * @property {number} shakeMax The maximum possible value for the `shake` property
 * to protect players from losing their monitor, in `shake` units. Default is 10.
 */
const Camera = (function Camera() {
    const shakeCamera = function shakeCamera(camera, delta) {
        const sec = delta / (PIXI.Ticker.shared.maxFPS || 60);
        camera.shake -= sec * camera.shakeDecay;
        camera.shake = Math.max(0, camera.shake);
        if (camera.shakeMax) {
            camera.shake = Math.min(camera.shake, camera.shakeMax);
        }
        const phaseDelta = sec * camera.shakeFrequency;
        camera.shakePhase += phaseDelta;
        // no logic in these constants
        // They are used to desync fluctuations and remove repetitive circular movements
        camera.shakePhaseX += phaseDelta * (1 + Math.sin(camera.shakePhase * 0.1489) * 0.25);
        camera.shakePhaseY += phaseDelta * (1 + Math.sin(camera.shakePhase * 0.1734) * 0.25);
    };
    const followCamera = function followCamera(camera) {
        // eslint-disable-next-line max-len
        const bx = camera.borderX === null ? camera.width / 2 : Math.min(camera.borderX, camera.width / 2),
              // eslint-disable-next-line max-len
              by = camera.borderY === null ? camera.height / 2 : Math.min(camera.borderY, camera.height / 2);
        const tl = camera.uiToGameCoord(bx, by),
              br = camera.uiToGameCoord(camera.width - bx, camera.height - by);

        if (camera.followX) {
            if (camera.follow.x < tl.x - camera.interpolatedShiftX) {
                camera.targetX = camera.follow.x - bx + camera.width / 2;
            } else if (camera.follow.x > br.x - camera.interpolatedShiftX) {
                camera.targetX = camera.follow.x + bx - camera.width / 2;
            }
        }
        if (camera.followY) {
            if (camera.follow.y < tl.y - camera.interpolatedShiftY) {
                camera.targetY = camera.follow.y - by + camera.height / 2;
            } else if (camera.follow.y > br.y - camera.interpolatedShiftY) {
                camera.targetY = camera.follow.y + by - camera.height / 2;
            }
        }
    };
    const restrictInRect = function restrictInRect(camera) {
        if (camera.minX !== void 0) {
            const boundary = camera.minX + camera.width * camera.scale.x * 0.5;
            camera.x = Math.max(boundary, camera.x);
            camera.targetX = Math.max(boundary, camera.targetX);
        }
        if (camera.maxX !== void 0) {
            const boundary = camera.maxX - camera.width * camera.scale.x * 0.5;
            camera.x = Math.min(boundary, camera.x);
            camera.targetX = Math.min(boundary, camera.targetX);
        }
        if (camera.minY !== void 0) {
            const boundary = camera.minY + camera.height * camera.scale.y * 0.5;
            camera.y = Math.max(boundary, camera.y);
            camera.targetY = Math.max(boundary, camera.targetY);
        }
        if (camera.maxY !== void 0) {
            const boundary = camera.maxY - camera.height * camera.scale.y * 0.5;
            camera.y = Math.min(boundary, camera.y);
            camera.targetY = Math.min(boundary, camera.targetY);
        }
    };
    class Camera extends PIXI.DisplayObject {
        constructor(x, y, w, h) {
            super();
            this.follow = this.rotate = false;
            this.followX = this.followY = true;
            this.targetX = this.x = x;
            this.targetY = this.y = y;
            this.z = 500;
            this.width = w || 1920;
            this.height = h || 1080;
            this.shiftX = this.shiftY = this.interpolatedShiftX = this.interpolatedShiftY = 0;
            this.borderX = this.borderY = null;
            this.drift = 0;

            this.shake = 0;
            this.shakeDecay = 5;
            this.shakeX = this.shakeY = 1;
            this.shakeFrequency = 50;
            this.shakePhase = this.shakePhaseX = this.shakePhaseY = 0;
            this.shakeMax = 10;

            this.getBounds = this.getBoundingBox;
        }

        get scale() {
            return this.transform.scale;
        }
        set scale(value) {
            if (typeof value === 'number') {
                value = {
                    x: value,
                    y: value
                };
            }
            this.transform.scale.copyFrom(value);
        }

        /**
         * Moves the camera to a new position. It will have a smooth transition
         * if a `drift` parameter is set.
         * @param {number} x New x coordinate
         * @param {number} y New y coordinate
         * @returns {void}
         */
        moveTo(x, y) {
            this.targetX = x;
            this.targetY = y;
        }

        /**
         * Moves the camera to a new position. Ignores the `drift` value.
         * @param {number} x New x coordinate
         * @param {number} y New y coordinate
         * @returns {void}
         */
        teleportTo(x, y) {
            this.targetX = this.x = x;
            this.targetY = this.y = y;
            this.shakePhase = this.shakePhaseX = this.shakePhaseY = 0;
            this.interpolatedShiftX = this.shiftX;
            this.interpolatedShiftY = this.shiftY;
        }

        /**
         * Updates the position of the camera
         * @param {number} delta A delta value between the last two frames.
         * This is usually ct.delta.
         * @returns {void}
         */
        update(delta) {
            shakeCamera(this, delta);
            // Check if we've been following a copy that is now killed
            if (this.follow && this.follow.kill) {
                this.follow = false;
            }
            // Autofollow the first copy of the followed template, set in the room's settings
            if (!this.follow && ct.room.follow) {
                this.follow = ct.templates.list[ct.room.follow][0];
            }
            // Follow copies around
            if (this.follow && ('x' in this.follow) && ('y' in this.follow)) {
                followCamera(this);
            }

            // The speed of drift movement
            const speed = this.drift ? Math.min(1, (1 - this.drift) * delta) : 1;
            // Perform drift motion
            this.x = this.targetX * speed + this.x * (1 - speed);
            this.y = this.targetY * speed + this.y * (1 - speed);

            // Off-center shifts drift, too
            this.interpolatedShiftX = this.shiftX * speed + this.interpolatedShiftX * (1 - speed);
            this.interpolatedShiftY = this.shiftY * speed + this.interpolatedShiftY * (1 - speed);

            restrictInRect(this);

            // Recover from possible calculation errors
            this.x = this.x || 0;
            this.y = this.y || 0;
        }

        /**
         * Returns the current camera position plus the screen shake effect.
         * @type {number}
         */
        get computedX() {
            // eslint-disable-next-line max-len
            const dx = (Math.sin(this.shakePhaseX) + Math.sin(this.shakePhaseX * 3.1846) * 0.25) / 1.25;
            // eslint-disable-next-line max-len
            const x = this.x + dx * this.shake * Math.max(this.width, this.height) / 100 * this.shakeX;
            return x + this.interpolatedShiftX;
        }
        /**
         * Returns the current camera position plus the screen shake effect.
         * @type {number}
         */
        get computedY() {
            // eslint-disable-next-line max-len
            const dy = (Math.sin(this.shakePhaseY) + Math.sin(this.shakePhaseY * 2.8948) * 0.25) / 1.25;
            // eslint-disable-next-line max-len
            const y = this.y + dy * this.shake * Math.max(this.width, this.height) / 100 * this.shakeY;
            return y + this.interpolatedShiftY;
        }

        /**
         * Returns the position of the left edge where the visible rectangle ends,
         * in game coordinates.
         * This can be used for UI positioning in game coordinates.
         * This does not count for rotations, though.
         * For rotated and/or scaled viewports, see `getTopLeftCorner`
         * and `getBottomLeftCorner` methods.
         * @returns {number} The location of the left edge.
         * @type {number}
         * @readonly
         */
        get left() {
            return this.computedX - (this.width / 2) * this.scale.x;
        }
        /**
         * Returns the position of the top edge where the visible rectangle ends,
         * in game coordinates.
         * This can be used for UI positioning in game coordinates.
         * This does not count for rotations, though.
         * For rotated and/or scaled viewports, see `getTopLeftCorner`
         * and `getTopRightCorner` methods.
         * @returns {number} The location of the top edge.
         * @type {number}
         * @readonly
         */
        get top() {
            return this.computedY - (this.height / 2) * this.scale.y;
        }
        /**
         * Returns the position of the right edge where the visible rectangle ends,
         * in game coordinates.
         * This can be used for UI positioning in game coordinates.
         * This does not count for rotations, though.
         * For rotated and/or scaled viewports, see `getTopRightCorner`
         * and `getBottomRightCorner` methods.
         * @returns {number} The location of the right edge.
         * @type {number}
         * @readonly
         */
        get right() {
            return this.computedX + (this.width / 2) * this.scale.x;
        }
        /**
         * Returns the position of the bottom edge where the visible rectangle ends,
         * in game coordinates. This can be used for UI positioning in game coordinates.
         * This does not count for rotations, though.
         * For rotated and/or scaled viewports, see `getBottomLeftCorner`
         * and `getBottomRightCorner` methods.
         * @returns {number} The location of the bottom edge.
         * @type {number}
         * @readonly
         */
        get bottom() {
            return this.computedY + (this.height / 2) * this.scale.y;
        }

        /**
         * Translates a point from UI space to game space.
         * @param {number} x The x coordinate in UI space.
         * @param {number} y The y coordinate in UI space.
         * @returns {PIXI.Point} A pair of new `x` and `y` coordinates.
         */
        uiToGameCoord(x, y) {
            const modx = (x - this.width / 2) * this.scale.x,
                  mody = (y - this.height / 2) * this.scale.y;
            const result = ct.u.rotate(modx, mody, this.angle);
            return new PIXI.Point(
                result.x + this.computedX,
                result.y + this.computedY
            );
        }

        /**
         * Translates a point from game space to UI space.
         * @param {number} x The x coordinate in game space.
         * @param {number} y The y coordinate in game space.
         * @returns {PIXI.Point} A pair of new `x` and `y` coordinates.
         */
        gameToUiCoord(x, y) {
            const relx = x - this.computedX,
                  rely = y - this.computedY;
            const unrotated = ct.u.rotate(relx, rely, -this.angle);
            return new PIXI.Point(
                unrotated.x / this.scale.x + this.width / 2,
                unrotated.y / this.scale.y + this.height / 2
            );
        }
        /**
         * Gets the position of the top-left corner of the viewport in game coordinates.
         * This is useful for positioning UI elements in game coordinates,
         * especially with rotated viewports.
         * @returns {PIXI.Point} A pair of `x` and `y` coordinates.
         */
        getTopLeftCorner() {
            return this.uiToGameCoord(0, 0);
        }

        /**
         * Gets the position of the top-right corner of the viewport in game coordinates.
         * This is useful for positioning UI elements in game coordinates,
         * especially with rotated viewports.
         * @returns {PIXI.Point} A pair of `x` and `y` coordinates.
         */
        getTopRightCorner() {
            return this.uiToGameCoord(this.width, 0);
        }

        /**
         * Gets the position of the bottom-left corner of the viewport in game coordinates.
         * This is useful for positioning UI elements in game coordinates,
         * especially with rotated viewports.
         * @returns {PIXI.Point} A pair of `x` and `y` coordinates.
         */
        getBottomLeftCorner() {
            return this.uiToGameCoord(0, this.height);
        }

        /**
         * Gets the position of the bottom-right corner of the viewport in game coordinates.
         * This is useful for positioning UI elements in game coordinates,
         * especially with rotated viewports.
         * @returns {PIXI.Point} A pair of `x` and `y` coordinates.
         */
        getBottomRightCorner() {
            return this.uiToGameCoord(this.width, this.height);
        }

        /**
         * Returns the bounding box of the camera.
         * Useful for rotated viewports when something needs to be reliably covered by a rectangle.
         * @returns {PIXI.Rectangle} The bounding box of the camera.
         */
        getBoundingBox() {
            const bb = new PIXI.Bounds();
            const tl = this.getTopLeftCorner(),
                  tr = this.getTopRightCorner(),
                  bl = this.getBottomLeftCorner(),
                  br = this.getBottomRightCorner();
            bb.addPoint(new PIXI.Point(tl.x, tl.y));
            bb.addPoint(new PIXI.Point(tr.x, tr.y));
            bb.addPoint(new PIXI.Point(bl.x, bl.y));
            bb.addPoint(new PIXI.Point(br.x, br.y));
            return bb.getRectangle();
        }

        /**
         * Checks whether a given object (or any Pixi's DisplayObject)
         * is potentially visible, meaning that its bounding box intersects
         * the camera's bounding box.
         * @param {PIXI.DisplayObject} copy An object to check for.
         * @returns {boolean} `true` if an object is visible, `false` otherwise.
         */
        contains(copy) {
            // `true` skips transforms recalculations, boosting performance
            const bounds = copy.getBounds(true);
            return bounds.right > 0 &&
                bounds.left < this.width * this.scale.x &&
                bounds.bottom > 0 &&
                bounds.top < this.width * this.scale.y;
        }

        /**
         * Realigns all the copies in a room so that they distribute proportionally
         * to a new camera size based on their `xstart` and `ystart` coordinates.
         * Will throw an error if the given room is not in UI space (if `room.isUi` is not `true`).
         * You can skip the realignment for some copies
         * if you set their `skipRealign` parameter to `true`.
         * @param {Room} room The room which copies will be realigned.
         * @returns {void}
         */
        realign(room) {
            if (!room.isUi) {
                throw new Error('[ct.camera] An attempt to realing a room that is not in UI space. The room in question is', room);
            }
            const w = (ct.rooms.templates[room.name].width || 1),
                  h = (ct.rooms.templates[room.name].height || 1);
            for (const copy of room.children) {
                if (!('xstart' in copy) || copy.skipRealign) {
                    continue;
                }
                copy.x = copy.xstart / w * this.width;
                copy.y = copy.ystart / h * this.height;
            }
        }
        /**
         * This will align all non-UI layers in the game according to the camera's transforms.
         * This is automatically called internally, and you will hardly ever use it.
         * @returns {void}
         */
        manageStage() {
            const px = this.computedX,
                  py = this.computedY,
                  sx = 1 / (isNaN(this.scale.x) ? 1 : this.scale.x),
                  sy = 1 / (isNaN(this.scale.y) ? 1 : this.scale.y);
            for (const item of ct.stage.children) {
                if (!item.isUi && item.pivot) {
                    item.x = -this.width / 2;
                    item.y = -this.height / 2;
                    item.pivot.x = px;
                    item.pivot.y = py;
                    item.scale.x = sx;
                    item.scale.y = sy;
                    item.angle = -this.angle;
                }
            }
        }
    }
    return Camera;
})(ct);
void Camera;

(function timerAddon() {
    const ctTimerTime = Symbol('time');
    const ctTimerRoomUid = Symbol('roomUid');
    const ctTimerTimeLeftOriginal = Symbol('timeLeftOriginal');
    const promiseResolve = Symbol('promiseResolve');
    const promiseReject = Symbol('promiseReject');

    /**
     * @property {boolean} isUi Whether the timer uses ct.deltaUi or not.
     * @property {string|false} name The name of the timer
     */
    class CtTimer {
        /**
         * An object for holding a timer
         *
         * @param {number} timeMs The length of the timer, **in milliseconds**
         * @param {string|false} [name=false] The name of the timer
         * @param {boolean} [uiDelta=false] If `true`, it will use `ct.deltaUi` for counting time.
         * if `false`, it will use `ct.delta` for counting time.
         */
        constructor(timeMs, name = false, uiDelta = false) {
            this[ctTimerRoomUid] = ct.room.uid || null;
            this.name = name && name.toString();
            this.isUi = uiDelta;
            this[ctTimerTime] = 0;
            this[ctTimerTimeLeftOriginal] = timeMs;
            this.timeLeft = this[ctTimerTimeLeftOriginal];
            this.promise = new Promise((resolve, reject) => {
                this[promiseResolve] = resolve;
                this[promiseReject] = reject;
            });
            this.rejected = false;
            this.done = false;
            this.settled = false;
            ct.timer.timers.add(this);
        }

        /**
         * Attaches callbacks for the resolution and/or rejection of the Promise.
         *
         * @param {Function} onfulfilled The callback to execute when the Promise is resolved.
         * @param {Function} [onrejected] The callback to execute when the Promise is rejected.
         * @returns {Promise} A Promise for the completion of which ever callback is executed.
         */
        then(...args) {
            return this.promise.then(...args);
        }
        /**
         * Attaches a callback for the rejection of the Promise.
         *
         * @param {Function} [onrejected] The callback to execute when the Promise is rejected.
         * @returns {Promise} A Promise for the completion of which ever callback is executed.
         */
        catch(onrejected) {
            return this.promise.catch(onrejected);
        }

        /**
         * The time passed on this timer, in seconds
         * @type {number}
         */
        get time() {
            return this[ctTimerTime] * 1000 / ct.speed;
        }
        set time(newTime) {
            this[ctTimerTime] = newTime / 1000 * ct.speed;
        }

        /**
         * Updates the timer. **DONT CALL THIS UNLESS YOU KNOW WHAT YOU ARE DOING**
         *
         * @returns {void}
         * @private
         */
        update() {
            // Not something that would normally happen,
            // but do check whether this timer was not automatically removed
            if (this.rejected === true || this.done === true) {
                this.remove();
                return;
            }
            this[ctTimerTime] += this.isUi ? ct.deltaUi : ct.delta;
            if (ct.room.uid !== this[ctTimerRoomUid] && this[ctTimerRoomUid] !== null) {
                this.reject({
                    info: 'Room switch',
                    from: 'ct.timer'
                }); // Reject if the room was switched
            }

            // If the timer is supposed to end
            if (this.timeLeft !== 0) {
                this.timeLeft = this[ctTimerTimeLeftOriginal] - this.time;
                if (this.timeLeft <= 0) {
                    this.resolve();
                }
            }
        }

        /**
         * Instantly triggers the timer and calls the callbacks added through `then` method.
         * @returns {void}
         */
        resolve() {
            if (this.settled) {
                return;
            }
            this.done = true;
            this.settled = true;
            this[promiseResolve]();
            this.remove();
        }
        /**
         * Stops the timer with a given message by rejecting a Promise object.
         * @param {any} message The value to pass to the `catch` callback
         * @returns {void}
         */
        reject(message) {
            if (this.settled) {
                return;
            }
            this.rejected = true;
            this.settled = true;
            this[promiseReject](message);
            this.remove();
        }
        /**
         * Removes the timer from ct.js game loop. This timer will not trigger.
         * @returns {void}
         */
        remove() {
            ct.timer.timers.delete(this);
        }
    }
    window.CtTimer = CtTimer;

    /**
     * Timer utilities
     * @namespace
     */
    ct.timer = {
        /**
         * A set with all the active timers.
         * @type Set<CtTimer>
         */
        timers: new Set(),
        counter: 0,
        /**
         * Adds a new timer with a given name
         *
         * @param {number} timeMs The length of the timer, **in milliseconds**
         * @param {string|false} [name=false] The name of the timer, which you use
         * to access it from `ct.timer.timers`.
         * @returns {CtTimer} The timer
         */
        add(timeMs, name = false) {
            return new CtTimer(timeMs, name, false);
        },
        /**
         * Adds a new timer with a given name that runs in a UI time scale
         *
         * @param {number} timeMs The length of the timer, **in milliseconds**
         * @param {string|false} [name=false] The name of the timer, which you use
         * to access it from `ct.timer.timers`.
         * @returns {CtTimer} The timer
         */
        addUi(timeMs, name = false) {
            return new CtTimer(timeMs, name, true);
        },
        /**
         * Updates the timers. **DONT CALL THIS UNLESS YOU KNOW WHAT YOU ARE DOING**
         *
         * @returns {void}
         * @private
         */
        updateTimers() {
            for (const timer of this.timers) {
                timer.update();
            }
        }
    };
})();
if (document.fonts) { for (const font of document.fonts) { font.load(); }}(function fittoscreen(ct) {
    document.body.style.overflow = 'hidden';
    var canv = ct.pixiApp.view;
    const positionCanvas = function positionCanvas(mode, scale) {
        if (mode === 'fastScale' || mode === 'fastScaleInteger') {
            canv.style.transform = `translate(-50%, -50%) scale(${scale})`;
            canv.style.position = 'absolute';
            canv.style.top = '50%';
            canv.style.left = '50%';
        } else if (mode === 'expandViewport' || mode === 'expand' || mode === 'scaleFill') {
            canv.style.position = 'static';
            canv.style.top = 'unset';
            canv.style.left = 'unset';
        } else if (mode === 'scaleFit') {
            canv.style.transform = 'translate(-50%, -50%)';
            canv.style.position = 'absolute';
            canv.style.top = '50%';
            canv.style.left = '50%';
        }
    };
    var resize = function resize() {
        const {mode} = ct.fittoscreen;
        const pixelScaleModifier = ct.highDensity ? (window.devicePixelRatio || 1) : 1;
        const kw = window.innerWidth / ct.roomWidth,
              kh = window.innerHeight / ct.roomHeight;
        let k = Math.min(kw, kh);
        if (mode === 'fastScaleInteger') {
            k = k < 1 ? k : Math.floor(k);
        }
        var canvasWidth, canvasHeight,
            cameraWidth, cameraHeight;
        if (mode === 'expandViewport' || mode === 'expand') {
            canvasWidth = Math.ceil(window.innerWidth * pixelScaleModifier);
            canvasHeight = Math.ceil(window.innerHeight * pixelScaleModifier);
            cameraWidth = window.innerWidth;
            cameraHeight = window.innerHeight;
        } else if (mode === 'fastScale' || mode === 'fastScaleInteger') {
            canvasWidth = Math.ceil(ct.roomWidth * pixelScaleModifier);
            canvasHeight = Math.ceil(ct.roomHeight * pixelScaleModifier);
            cameraWidth = ct.roomWidth;
            cameraHeight = ct.roomHeight;
        } else if (mode === 'scaleFit' || mode === 'scaleFill') {
            if (mode === 'scaleFill') {
                canvasWidth = Math.ceil(ct.roomWidth * kw * pixelScaleModifier);
                canvasHeight = Math.ceil(ct.roomHeight * kh * pixelScaleModifier);
                cameraWidth = window.innerWidth / k;
                cameraHeight = window.innerHeight / k;
            } else { // scaleFit
                canvasWidth = Math.ceil(ct.roomWidth * k * pixelScaleModifier);
                canvasHeight = Math.ceil(ct.roomHeight * k * pixelScaleModifier);
                cameraWidth = ct.roomWidth;
                cameraHeight = ct.roomHeight;
            }
        }

        ct.pixiApp.renderer.resize(canvasWidth, canvasHeight);
        if (mode !== 'scaleFill' && mode !== 'scaleFit') {
            ct.pixiApp.stage.scale.x = ct.pixiApp.stage.scale.y = pixelScaleModifier;
        } else {
            ct.pixiApp.stage.scale.x = ct.pixiApp.stage.scale.y = pixelScaleModifier * k;
        }
        canv.style.width = Math.ceil(canvasWidth / pixelScaleModifier) + 'px';
        canv.style.height = Math.ceil(canvasHeight / pixelScaleModifier) + 'px';
        if (ct.camera) {
            ct.camera.width = cameraWidth;
            ct.camera.height = cameraHeight;
        }
        positionCanvas(mode, k);
    };
    var toggleFullscreen = function () {
        try {
            // Are we in Electron?
            const win = require('electron').remote.BrowserWindow.getFocusedWindow();
            win.setFullScreen(!win.isFullScreen());
            return;
        } catch (e) {
            void e; // Continue with web approach
        }
        var canvas = document.fullscreenElement ||
                     document.webkitFullscreenElement ||
                     document.mozFullScreenElement ||
                     document.msFullscreenElement,
            requester = document.getElementById('ct'),
            request = requester.requestFullscreen ||
                      requester.webkitRequestFullscreen ||
                      requester.mozRequestFullScreen ||
                      requester.msRequestFullscreen,
            exit = document.exitFullscreen ||
                   document.webkitExitFullscreen ||
                   document.mozCancelFullScreen ||
                   document.msExitFullscreen;
        if (!canvas) {
            var promise = request.call(requester);
            if (promise) {
                promise
                .catch(function fullscreenError(err) {
                    console.error('[ct.fittoscreen]', err);
                });
            }
        } else if (exit) {
            exit.call(document);
        }
    };
    window.addEventListener('resize', resize);
    ct.fittoscreen = resize;
    ct.fittoscreen.toggleFullscreen = toggleFullscreen;
    var $mode = 'scaleFit';
    Object.defineProperty(ct.fittoscreen, 'mode', {
        configurable: false,
        enumerable: true,
        set(value) {
            $mode = value;
        },
        get() {
            return $mode;
        }
    });
    ct.fittoscreen.mode = $mode;
    ct.fittoscreen.getIsFullscreen = function getIsFullscreen() {
        try {
            // Are we in Electron?
            const win = require('electron').remote.BrowserWindow.getFocusedWindow;
            return win.isFullScreen;
        } catch (e) {
            void e; // Continue with web approach
        }
        return document.fullscreen || document.webkitIsFullScreen || document.mozFullScreen;
    };
})(ct);

ct.inherit = {
    isChild(template, assertedTemplate) {
        // Get template names from copies
        if (template instanceof Copy) {
            ({template} = template);
        }
        if (assertedTemplate instanceof Copy) {
            assertedTemplate = assertedTemplate.template;
        }
        // Throw an error if a particular template does not exist.
        if (!(template in ct.templates.templates)) {
            throw new Error(`[ct.inherit] The template ${template} does not exist. A typo?`);
        }
        if (!(assertedTemplate in ct.templates.templates)) {
            throw new Error(`[ct.inherit] The template ${assertedTemplate} does not exist. A typo?`);
        }
        // Well, technically a template is not a child of itself,
        // but I suppose you expect to get `true`
        // while checking whether a copy belongs to a particular class.
        if (template === assertedTemplate) {
            return true;
        }
        let proposedTemplate = ct.templates.templates[template].extends.inheritedTemplate;
        while (proposedTemplate) {
            if (proposedTemplate === assertedTemplate) {
                return true;
            }
            proposedTemplate = ct.templates.templates[proposedTemplate].extends.inheritedTemplate;
        }
        return false;
    },
    isParent(template, assertedTemplate) {
        return ct.inherit.isChild(assertedTemplate, template);
    },
    list(template) {
        // Throw an error if a particular template does not exist.
        if (!(template in ct.templates.templates)) {
            throw new Error(`[ct.inherit] The template ${template} does not exist. A typo?`);
        }

        // Get a list of all child templates to concat their ct.templates.lists in one go
        const templates = [];
        for (const i in ct.templates.list) {
            if (i !== 'BACKGROUND' && i !== 'TILEMAP' && ct.inherit.isParent(template, i)) {
                templates.push(i);
            }
        }

        return [].concat(...templates.map(t => ct.templates.list[t]));
    }
};

/* eslint-disable no-nested-ternary */
/* global CtTimer */

ct.tween = {
    /**
     * Creates a new tween effect and adds it to the game loop
     *
     * @param {Object} options An object with options:
     * @param {Object|Copy} options.obj An object to animate. All objects are supported.
     * @param {Object} options.fields A map with pairs `fieldName: newValue`.
     * Values must be of numerical type.
     * @param {Function} options.curve An interpolating function. You can write your own,
     * or use default ones (see methods in `ct.tween`). The default one is `ct.tween.ease`.
     * @param {Number} options.duration The duration of easing, in milliseconds.
     * @param {Number} options.useUiDelta If true, use ct.deltaUi instead of ct.delta.
     * The default is `false`.
     * @param {boolean} options.silent If true, will not throw errors if the animation
     * was interrupted.
     *
     * @returns {Promise} A promise which is resolved if the effect was fully played,
     * or rejected if it was interrupted manually by code, room switching or instance kill.
     * You can call a `stop()` method on this promise to interrupt it manually.
     */
    add(options) {
        var tween = {
            obj: options.obj,
            fields: options.fields || {},
            curve: options.curve || ct.tween.ease,
            duration: options.duration || 1000,
            timer: new CtTimer(this.duration, false, options.useUiDelta || false)
        };
        var promise = new Promise((resolve, reject) => {
            tween.resolve = resolve;
            tween.reject = reject;
            tween.starting = {};
            for (var field in tween.fields) {
                tween.starting[field] = tween.obj[field] || 0;
            }
            ct.tween.tweens.push(tween);
        });
        if (options.silent) {
            promise.catch(() => void 0);
            tween.timer.catch(() => void 0);
        }
        promise.stop = function stop() {
            tween.reject({
                code: 0,
                info: 'Stopped by game logic',
                from: 'ct.tween'
            });
        };
        return promise;
    },
    /**
     * Linear interpolation.
     * Here and below, these parameters are used:
     *
     * @param {Number} s Starting value
     * @param {Number} d The change of value to transition to, the Delta
     * @param {Number} a The current timing state, 0-1
     * @returns {Number} Interpolated value
     */
    linear(s, d, a) {
        return d * a + s;
    },
    ease(s, d, a) {
        a *= 2;
        if (a < 1) {
            return d / 2 * a * a + s;
        }
        a--;
        return -d / 2 * (a * (a - 2) - 1) + s;
    },
    easeInQuad(s, d, a) {
        return d * a * a + s;
    },
    easeOutQuad(s, d, a) {
        return -d * a * (a - 2) + s;
    },
    easeInCubic(s, d, a) {
        return d * a * a * a + s;
    },
    easeOutCubic(s, d, a) {
        a--;
        return d * (a * a * a + 1) + s;
    },
    easeInOutCubic(s, d, a) {
        a *= 2;
        if (a < 1) {
            return d / 2 * a * a * a + s;
        }
        a -= 2;
        return d / 2 * (a * a * a + 2) + s;
    },
    easeInOutQuart(s, d, a) {
        a *= 2;
        if (a < 1) {
            return d / 2 * a * a * a * a + s;
        }
        a -= 2;
        return -d / 2 * (a * a * a * a - 2) + s;
    },
    easeInQuart(s, d, a) {
        return d * a * a * a * a + s;
    },
    easeOutQuart(s, d, a) {
        a--;
        return -d * (a * a * a * a - 1) + s;
    },
    easeInCirc(s, d, a) {
        return -d * (Math.sqrt(1 - a * a) - 1) + s;
    },
    easeOutCirc(s, d, a) {
        a--;
        return d * Math.sqrt(1 - a * a) + s;
    },
    easeInOutCirc(s, d, a) {
        a *= 2;
        if (a < 1) {
            return -d / 2 * (Math.sqrt(1 - a * a) - 1) + s;
        }
        a -= 2;
        return d / 2 * (Math.sqrt(1 - a * a) + 1) + s;
    },
    easeInBack(s, d, a) {
        const c1 = 1.70158;
        const c3 = c1 + 1;
        var x = c3 * a * a * a - c1 * a * a;
        return d * x + s;
    },
    easeOutBack(s, d, a) {
        const c1 = 1.70158;
        const c3 = c1 + 1;
        var x = 1 + c3 * (a - 1) ** 3 + c1 * (a - 1) ** 2;
        return d * x + s;
    },
    easeInOutBack(s, d, a) {
        const c1 = 1.70158;
        const c2 = c1 * 1.525;
        var x = a < 0.5 ?
            ((2 * a) ** 2 * ((c2 + 1) * 2 * a - c2)) / 2 :
            ((2 * a - 2) ** 2 * ((c2 + 1) * (a * 2 - 2) + c2) + 2) / 2;
        return d * x + s;
    },
    easeInElastic(s, d, a) {
        const c4 = (2 * Math.PI) / 3;
        var x = a === 0 ?
            0 :
            a === 1 ?
                1 :
                -(2 ** (10 * a - 10)) * Math.sin((a * 10 - 10.75) * c4);
        return d * x + s;
    },
    easeOutElastic(s, d, a) {
        const c4 = (2 * Math.PI) / 3;
        var x = a === 0 ?
            0 :
            a === 1 ?
                1 :
                2 ** (-10 * a) * Math.sin((a * 10 - 0.75) * c4) + 1;
        return d * x + s;
    },
    easeInOutElastic(s, d, a) {
        const c5 = (2 * Math.PI) / 4.5;
        var x = a === 0 ?
            0 :
            a === 1 ?
                1 :
                a < 0.5 ?
                    -(2 ** (20 * a - 10) * Math.sin((20 * a - 11.125) * c5)) / 2 :
                    (2 ** (-20 * a + 10) * Math.sin((20 * a - 11.125) * c5)) / 2 + 1;
        return d * x + s;
    },
    easeOutBounce(s, d, a) {
        const n1 = 7.5625;
        const d1 = 2.75;
        var x;
        if (a < 1 / d1) {
            x = n1 * a * a;
        } else if (a < 2 / d1) {
            x = n1 * (a -= 1.5 / d1) * a + 0.75;
        } else if (a < 2.5 / d1) {
            x = n1 * (a -= 2.25 / d1) * a + 0.9375;
        } else {
            x = n1 * (a -= 2.625 / d1) * a + 0.984375;
        }
        return d * x + s;
    },
    easeInBounce(s, d, a) {
        const n1 = 7.5625;
        const d1 = 2.75;
        var x;
        a = 1 - a;
        if (a < 1 / d1) {
            x = n1 * a * a;
        } else if (a < 2 / d1) {
            x = n1 * (a -= 1.5 / d1) * a + 0.75;
        } else if (a < 2.5 / d1) {
            x = n1 * (a -= 2.25 / d1) * a + 0.9375;
        } else {
            x = n1 * (a -= 2.625 / d1) * a + 0.984375;
        }
        return d * (1 - x) + s;
    },
    easeInOutBounce(s, d, a) {
        const n1 = 7.5625;
        const d1 = 2.75;
        var x, b;
        if (a < 0.5) {
            b = 1 - 2 * a;
        } else {
            b = 2 * a - 1;
        }
        if (b < 1 / d1) {
            x = n1 * b * b;
        } else if (b < 2 / d1) {
            x = n1 * (b -= 1.5 / d1) * b + 0.75;
        } else if (b < 2.5 / d1) {
            x = n1 * (b -= 2.25 / d1) * b + 0.9375;
        } else {
            x = n1 * (b -= 2.625 / d1) * b + 0.984375;
        }
        if (a < 0.5) {
            x = (1 - b) / 1;
        } else {
            x = (1 + b) / 1;
        }
        return d * x + s;
    },
    tweens: [],
    wait: ct.u.wait
};
ct.tween.easeInOutQuad = ct.tween.ease;

(function mountCtPointer(ct) {
    const keyPrefix = 'pointer.';
    const setKey = function (key, value) {
        ct.inputs.registry[keyPrefix + key] = value;
    };
    const getKey = function (key) {
        return ct.inputs.registry[keyPrefix + key];
    };
    const buttonMappings = {
        Primary: 1,
        Middle: 4,
        Secondary: 2,
        ExtraOne: 8,
        ExtraTwo: 16,
        Eraser: 32
    };
    var lastPanNum = 0,
        lastPanX = 0,
        lastPanY = 0,
        lastScaleDistance = 0,
        lastAngle = 0;

    // updates Action system's input methods for singular, double and triple pointers
    var countPointers = () => {
        setKey('Any', ct.pointer.down.length > 0 ? 1 : 0);
        setKey('Double', ct.pointer.down.length > 1 ? 1 : 0);
        setKey('Triple', ct.pointer.down.length > 2 ? 1 : 0);
    };
    // returns a new object with the necessary information about a pointer event
    var copyPointer = e => {
        const rect = ct.pixiApp.view.getBoundingClientRect();
        const xui = (e.clientX - rect.left) / rect.width * ct.camera.width,
              yui = (e.clientY - rect.top) / rect.height * ct.camera.height;
        const positionGame = ct.u.uiToGameCoord(xui, yui);
        const pointer = {
            id: e.pointerId,
            x: positionGame.x,
            y: positionGame.y,
            clientX: e.clientX,
            clientY: e.clientY,
            xui: xui,
            yui: yui,
            xprev: positionGame.x,
            yprev: positionGame.y,
            buttons: e.buttons,
            xuiprev: xui,
            yuiprev: yui,
            pressure: e.pressure,
            tiltX: e.tiltX,
            tiltY: e.tiltY,
            twist: e.twist,
            type: e.pointerType,
            width: e.width / rect.width * ct.camera.width,
            height: e.height / rect.height * ct.camera.height
        };
        return pointer;
    };
    var updatePointer = (pointer, e) => {
        const rect = ct.pixiApp.view.getBoundingClientRect();
        const xui = (e.clientX - rect.left) / rect.width * ct.camera.width,
              yui = (e.clientY - rect.top) / rect.height * ct.camera.height;
        const positionGame = ct.u.uiToGameCoord(xui, yui);
        Object.assign(pointer, {
            x: positionGame.x,
            y: positionGame.y,
            xui: xui,
            yui: yui,
            clientX: e.clientX,
            clientY: e.clientY,
            pressure: e.pressure,
            buttons: e.buttons,
            tiltX: e.tiltX,
            tiltY: e.tiltY,
            twist: e.twist,
            width: e.width / rect.width * ct.camera.width,
            height: e.height / rect.height * ct.camera.height
        });
    };
    var writePrimary = function (pointer) {
        Object.assign(ct.pointer, {
            x: pointer.x,
            y: pointer.y,
            xui: pointer.xui,
            yui: pointer.yui,
            pressure: pointer.pressure,
            buttons: pointer.buttons,
            tiltX: pointer.tiltX,
            tiltY: pointer.tiltY,
            twist: pointer.twist
        });
    };

    var handleHoverStart = function (e) {
        window.focus();
        const pointer = copyPointer(e);
        ct.pointer.hover.push(pointer);
        if (e.isPrimary) {
            writePrimary(pointer);
        }
    };
    var handleHoverEnd = function (e) {
        const pointer = ct.pointer.hover.find(p => p.id === e.pointerId);
        if (pointer) {
            pointer.invalid = true;
            ct.pointer.hover.splice(ct.pointer.hover.indexOf(pointer), 1);
        }
        // Handles mouse pointers that were dragged out of the ct.js frame while pressing,
        // as they don't trigger pointercancel or such
        const downId = ct.pointer.down.findIndex(p => p.id === e.pointerId);
        if (downId !== -1) {
            ct.pointer.down.splice(downId, 1);
        }
    };
    var handleMove = function (e) {
        if (![false][0] && !ct.pointer.permitDefault) {
            e.preventDefault();
        }
        let pointerHover = ct.pointer.hover.find(p => p.id === e.pointerId);
        if (!pointerHover) {
            // Catches hover events that started before the game has loaded
            handleHoverStart(e);
            pointerHover = ct.pointer.hover.find(p => p.id === e.pointerId);
        }
        const pointerDown = ct.pointer.down.find(p => p.id === e.pointerId);
        if (!pointerHover && !pointerDown) {
            return;
        }
        if (pointerHover) {
            updatePointer(pointerHover, e);
        }
        if (pointerDown) {
            updatePointer(pointerDown, e);
        }
        if (e.isPrimary) {
            writePrimary(pointerHover || pointerDown);
        }
    };
    var handleDown = function (e) {
        if (![false][0] && !ct.pointer.permitDefault) {
            e.preventDefault();
        }
        ct.pointer.type = e.pointerType;
        const pointer = copyPointer(e);
        ct.pointer.down.push(pointer);
        countPointers();
        if (e.isPrimary) {
            writePrimary(pointer);
        }
    };
    var handleUp = function (e) {
        if (![false][0] && !ct.pointer.permitDefault) {
            e.preventDefault();
        }
        const pointer = ct.pointer.down.find(p => p.id === e.pointerId);
        if (pointer) {
            ct.pointer.released.push(pointer);
        }
        if (ct.pointer.down.indexOf(pointer) !== -1) {
            ct.pointer.down.splice(ct.pointer.down.indexOf(pointer), 1);
        }
        countPointers();
    };
    var handleWheel = function handleWheel(e) {
        setKey('Wheel', ((e.wheelDelta || -e.detail) < 0) ? -1 : 1);
        if (![false][0] && !ct.pointer.permitDefault) {
            e.preventDefault();
        }
    };

    let locking = false;
    const genericCollisionCheck = function genericCollisionCheck(
        copy,
        specificPointer,
        set,
        uiSpace
    ) {
        if (locking) {
            return false;
        }
        for (const pointer of set) {
            if (specificPointer && pointer.id !== specificPointer.id) {
                continue;
            }
            if (ct.place.collide(copy, {
                x: uiSpace ? pointer.xui : pointer.x,
                y: uiSpace ? pointer.yui : pointer.y,
                scale: {
                    x: 1,
                    y: 1
                },
                angle: 0,
                shape: {
                    type: 'rect',
                    top: pointer.height / 2,
                    bottom: pointer.height / 2,
                    left: pointer.width / 2,
                    right: pointer.width / 2
                }
            })) {
                return pointer;
            }
        }
        return false;
    };
    // Triggers on every mouse press event to capture pointer after it was released by a user,
    // e.g. after the window was blurred
    const pointerCapturer = function pointerCapturer() {
        if (!document.pointerLockElement && !document.mozPointerLockElement) {
            const request = document.body.requestPointerLock || document.body.mozRequestPointerLock;
            request.apply(document.body);
        }
    };
    const capturedPointerMove = function capturedPointerMove(e) {
        const rect = ct.pixiApp.view.getBoundingClientRect();
        const dx = e.movementX / rect.width * ct.camera.width,
              dy = e.movementY / rect.height * ct.camera.height;
        ct.pointer.xlocked += dx;
        ct.pointer.ylocked += dy;
        ct.pointer.xmovement = dx;
        ct.pointer.ymovement = dy;
    };

    ct.pointer = {
        setupListeners() {
            document.addEventListener('pointerenter', handleHoverStart, false);
            document.addEventListener('pointerout', handleHoverEnd, false);
            document.addEventListener('pointerleave', handleHoverEnd, false);
            document.addEventListener('pointerdown', handleDown, false);
            document.addEventListener('pointerup', handleUp, false);
            document.addEventListener('pointercancel', handleUp, false);
            document.addEventListener('pointermove', handleMove, false);
            document.addEventListener('wheel', handleWheel, {
                passive: false
            });
            document.addEventListener('DOMMouseScroll', handleWheel, {
                passive: false
            });
            document.addEventListener('contextmenu', e => {
                if (![false][0] && !ct.pointer.permitDefault) {
                    e.preventDefault();
                }
            });
        },
        hover: [],
        down: [],
        released: [],
        x: 0,
        y: 0,
        xprev: 0,
        yprev: 0,
        xui: 0,
        yui: 0,
        xuiprev: 0,
        yuiprev: 0,
        xlocked: 0,
        ylocked: 0,
        xmovement: 0,
        ymovement: 0,
        pressure: 1,
        buttons: 0,
        tiltX: 0,
        tiltY: 0,
        twist: 0,
        width: 1,
        height: 1,
        permitDefault: false,
        type: null,
        clear() {
            ct.pointer.down.length = 0;
            ct.pointer.hover.length = 0;
            ct.pointer.clearReleased();
            countPointers();
        },
        clearReleased() {
            ct.pointer.released.length = 0;
        },
        collides(copy, pointer, checkReleased) {
            var set = checkReleased ? ct.pointer.released : ct.pointer.down;
            return genericCollisionCheck(copy, pointer, set, false);
        },
        collidesUi(copy, pointer, checkReleased) {
            var set = checkReleased ? ct.pointer.released : ct.pointer.down;
            return genericCollisionCheck(copy, pointer, set, true);
        },
        hovers(copy, pointer) {
            return genericCollisionCheck(copy, pointer, ct.pointer.hover, false);
        },
        hoversUi(copy, pointer) {
            return genericCollisionCheck(copy, pointer, ct.pointer.hover, true);
        },
        isButtonPressed(button, pointer) {
            if (!pointer) {
                return Boolean(getKey(button));
            }
            // eslint-disable-next-line no-bitwise
            return (pointer.buttons & buttonMappings[button]) === button ? 1 : 0;
        },
        updateGestures() {
            let x = 0,
                y = 0;
            const rect = ct.pixiApp.view.getBoundingClientRect();
            // Get the middle point of all the pointers
            for (const event of ct.pointer.down) {
                x += (event.clientX - rect.left) / rect.width;
                y += (event.clientY - rect.top) / rect.height;
            }
            x /= ct.pointer.down.length;
            y /= ct.pointer.down.length;

            let angle = 0,
                distance = lastScaleDistance;
            if (ct.pointer.down.length > 1) {
                const events = [
                    ct.pointer.down[0],
                    ct.pointer.down[1]
                ].sort((a, b) => a.id - b.id);
                angle = ct.u.pdn(
                    events[0].x,
                    events[0].y,
                    events[1].x,
                    events[1].y
                );
                distance = ct.u.pdc(
                    events[0].x,
                    events[0].y,
                    events[1].x,
                    events[1].y
                );
            }
            if (lastPanNum === ct.pointer.down.length) {
                if (ct.pointer.down.length > 1) {
                    setKey('DeltaRotation', (ct.u.degToRad(ct.u.deltaDir(lastAngle, angle))));
                    setKey('DeltaPinch', distance / lastScaleDistance - 1);
                } else {
                    setKey('DeltaPinch', 0);
                    setKey('DeltaRotation', 0);
                }
                if (!ct.pointer.down.length) {
                    setKey('PanX', 0);
                    setKey('PanY', 0);
                } else {
                    setKey('PanX', x - lastPanX);
                    setKey('PanY', y - lastPanY);
                }
            } else {
                // skip gesture updates to avoid shaking on new presses
                lastPanNum = ct.pointer.down.length;
                setKey('DeltaPinch', 0);
                setKey('DeltaRotation', 0);
                setKey('PanX', 0);
                setKey('PanY', 0);
            }
            lastPanX = x;
            lastPanY = y;
            lastAngle = angle;
            lastScaleDistance = distance;

            for (const button in buttonMappings) {
                setKey(button, 0);
                for (const pointer of ct.pointer.down) {
                    // eslint-disable-next-line no-bitwise
                    if ((pointer.buttons & buttonMappings[button]) === buttonMappings[button]) {
                        setKey(button, 1);
                    }
                }
            }
        },
        lock() {
            if (locking) {
                return;
            }
            locking = true;
            ct.pointer.xlocked = ct.pointer.xui;
            ct.pointer.ylocked = ct.pointer.yui;
            const request = document.body.requestPointerLock || document.body.mozRequestPointerLock;
            request.apply(document.body);
            document.addEventListener('click', pointerCapturer);
            document.addEventListener('pointermove', capturedPointerMove);
        },
        unlock() {
            if (!locking) {
                return;
            }
            locking = false;
            if (document.pointerLockElement || document.mozPointerLockElement) {
                (document.exitPointerLock || document.mozExitPointerLock)();
            }
            document.removeEventListener('click', pointerCapturer);
            document.removeEventListener('pointermove', capturedPointerMove);
        },
        get locked() {
            // Do not return the Document object
            return Boolean(document.pointerLockElement || document.mozPointerLockElement);
        }
    };
    setKey('Wheel', 0);
    if ([false][0]) {
        ct.pointer.lock();
    }
})(ct);

(function ctKeyboard() {
    var keyPrefix = 'keyboard.';
    var setKey = function (key, value) {
        ct.inputs.registry[keyPrefix + key] = value;
    };

    ct.keyboard = {
        string: '',
        lastKey: '',
        lastCode: '',
        alt: false,
        shift: false,
        ctrl: false,
        permitDefault: false,
        clear() {
            delete ct.keyboard.lastKey;
            delete ct.keyboard.lastCode;
            ct.keyboard.string = '';
            ct.keyboard.alt = false;
            ct.keyboard.shift = false;
            ct.keyboard.ctrl = false;
        },
        check: [],
        onDown(e) {
            ct.keyboard.shift = e.shiftKey;
            ct.keyboard.alt = e.altKey;
            ct.keyboard.ctrl = e.ctrlKey;
            ct.keyboard.lastKey = e.key;
            ct.keyboard.lastCode = e.code;
            if (e.code) {
                setKey(e.code, 1);
            } else {
                setKey('Unknown', 1);
            }
            if (e.key) {
                if (e.key.length === 1) {
                    ct.keyboard.string += e.key;
                } else if (e.key === 'Backspace') {
                    ct.keyboard.string = ct.keyboard.string.slice(0, -1);
                } else if (e.key === 'Enter') {
                    ct.keyboard.string = '';
                }
            }
            if (!ct.keyboard.permitDefault) {
                e.preventDefault();
            }
        },
        onUp(e) {
            ct.keyboard.shift = e.shiftKey;
            ct.keyboard.alt = e.altKey;
            ct.keyboard.ctrl = e.ctrlKey;
            if (e.code) {
                setKey(e.code, 0);
            } else {
                setKey('Unknown', 0);
            }
            if (!ct.keyboard.permitDefault) {
                e.preventDefault();
            }
        }
    };

    if (document.addEventListener) {
        document.addEventListener('keydown', ct.keyboard.onDown, false);
        document.addEventListener('keyup', ct.keyboard.onUp, false);
    } else {
        document.attachEvent('onkeydown', ct.keyboard.onDown);
        document.attachEvent('onkeyup', ct.keyboard.onUp);
    }
})();

if (!ct.sound) {
    /**
     * @namespace
     */
    ct.sound = {
        /**
         * Detects if a particular codec is supported in the system
         * @param {string} type Codec/MIME-type to look for
         * @returns {boolean} true/false
         */
        detect(type) {
            var au = document.createElement('audio');
            return Boolean(au.canPlayType && au.canPlayType(type).replace(/no/, ''));
        },
        /**
         * Creates a new Sound object and puts it in resource object
         *
         * @param {string} name Sound's name
         * @param {object} formats A collection of sound files of specified extension,
         * in format `extension: path`
         * @param {string} [formats.ogg] Local path to the sound in ogg format
         * @param {string} [formats.wav] Local path to the sound in wav format
         * @param {string} [formats.mp3] Local path to the sound in mp3 format
         * @param {number} [options] An options object
         *
         * @returns {object} Sound's object
         */
        init(name, formats, options) {
            var src = '';
            if (ct.sound.mp3 && formats.mp3) {
                src = formats.mp3;
            } else if (ct.sound.ogg && formats.ogg) {
                src = formats.ogg;
            } else if (ct.sound.wav && formats.wav) {
                src = formats.wav;
            }
            options = options || {};
            var audio = {
                src,
                direct: document.createElement('audio'),
                pool: [],
                poolSize: options.poolSize || 5
            };
            if (src !== '') {
                ct.res.soundsLoaded++;
                audio.direct.preload = options.music ? 'metadata' : 'auto';
                audio.direct.onerror = audio.direct.onabort = function onabort() {
                    console.error('[ct.sound] Oh no! We couldn\'t load ' + src + '!');
                    audio.buggy = true;
                    ct.res.soundsError++;
                    ct.res.soundsLoaded--;
                };
                audio.direct.src = src;
            } else {
                ct.res.soundsError++;
                audio.buggy = true;
                console.error('[ct.sound] We couldn\'t load sound named "' + name + '" because the browser doesn\'t support any of proposed formats.');
            }
            ct.res.sounds[name] = audio;
            return audio;
        },
        /**
         * Spawns a new sound and plays it.
         *
         * @param {string} name The name of sound to be played
         * @param {object} [opts] Options object that is applied to a newly created audio tag
         * @param {Function} [cb] A callback, which is called when the sound finishes playing
         *
         * @returns {HTMLTagAudio|Boolean} The created audio or `false` (if a sound wasn't created)
         */
        spawn(name, opts, cb) {
            opts = opts || {};
            if (typeof opts === 'function') {
                cb = opts;
            }
            var s = ct.res.sounds[name];
            if (s.pool.length < s.poolSize) {
                var a = document.createElement('audio');
                a.src = s.src;
                if (opts) {
                    ct.u.ext(a, opts);
                }
                s.pool.push(a);
                a.addEventListener('ended', function soundEnded(e) {
                    s.pool.splice(s.pool.indexOf(a), 1);
                    if (cb) {
                        cb(true, e);
                    }
                });

                a.play();
                return a;
            } else if (cb) {
                cb(false);
            }
            return false;
        },
        exists(name) {
            return (name in ct.res.sounds);
        }
    };

    // define sound types we can support
    ct.sound.wav = ct.sound.detect('audio/wav; codecs="1"');
    ct.sound.mp3 = ct.sound.detect('audio/mpeg;');
    ct.sound.ogg = ct.sound.detect('audio/ogg;');
} else {
    console.error('Another sound system is already enabled. Disable `sound.basic` module in your ct.js project.');
}

{
    let passed = 0,
        failed = 0;
    ct.assert = function assert(condition, message) {
        let result = condition;
        if (condition instanceof Function) {
            try {
                result = condition();
            } catch (e) {
                console.error(`%c Got an execution error while evaluating%c${message ? ':\n' + message : ''}`, 'font-weigth: bold;', '');
                failed++;
                throw e;
            }
        }
        if (typeof result !== 'boolean') {
            console.error(`%c Not a boolean%c${message ? ':\n' + message : ''}\nGot this value:`, 'font-weigth: bold;', '');
            // eslint-disable-next-line no-console
            console.log(result);
            failed++;
        }
        if (result) {
            // eslint-disable-next-line no-console
            console.log(`%c✅ Passed%c${message ? ':\n' + message : ''}`, 'color: #3c3; font-weight: bold;', '');
            passed++;
        } else {
            console.error(`%c Failed%c${message ? ':\n' + message : ''}`, 'font-weigth: bold;', '');
            failed++;
        }
    };
    ct.assert.summary = function summary() {
        if (failed > 0) {
            console.error(`%c Failed: ${failed}, passed: ${passed}.`, 'font-weight: bold;');
        } else {
            // eslint-disable-next-line no-console
            console.log(`%c✅ Failed: ${failed}, passed: ${passed}.`, 'color: #3c3; font-weight: bold;');
        }
        failed = passed = 0;
    };
}

/* eslint-disable no-mixed-operators */
/* eslint-disable no-bitwise */
ct.random = function random(x) {
    return Math.random() * x;
};
ct.u.ext(ct.random, {
    dice(...variants) {
        return variants[Math.floor(Math.random() * variants.length)];
    },
    histogram(...histogram) {
        const coeffs = [...histogram];
        let sumCoeffs = 0;
        for (let i = 0; i < coeffs.length; i++) {
            sumCoeffs += coeffs[i];
            if (i > 0) {
                coeffs[i] += coeffs[i - 1];
            }
        }
        const bucketPosition = Math.random() * sumCoeffs;
        var i;
        for (i = 0; i < coeffs.length; i++) {
            if (coeffs[i] > bucketPosition) {
                break;
            }
        }
        return i / coeffs.length + Math.random() / coeffs.length;
    },
    optimistic(exp) {
        return 1 - ct.random.pessimistic(exp);
    },
    pessimistic(exp) {
        exp = exp || 2;
        return Math.random() ** exp;
    },
    range(x1, x2) {
        return x1 + Math.random() * (x2 - x1);
    },
    deg() {
        return Math.random() * 360;
    },
    coord() {
        return [Math.floor(Math.random() * ct.width), Math.floor(Math.random() * ct.height)];
    },
    chance(x, y) {
        if (y) {
            return (Math.random() * y < x);
        }
        return (Math.random() * 100 < x);
    },
    from(arr) {
        return arr[Math.floor(Math.random() * arr.length)];
    },
    // Mulberry32, by bryc from https://stackoverflow.com/a/47593316
    createSeededRandomizer(a) {
        return function seededRandomizer() {
            var t = a += 0x6D2B79F5;
            t = Math.imul(t ^ t >>> 15, t | 1);
            t ^= t + Math.imul(t ^ t >>> 7, t | 61);
            return ((t ^ t >>> 14) >>> 0) / 4294967296;
        };
    }
});
{
    const handle = {};
    handle.currentRootRandomizer = ct.random.createSeededRandomizer(456852);
    ct.random.seeded = function seeded() {
        return handle.currentRootRandomizer();
    };
    ct.random.setSeed = function setSeed(seed) {
        handle.currentRootRandomizer = ct.random.createSeededRandomizer(seed);
    };
    ct.random.setSeed(9323846264);
}

ct.sprite = function sprite(source, name, frames) {
    const gr = ct.res.getTexture(source);
    if (!gr) {
        console.error('[ct.sprite] Graphic asset does not exist: ' + source);
        return false;
    }
    if (ct.res.textures[name]) {
        console.error('[ct.sprite] Graphic asset with this name already exists: ' + name);
        return false;
    }
    var spr = frames.map(function mapSpriteFrames(id) {
        if (gr[id]) {
            return gr[id];
        }
        console.error(`[ct.sprite] Frame #${id} does not exist in the asset ${source}`);
        return gr[0];
    });
    spr.shape = gr.shape;
    ct.res.textures[name] = spr;
    return true;
};

(function mountCtTouch(ct) {
    var keyPrefix = 'touch.';
    var setKey = function (key, value) {
        ct.inputs.registry[keyPrefix + key] = value;
    };
    var lastPanNum = 0,
        lastPanX = 0,
        lastPanY = 0,
        lastScaleDistance = 0,
        lastAngle = 0;
    // updates Action system's input methods for singular, double and triple touches
    var countTouches = () => {
        setKey('Any', ct.touch.events.length > 0 ? 1 : 0);
        setKey('Double', ct.touch.events.length > 1 ? 1 : 0);
        setKey('Triple', ct.touch.events.length > 2 ? 1 : 0);
    };
    // returns a new object with the necessary information about a touch event
    var copyTouch = e => {
        const rect = ct.pixiApp.view.getBoundingClientRect();
        const xui = (e.clientX - rect.left) / rect.width * ct.camera.width,
              yui = (e.clientY - rect.top) / rect.height * ct.camera.height;
        const positionGame = ct.u.uiToGameCoord(xui, yui);
        const touch = {
            id: e.identifier,
            x: positionGame.x,
            y: positionGame.y,
            xui: xui,
            yui: yui,
            xprev: positionGame.x,
            yprev: positionGame.y,
            xuiprev: xui,
            yuiprev: yui,
            r: e.radiusX ? Math.max(e.radiusX, e.radiusY) : 0
        };
        return touch;
    };
    var findTouch = id => {
        for (let i = 0; i < ct.touch.events.length; i++) {
            if (ct.touch.events[i].id === id) {
                return ct.touch.events[i];
            }
        }
        return false;
    };
    var findTouchId = id => {
        for (let i = 0; i < ct.touch.events.length; i++) {
            if (ct.touch.events[i].id === id) {
                return i;
            }
        }
        return -1;
    };
    var handleStart = function (e) {
        if (![false][0] && !ct.touch.permitDefault) {
            e.preventDefault();
        }
        for (let i = 0, l = e.changedTouches.length; i < l; i++) {
            var touch = copyTouch(e.changedTouches[i]);
            ct.touch.events.push(touch);
            ct.touch.x = touch.x;
            ct.touch.y = touch.y;
            ct.touch.xui = touch.xui;
            ct.touch.yui = touch.yui;
        }
        countTouches();
    };
    var handleMove = function (e) {
        if (![false][0] && !ct.touch.permitDefault) {
            e.preventDefault();
        }
        for (let i = 0, l = e.changedTouches.length; i < l; i++) {
            const touch = e.changedTouches[i],
                  upd = findTouch(e.changedTouches[i].identifier);
            if (upd) {
                const rect = ct.pixiApp.view.getBoundingClientRect();
                upd.xui = (touch.clientX - rect.left) / rect.width * ct.camera.width;
                upd.yui = (touch.clientY - rect.top) / rect.height * ct.camera.height;
                ({x: upd.x, y: upd.y} = ct.u.uiToGameCoord(upd.xui, upd.yui));
                upd.r = touch.radiusX ? Math.max(touch.radiusX, touch.radiusY) : 0;
                ct.touch.x = upd.x;
                ct.touch.y = upd.y;
                ct.touch.xui = upd.xui;
                ct.touch.yui = upd.yui;
            }
        }
    };
    var handleRelease = function (e) {
        if (![false][0] && !ct.touch.permitDefault) {
            e.preventDefault();
        }
        var touches = e.changedTouches;
        for (let i = 0; i < touches.length; i++) {
            const ind = findTouchId(touches[i].identifier);
            if (ind !== -1) {
                ct.touch.released.push(ct.touch.events.splice(ind, 1)[0]);
            }
        }
        countTouches();
    };
    var mouseDown = function (e) {
        const rect = ct.pixiApp.view.getBoundingClientRect();
        var touch = {
            id: -1,
            xui: (e.clientX - rect.left) * ct.camera.width / rect.width,
            yui: (e.clientY - rect.top) * ct.camera.height / rect.height,
            r: 0
        };
        ({x: touch.x, y: touch.y} = ct.u.uiToGameCoord(touch.xui, touch.yui));
        ct.touch.events.push(touch);
        ct.touch.x = touch.x;
        ct.touch.y = touch.y;
        ct.touch.xui = touch.xui;
        ct.touch.yui = touch.yui;
        countTouches();
    };
    var mouseMove = function (e) {
        const rect = ct.pixiApp.view.getBoundingClientRect(),
              touch = findTouch(-1);
        if (touch) {
            touch.xui = (e.clientX - rect.left) * ct.camera.width / rect.width;
            touch.yui = (e.clientY - rect.top) * ct.camera.height / rect.height;
            ({x: touch.x, y: touch.y} = ct.u.uiToGameCoord(touch.xui, touch.yui));
            ct.touch.x = touch.x;
            ct.touch.y = touch.y;
            ct.touch.xui = touch.xui;
            ct.touch.yui = touch.yui;
        }
    };
    var mouseUp = function () {
        ct.touch.events = ct.touch.events.filter(x => x.id !== -1);
        countTouches();
    };
    ct.touch = {
        released: [],
        setupListeners() {
            document.addEventListener('touchstart', handleStart, false);
            document.addEventListener('touchstart', () => {
                ct.touch.enabled = true;
            }, {
                once: true
            });
            document.addEventListener('touchend', handleRelease, false);
            document.addEventListener('touchcancel', handleRelease, false);
            document.addEventListener('touchmove', handleMove, false);
        },
        setupMouseListeners() {
            document.addEventListener('mousemove', mouseMove, false);
            document.addEventListener('mouseup', mouseUp, false);
            document.addEventListener('mousedown', mouseDown, false);
        },
        enabled: false,
        events: [],
        x: 0,
        y: 0,
        xprev: 0,
        yprev: 0,
        xui: 0,
        yui: 0,
        xuiprev: 0,
        yuiprev: 0,
        permitDefault: false,
        clear() {
            ct.touch.events.length = 0;
            ct.touch.clearReleased();
            countTouches();
        },
        clearReleased() {
            ct.touch.released.length = 0;
        },
        collide(copy, id, rel) {
            var set = rel ? ct.touch.released : ct.touch.events;
            if (id !== void 0 && id !== false) {
                const i = findTouchId(id);
                if (i === -1) {
                    return false;
                }
                return ct.place.collide(copy, {
                    x: set[i].x,
                    y: set[i].y,
                    shape: {
                        type: set[i].r ? 'circle' : 'point',
                        r: set[i].r
                    },
                    scale: {
                        x: 1,
                        y: 1
                    }
                });
            }
            for (let i = 0, l = set.length; i < l; i++) {
                if (ct.place.collide(copy, {
                    x: set[i].x,
                    y: set[i].y,
                    shape: {
                        type: set[i].r ? 'circle' : 'point',
                        r: set[i].r
                    },
                    scale: {
                        x: 1,
                        y: 1
                    }
                })) {
                    return true;
                }
            }
            return false;
        },
        collideUi(copy, id, rel) {
            var set = rel ? ct.touch.released : ct.touch.events;
            if (id !== void 0 && id !== false) {
                const i = findTouchId(id);
                if (i === -1) {
                    return false;
                }
                return ct.place.collide(copy, {
                    x: set[i].xui,
                    y: set[i].yui,
                    shape: {
                        type: set[i].r ? 'circle' : 'point',
                        r: set[i].r
                    },
                    scale: {
                        x: 1,
                        y: 1
                    }
                });
            }
            for (let i = 0, l = set.length; i < l; i++) {
                if (ct.place.collide(copy, {
                    x: set[i].xui,
                    y: set[i].yui,
                    shape: {
                        type: set[i].r ? 'circle' : 'point',
                        r: set[i].r
                    },
                    scale: {
                        x: 1,
                        y: 1
                    }
                })) {
                    return true;
                }
            }
            return false;
        },
        hovers(copy, id, rel) {
            return ct.mouse ?
                (ct.mouse.hovers(copy) || ct.touch.collide(copy, id, rel)) :
                ct.touch.collide(copy, id, rel);
        },
        hoversUi(copy, id, rel) {
            return ct.mouse ?
                (ct.mouse.hoversUi(copy) || ct.touch.collideUi(copy, id, rel)) :
                ct.touch.collideUi(copy, id, rel);
        },
        getById: findTouch,
        updateGestures: function () {
            let x = 0,
                y = 0;
            const rect = ct.pixiApp.view.getBoundingClientRect();
            for (const event of ct.touch.events) {
                x += (event.clientX - rect.left) / rect.width;
                y += (event.clientY - rect.top) / rect.height;
            }
            x /= ct.touch.events.length;
            y /= ct.touch.events.length;

            let angle = 0,
                distance = lastScaleDistance;
            if (ct.touch.events.length > 1) {
                const events = [
                    ct.touch.events[0],
                    ct.touch.events[1]
                ].sort((a, b) => a.id - b.id);
                angle = ct.u.pdn(
                    events[0].x,
                    events[0].y,
                    events[1].x,
                    events[1].y
                );
                distance = ct.u.pdc(
                    events[0].x,
                    events[0].y,
                    events[1].x,
                    events[1].y
                );
            }

            if (lastPanNum === ct.touch.events.length) {
                if (ct.touch.events.length > 1) {
                    setKey('DeltaRotation', (ct.u.degToRad(ct.u.deltaDir(lastAngle, angle))));
                    setKey('DeltaPinch', distance / lastScaleDistance - 1);
                } else {
                    setKey('DeltaPinch', 0);
                    setKey('DeltaRotation', 0);
                }
                if (!ct.touch.events.length) {
                    setKey('PanX', 0);
                    setKey('PanY', 0);
                } else {
                    setKey('PanX', x - lastPanX);
                    setKey('PanY', y - lastPanY);
                }
            } else {
                // skip gesture updates to avoid shaking on new presses
                lastPanNum = ct.touch.events.length;
                setKey('DeltaPinch', 0);
                setKey('DeltaRotation', 0);
                setKey('PanX', 0);
                setKey('PanY', 0);
            }
            lastPanX = x;
            lastPanY = y;
            lastAngle = angle;
            lastScaleDistance = distance;
        }
    };
})(ct);

(function ctTransition() {
    const makeGenericTransition = function makeGenericTransition(name, exts) {
        ct.rooms.templates.CTTRANSITIONEMPTYROOM.width = ct.camera.width;
        ct.rooms.templates.CTTRANSITIONEMPTYROOM.height = ct.camera.height;
        const room = ct.rooms.append('CTTRANSITIONEMPTYROOM', {
            isUi: true
        });
        const transition = ct.templates.copyIntoRoom(
            name, 0, 0, room,
            Object.assign({
                room
            }, exts)
        );
        return transition.promise;
    };
    ct.transition = {
        fadeOut(duration, color) {
            duration = duration || 500;
            color = color || 0x000000; // Defaults to a black color
            return makeGenericTransition('CTTRANSITION_FADE', {
                duration,
                color,
                in: false
            });
        },
        fadeIn(duration, color) {
            duration = duration || 500;
            color = color || 0x000000; // Defaults to a black color
            return makeGenericTransition('CTTRANSITION_FADE', {
                duration,
                color,
                in: true
            });
        },
        scaleOut(duration, scaling, color) {
            duration = duration || 500;
            scaling = scaling || 0.1;
            color = color || 0x000000; // Defaults to a black color
            return makeGenericTransition('CTTRANSITION_SCALE', {
                duration,
                color,
                scaling,
                in: false
            });
        },
        scaleIn(duration, scaling, color) {
            duration = duration || 500;
            scaling = scaling || 0.1;
            color = color || 0x000000; // Defaults to a black color
            return makeGenericTransition('CTTRANSITION_SCALE', {
                duration,
                color,
                scaling,
                in: true
            });
        },
        slideOut(duration, direction, color) {
            duration = duration || 500;
            direction = direction || 'right';
            color = color || 0x000000; // Defaults to a black color
            return makeGenericTransition('CTTRANSITION_SLIDE', {
                duration,
                color,
                endAt: direction,
                in: false
            });
        },
        slideIn(duration, direction, color) {
            duration = duration || 500;
            direction = direction || 'right';
            color = color || 0x000000; // Defaults to a black color
            return makeGenericTransition('CTTRANSITION_SLIDE', {
                duration,
                color,
                endAt: direction,
                in: true
            });
        },
        circleOut(duration, color) {
            color = color || 0x000000; // Defaults to a black color
            return makeGenericTransition('CTTRANSITION_CIRCLE', {
                duration,
                color,
                in: true
            });
        },
        circleIn(duration, color) {
            color = color || 0x000000; // Defaults to a black color
            return makeGenericTransition('CTTRANSITION_CIRCLE', {
                duration,
                color,
                in: false
            });
        }
    };
})();


(() => {
    ct.storage = {
        set(name, value) {
            localStorage[name] = JSON.stringify(value) || value.toString();
        },

        get(name) {
            let value;
            try {
                value = JSON.parse(localStorage[name]);
            } catch (e) {
                value = localStorage[name].toString();
            }
            return value;
        },

        setSession(name, value) {
            sessionStorage[name] = JSON.stringify(value) || value.toString();
        },

        getSession(name) {
            let value;
            try {
                value = JSON.parse(sessionStorage[name]);
            } catch (e) {
                value = sessionStorage[name].toString();
            }
            return value;
        }
    };
})();

(function ctVkeys() {
    ct.vkeys = {
        button(options) {
            var opts = ct.u.ext({
                key: 'Vk1',
                depth: 100,
                alpha: 1,
                texNormal: -1,
                x: 128,
                y: 128,
                container: ct.room
            }, options || {});
            const copy = ct.templates.copy('VKEY', 0, 0, {
                opts: opts
            }, opts.container);
            if (typeof options.x === 'function' || typeof options.y === 'function') {
                copy.skipRealign = true;
            }
            return copy;
        },
        joystick(options) {
            var opts = ct.u.ext({
                key: 'Vjoy1',
                depth: 100,
                alpha: 1,
                tex: -1,
                trackballTex: -1,
                x: 128,
                y: 128,
                container: ct.room
            }, options || {});
            const copy = ct.templates.copy('VJOYSTICK', 0, 0, {
                opts: opts
            }, opts.container);
            if (typeof options.x === 'function' || typeof options.y === 'function') {
                copy.skipRealign = true;
            }
            return copy;
        }
    };
})();

/**
 * @typedef ICtPlaceRectangle
 * @property {number} [x1] The left side of the rectangle.
 * @property {number} [y1] The upper side of the rectangle.
 * @property {number} [x2] The right side of the rectangle.
 * @property {number} [y2] The bottom side of the rectangle.
 * @property {number} [x] The left side of the rectangle.
 * @property {number} [y] The upper side of the rectangle.
 * @property {number} [width] The right side of the rectangle.
 * @property {number} [height] The bottom side of the rectangle.
 */
/**
 * @typedef ICtPlaceLineSegment
 * @property {number} x1 The horizontal coordinate of the starting point of the ray.
 * @property {number} y1 The vertical coordinate of the starting point of the ray.
 * @property {number} x2 The horizontal coordinate of the ending point of the ray.
 * @property {number} y2 The vertical coordinate of the ending point of the ray.
 */
/**
 * @typedef ICtPlaceCircle
 * @property {number} x The horizontal coordinate of the circle's center.
 * @property {number} y The vertical coordinate of the circle's center.
 * @property {number} radius The radius of the circle.
 */
/* eslint-disable no-underscore-dangle */
/* global SSCD */
/* eslint prefer-destructuring: 0 */
(function ctPlace(ct) {
    const circlePrecision = 16;
    const debugMode = [false][0];

    const getSSCDShapeFromRect = function (obj) {
        const {shape} = obj,
              position = new SSCD.Vector(obj.x, obj.y);
        if (obj.angle === 0) {
            position.x -= obj.scale.x > 0 ?
                (shape.left * obj.scale.x) :
                (-obj.scale.x * shape.right);
            position.y -= obj.scale.y > 0 ?
                (shape.top * obj.scale.y) :
                (-shape.bottom * obj.scale.y);
            return new SSCD.Rectangle(
                position,
                new SSCD.Vector(
                    Math.abs((shape.left + shape.right) * obj.scale.x),
                    Math.abs((shape.bottom + shape.top) * obj.scale.y)
                )
            );
        }
        const upperLeft = ct.u.rotate(
            -shape.left * obj.scale.x,
            -shape.top * obj.scale.y, obj.angle
        );
        const bottomLeft = ct.u.rotate(
            -shape.left * obj.scale.x,
            shape.bottom * obj.scale.y, obj.angle
        );
        const bottomRight = ct.u.rotate(
            shape.right * obj.scale.x,
            shape.bottom * obj.scale.y, obj.angle
        );
        const upperRight = ct.u.rotate(
            shape.right * obj.scale.x,
            -shape.top * obj.scale.y, obj.angle
        );
        return new SSCD.LineStrip(position, [
            new SSCD.Vector(upperLeft.x, upperLeft.y),
            new SSCD.Vector(bottomLeft.x, bottomLeft.y),
            new SSCD.Vector(bottomRight.x, bottomRight.y),
            new SSCD.Vector(upperRight.x, upperRight.y)
        ], true);
    };

    const getSSCDShapeFromCircle = function (obj) {
        const {shape} = obj,
              position = new SSCD.Vector(obj.x, obj.y);
        if (Math.abs(obj.scale.x) === Math.abs(obj.scale.y)) {
            return new SSCD.Circle(position, shape.r * Math.abs(obj.scale.x));
        }
        const vertices = [];
        for (let i = 0; i < circlePrecision; i++) {
            const point = [
                ct.u.ldx(shape.r * obj.scale.x, 360 / circlePrecision * i),
                ct.u.ldy(shape.r * obj.scale.y, 360 / circlePrecision * i)
            ];
            if (obj.angle !== 0) {
                const {x, y} = ct.u.rotate(point[0], point[1], obj.angle);
                vertices.push(new SSCD.Vector(x, y));
            } else {
                vertices.push(new SSCD.Vector(point[0], point[1]));
            }
        }
        return new SSCD.LineStrip(position, vertices, true);
    };

    const getSSCDShapeFromStrip = function (obj) {
        const {shape} = obj,
              position = new SSCD.Vector(obj.x, obj.y);
        const vertices = [];
        if (obj.angle !== 0) {
            for (const point of shape.points) {
                const {x, y} = ct.u.rotate(
                    point.x * obj.scale.x,
                    point.y * obj.scale.y, obj.angle
                );
                vertices.push(new SSCD.Vector(x, y));
            }
        } else {
            for (const point of shape.points) {
                vertices.push(new SSCD.Vector(point.x * obj.scale.x, point.y * obj.scale.y));
            }
        }
        return new SSCD.LineStrip(position, vertices, Boolean(shape.closedStrip));
    };

    const getSSCDShapeFromLine = function (obj) {
        const {shape} = obj;
        if (obj.angle !== 0) {
            const {x: x1, y: y1} = ct.u.rotate(
                shape.x1 * obj.scale.x,
                shape.y1 * obj.scale.y,
                obj.angle
            );
            const {x: x2, y: y2} = ct.u.rotate(
                shape.x2 * obj.scale.x,
                shape.y2 * obj.scale.y,
                obj.angle
            );
            return new SSCD.Line(
                new SSCD.Vector(
                    obj.x + x1,
                    obj.y + y1
                ),
                new SSCD.Vector(
                    x2 - x1,
                    y2 - y1
                )
            );
        }
        return new SSCD.Line(
            new SSCD.Vector(
                obj.x + shape.x1 * obj.scale.x,
                obj.y + shape.y1 * obj.scale.y
            ),
            new SSCD.Vector(
                (shape.x2 - shape.x1) * obj.scale.x,
                (shape.y2 - shape.y1) * obj.scale.y
            )
        );
    };

    /**
     * Gets SSCD shapes from object's shape field and its transforms.
     */
    var getSSCDShape = function (obj) {
        switch (obj.shape.type) {
        case 'rect':
            return getSSCDShapeFromRect(obj);
        case 'circle':
            return getSSCDShapeFromCircle(obj);
        case 'strip':
            return getSSCDShapeFromStrip(obj);
        case 'line':
            return getSSCDShapeFromLine(obj);
        default:
            return new SSCD.Circle(new SSCD.Vector(obj.x, obj.y), 0);
        }
    };

    // Premade filter predicates to avoid function creation and memory bloat during the game loop.
    const templateNameFilter = (target, other, template) => other.template === template;
    const cgroupFilter = (target, other, cgroup) => !cgroup || cgroup === other.cgroup;

    // Core collision-checking method that accepts various filtering predicates
    // and a variable partitioning grid.

    // eslint-disable-next-line max-params
    const genericCollisionQuery = function (
        target,
        customX,
        customY,
        partitioningGrid,
        queryAll,
        filterPredicate,
        filterVariable
    ) {
        const oldx = target.x,
              oldy = target.y;
        const shapeCashed = target._shape;
        let hashes, results;
        // Apply arbitrary location to the checked object
        if (customX !== void 0 && (oldx !== customX || oldy !== customY)) {
            target.x = customX;
            target.y = customY;
            target._shape = getSSCDShape(target);
            hashes = ct.place.getHashes(target);
        } else {
            hashes = target.$chashes || ct.place.getHashes(target);
            target._shape = target._shape || getSSCDShape(target);
        }
        if (queryAll) {
            results = [];
        }
        // Get all the known objects in close proximity to the tested object,
        // sourcing from the passed partitioning grid.
        for (const hash of hashes) {
            const array = partitioningGrid[hash];
            // Such partition cell is absent
            if (!array) {
                continue;
            }
            for (const obj of array) {
                // Skip checks against the tested object itself.
                if (obj === target) {
                    continue;
                }
                // Filter out objects
                if (!filterPredicate(target, obj, filterVariable)) {
                    continue;
                }
                // Check for collision between two objects
                if (ct.place.collide(target, obj)) {
                    // Singular pick; return the collided object immediately.
                    if (!queryAll) {
                        // Return the object back to its old position.
                        // Skip SSCD shape re-calculation.
                        if (oldx !== target.x || oldy !== target.y) {
                            target.x = oldx;
                            target.y = oldy;
                            target._shape = shapeCashed;
                        }
                        return obj;
                    }
                    // Multiple pick; push the collided object into an array.
                    if (!results.includes(obj)) {
                        results.push(obj);
                    }
                }
            }
        }
        // Return the object back to its old position.
        // Skip SSCD shape re-calculation.
        if (oldx !== target.x || oldy !== target.y) {
            target.x = oldx;
            target.y = oldy;
            target._shape = shapeCashed;
        }
        if (!queryAll) {
            return false;
        }
        return results;
    };

    ct.place = {
        m: 1, // direction modifier in ct.place.go,
        gridX: [512][0] || 512,
        gridY: [512][0] || 512,
        grid: {},
        tileGrid: {},
        getHashes(copy) {
            var hashes = [];
            var x = Math.round(copy.x / ct.place.gridX),
                y = Math.round(copy.y / ct.place.gridY),
                dx = Math.sign(copy.x - ct.place.gridX * x),
                dy = Math.sign(copy.y - ct.place.gridY * y);
            hashes.push(`${x}:${y}`);
            if (dx) {
                hashes.push(`${x + dx}:${y}`);
                if (dy) {
                    hashes.push(`${x + dx}:${y + dy}`);
                }
            }
            if (dy) {
                hashes.push(`${x}:${y + dy}`);
            }
            return hashes;
        },
        /**
         * Applied to copies in the debug mode. Draws a collision shape
         * @this Copy
         * @param {boolean} [absolute] Whether to use room coordinates
         * instead of coordinates relative to the copy.
         * @returns {void}
         */
        drawDebugGraphic(absolute) {
            const shape = this._shape || getSSCDShape(this);
            const g = this.$cDebugCollision;
            const inverse = this.transform.localTransform.clone().invert();
            this.$cDebugCollision.transform.setFromMatrix(inverse);
            this.$cDebugCollision.position.set(0, 0);
            let color = 0x00ffff;
            if (this instanceof Copy) {
                color = 0x0066ff;
            } else if (this instanceof PIXI.Sprite) {
                color = 0x6600ff;
            }
            if (this.$cHadCollision) {
                color = 0x00ff00;
            }
            g.lineStyle(2, color);
            if (shape instanceof SSCD.Rectangle) {
                const pos = shape.get_position(),
                      size = shape.get_size();
                g.beginFill(color, 0.1);
                if (!absolute) {
                    g.drawRect(pos.x - this.x, pos.y - this.y, size.x, size.y);
                } else {
                    g.drawRect(pos.x, pos.y, size.x, size.y);
                }
                g.endFill();
            } else if (shape instanceof SSCD.LineStrip) {
                if (!absolute) {
                    g.moveTo(shape.__points[0].x, shape.__points[0].y);
                    for (let i = 1; i < shape.__points.length; i++) {
                        g.lineTo(shape.__points[i].x, shape.__points[i].y);
                    }
                } else {
                    g.moveTo(shape.__points[0].x + this.x, shape.__points[0].y + this.y);
                    for (let i = 1; i < shape.__points.length; i++) {
                        g.lineTo(shape.__points[i].x + this.x, shape.__points[i].y + this.y);
                    }
                }
            } else if (shape instanceof SSCD.Circle && shape.get_radius() > 0) {
                g.beginFill(color, 0.1);
                if (!absolute) {
                    g.drawCircle(0, 0, shape.get_radius());
                } else {
                    g.drawCircle(this.x, this.y, shape.get_radius());
                }
                g.endFill();
            } else if (shape instanceof SSCD.Line) {
                if (!absolute) {
                    g.moveTo(
                        shape.__position.x,
                        shape.__position.y
                    ).lineTo(
                        shape.__position.x + shape.__dest.x,
                        shape.__position.y + shape.__dest.y
                    );
                } else {
                    const p1 = shape.get_p1();
                    const p2 = shape.get_p2();
                    g.moveTo(p1.x, p1.y)
                    .lineTo(p2.x, p2.y);
                }
            } else if (!absolute) { // Treat as a point
                g.moveTo(-16, -16)
                .lineTo(16, 16)
                .moveTo(-16, 16)
                .lineTo(16, -16);
            } else {
                g.moveTo(-16 + this.x, -16 + this.y)
                .lineTo(16 + this.x, 16 + this.y)
                .moveTo(-16 + this.x, 16 + this.y)
                .lineTo(16 + this.x, -16 + this.y);
            }
        },
        collide(c1, c2) {
            // ct.place.collide(<c1: Copy, c2: Copy>)
            // Test collision between two copies
            c1._shape = c1._shape || getSSCDShape(c1);
            c2._shape = c2._shape || getSSCDShape(c2);
            if (c1._shape.__type === 'strip' ||
                c2._shape.__type === 'strip' ||
                c1._shape.__type === 'complex' ||
                c2._shape.__type === 'complex'
            ) {
                const aabb1 = c1._shape.get_aabb(),
                      aabb2 = c2._shape.get_aabb();
                if (!aabb1.intersects(aabb2)) {
                    return false;
                }
            }
            if (SSCD.CollisionManager.test_collision(c1._shape, c2._shape)) {
                if ([false][0]) {
                    c1.$cHadCollision = true;
                    c2.$cHadCollision = true;
                }
                return true;
            }
            return false;
        },
        /**
         * Determines if the place in (x,y) is occupied by any copies or tiles.
         * Optionally can take 'cgroup' as a filter for obstacles'
         * collision group (not shape type).
         *
         * @param {Copy} me The object to check collisions on.
         * @param {number} [x] The x coordinate to check, as if `me` was placed there.
         * @param {number} [y] The y coordinate to check, as if `me` was placed there.
         * @param {String} [cgroup] The collision group to check against
         * @returns {Copy|Array<Copy>} The collided copy, or an array of all the detected collisions
         * (if `multiple` is `true`)
         */
        occupied(target, x, y, cgroup) {
            if (typeof y !== 'number') {
                // No arbitrary location was passed, rewrite arguments w/o them.
                cgroup = x;
                x = void 0;
                y = void 0;
            }
            const copies = genericCollisionQuery(
                target, x, y,
                ct.place.grid,
                false,
                cgroupFilter, cgroup
            );
            // Was any suitable copy found? Return it immediately and skip the query for tiles.
            if (copies) {
                return copies;
            }
            // Return query result for tiles.
            return genericCollisionQuery(
                target, x, y,
                ct.place.tileGrid,
                false,
                cgroupFilter, cgroup
            );
        },
        occupiedMultiple(target, x, y, cgroup) {
            if (typeof y !== 'number') {
                // No arbitrary location was passed, rewrite arguments w/o them.
                cgroup = x;
                x = void 0;
                y = void 0;
            }
            const copies = genericCollisionQuery(
                target, x, y,
                ct.place.grid,
                true,
                cgroupFilter, cgroup
            );
            const tiles = genericCollisionQuery(
                target, x, y,
                ct.place.tileGrid,
                true,
                cgroupFilter, cgroup
            );
            return copies.concat(tiles);
        },
        free(me, x, y, cgroup) {
            return !ct.place.occupied(me, x, y, cgroup);
        },
        meet(target, x, y, templateName) {
            if (typeof y !== 'number') {
                // No arbitrary location was passed, rewrite arguments w/o them.
                templateName = x;
                x = void 0;
                y = void 0;
            }
            return genericCollisionQuery(
                target, x, y,
                ct.place.grid,
                false,
                templateNameFilter, templateName
            );
        },
        meetMultiple(target, x, y, templateName) {
            if (typeof y !== 'number') {
                // No arbitrary location was passed, rewrite arguments w/o them.
                templateName = x;
                x = void 0;
                y = void 0;
            }
            return genericCollisionQuery(
                target, x, y,
                ct.place.grid,
                true,
                templateNameFilter, templateName
            );
        },
        copies(target, x, y, cgroup) {
            if (typeof y !== 'number') {
                // No arbitrary location was passed, rewrite arguments w/o them.
                cgroup = x;
                x = void 0;
                y = void 0;
            }
            return genericCollisionQuery(
                target, x, y,
                ct.place.grid,
                false,
                cgroupFilter, cgroup
            );
        },
        copiesMultiple(target, x, y, cgroup) {
            if (typeof y !== 'number') {
                // No arbitrary location was passed, rewrite arguments w/o them.
                cgroup = x;
                x = void 0;
                y = void 0;
            }
            return genericCollisionQuery(
                target, x, y,
                ct.place.grid,
                true,
                cgroupFilter, cgroup
            );
        },
        tiles(target, x, y, cgroup) {
            if (typeof y !== 'number') {
                // No arbitrary location was passed, rewrite arguments w/o them.
                cgroup = x;
                x = void 0;
                y = void 0;
            }
            return genericCollisionQuery(
                target, x, y,
                ct.place.tileGrid,
                false,
                cgroupFilter, cgroup
            );
        },
        tilesMultiple(target, x, y, cgroup) {
            if (typeof y !== 'number') {
                // No arbitrary location was passed, rewrite arguments w/o them.
                cgroup = x;
                x = void 0;
                y = void 0;
            }
            return genericCollisionQuery(
                target, x, y,
                ct.place.tileGrid,
                true,
                cgroupFilter, cgroup
            );
        },
        lastdist: null,
        nearest(x, y, templateName) {
            // ct.place.nearest(x: number, y: number, templateName: string)
            const copies = ct.templates.list[templateName];
            if (copies.length > 0) {
                var dist = Math.hypot(x - copies[0].x, y - copies[0].y);
                var inst = copies[0];
                for (const copy of copies) {
                    if (Math.hypot(x - copy.x, y - copy.y) < dist) {
                        dist = Math.hypot(x - copy.x, y - copy.y);
                        inst = copy;
                    }
                }
                ct.place.lastdist = dist;
                return inst;
            }
            return false;
        },
        furthest(x, y, template) {
            // ct.place.furthest(<x: number, y: number, template: Template>)
            const templates = ct.templates.list[template];
            if (templates.length > 0) {
                var dist = Math.hypot(x - templates[0].x, y - templates[0].y);
                var inst = templates[0];
                for (const copy of templates) {
                    if (Math.hypot(x - copy.x, y - copy.y) > dist) {
                        dist = Math.hypot(x - copy.x, y - copy.y);
                        inst = copy;
                    }
                }
                ct.place.lastdist = dist;
                return inst;
            }
            return false;
        },
        enableTilemapCollisions(tilemap, exactCgroup) {
            const cgroup = exactCgroup || tilemap.cgroup;
            if (tilemap.addedCollisions) {
                throw new Error('[ct.place] The tilemap already has collisions enabled.');
            }
            tilemap.cgroup = cgroup;
            // Prebake hashes and SSCD shapes for all the tiles
            for (const pixiSprite of tilemap.pixiTiles) {
                // eslint-disable-next-line no-underscore-dangle
                pixiSprite._shape = getSSCDShape(pixiSprite);
                pixiSprite.cgroup = cgroup;
                pixiSprite.$chashes = ct.place.getHashes(pixiSprite);
                /* eslint max-depth: 0 */
                for (const hash of pixiSprite.$chashes) {
                    if (!(hash in ct.place.tileGrid)) {
                        ct.place.tileGrid[hash] = [pixiSprite];
                    } else {
                        ct.place.tileGrid[hash].push(pixiSprite);
                    }
                }
                pixiSprite.depth = tilemap.depth;
            }
            if (debugMode) {
                for (const pixiSprite of tilemap.pixiTiles) {
                    pixiSprite.$cDebugCollision = new PIXI.Graphics();
                    ct.place.drawDebugGraphic.apply(pixiSprite, [false]);
                    pixiSprite.addChild(pixiSprite.$cDebugCollision);
                }
            }
            tilemap.addedCollisions = true;
        },
        moveAlong(me, dir, length, cgroup, precision) {
            if (!length) {
                return false;
            }
            if (typeof cgroup === 'number') {
                precision = cgroup;
                cgroup = void 0;
            }
            precision = Math.abs(precision || 1);
            if (length < 0) {
                length *= -1;
                dir += 180;
            }
            var dx = Math.cos(dir * Math.PI / 180) * precision,
                dy = Math.sin(dir * Math.PI / 180) * precision;
            while (length > 0) {
                if (length < 1) {
                    dx *= length;
                    dy *= length;
                }
                const occupied = ct.place.occupied(me, me.x + dx, me.y + dy, cgroup);
                if (!occupied) {
                    me.x += dx;
                    me.y += dy;
                    delete me._shape;
                } else {
                    return occupied;
                }
                length--;
            }
            return false;
        },
        moveByAxes(me, dx, dy, cgroup, precision) {
            if (dx === dy === 0) {
                return false;
            }
            if (typeof cgroup === 'number') {
                precision = cgroup;
                cgroup = void 0;
            }
            const obstacles = {
                x: false,
                y: false
            };
            precision = Math.abs(precision || 1);
            while (Math.abs(dx) > precision) {
                const occupied =
                    ct.place.occupied(me, me.x + Math.sign(dx) * precision, me.y, cgroup);
                if (!occupied) {
                    me.x += Math.sign(dx) * precision;
                    dx -= Math.sign(dx) * precision;
                } else {
                    obstacles.x = occupied;
                    break;
                }
            }
            while (Math.abs(dy) > precision) {
                const occupied =
                    ct.place.occupied(me, me.x, me.y + Math.sign(dy) * precision, cgroup);
                if (!occupied) {
                    me.y += Math.sign(dy) * precision;
                    dy -= Math.sign(dy) * precision;
                } else {
                    obstacles.y = occupied;
                    break;
                }
            }
            // A fraction of precision may be left but completely reachable; jump to this point.
            if (Math.abs(dx) < precision) {
                if (ct.place.free(me, me.x + dx, me.y, cgroup)) {
                    me.x += dx;
                }
            }
            if (Math.abs(dy) < precision) {
                if (ct.place.free(me, me.x, me.y + dy, cgroup)) {
                    me.y += dy;
                }
            }
            if (!obstacles.x && !obstacles.y) {
                return false;
            }
            return obstacles;
        },
        go(me, x, y, length, cgroup) {
            // ct.place.go(<me: Copy, x: number, y: number, length: number>[, cgroup: String])
            // tries to reach the target with a simple obstacle avoidance algorithm

            // if we are too close to the destination, exit
            if (ct.u.pdc(me.x, me.y, x, y) < length) {
                if (ct.place.free(me, x, y, cgroup)) {
                    me.x = x;
                    me.y = y;
                    delete me._shape;
                }
                return;
            }
            var dir = ct.u.pdn(me.x, me.y, x, y);

            //if there are no obstackles in front of us, go forward
            let projectedX = me.x + ct.u.ldx(length, dir),
                projectedY = me.y + ct.u.ldy(length, dir);
            if (ct.place.free(me, projectedX, projectedY, cgroup)) {
                me.x = projectedX;
                me.y = projectedY;
                delete me._shape;
                me.dir = dir;
            // otherwise, try to change direction by 30...60...90 degrees.
            // Direction changes over time (ct.place.m).
            } else {
                for (var i = -1; i <= 1; i += 2) {
                    for (var j = 30; j < 150; j += 30) {
                        projectedX = me.x + ct.u.ldx(length, dir + j * ct.place.m * i);
                        projectedY = me.y + ct.u.ldy(length, dir + j * ct.place.m * i);
                        if (ct.place.free(me, projectedX, projectedY, cgroup)) {
                            me.x = projectedX;
                            me.y = projectedY;
                            delete me._shape;
                            me.dir = dir + j * ct.place.m * i;
                            return;
                        }
                    }
                }
            }
        },
        traceCustom(shape, oversized, cgroup, getAll) {
            const results = [];
            if (debugMode) {
                shape.$cDebugCollision = ct.place.debugTraceGraphics;
                ct.place.drawDebugGraphic.apply(shape, [true]);
            }
            // Oversized tracing shapes won't work with partitioning table, and thus
            // will need to loop over all the copies and tiles in the room.
            // Non-oversized shapes can use plain ct.place.occupied.
            if (!oversized) {
                if (getAll) {
                    return ct.place.occupiedMultiple(shape, cgroup);
                }
                return ct.place.occupied(shape, cgroup);
            }
            // Oversized shapes.
            // Loop over all the copies in the room.
            for (const copy of ct.stack) {
                if (!cgroup || copy.cgroup === cgroup) {
                    if (ct.place.collide(shape, copy)) {
                        if (getAll) {
                            results.push(copy);
                        } else {
                            return copy;
                        }
                    }
                }
            }
            // Additionally, loop over all the tilesets and their tiles.
            for (const tilemap of ct.templates.list.TILEMAP) {
                if (!tilemap.addedCollisions) {
                    continue;
                }
                if (cgroup && tilemap.cgroup !== cgroup) {
                    continue;
                }
                for (const tile of tilemap.pixiTiles) {
                    if (ct.place.collide(shape, tile)) {
                        if (getAll) {
                            results.push(tile);
                        } else {
                            return tile;
                        }
                    }
                }
            }
            if (!getAll) {
                return false;
            }
            return results;
        },
        /**
         * Tests for intersections with a line segment.
         * If `getAll` is set to `true`, returns all the copies that intersect
         * the line segment; otherwise, returns the first one that fits the conditions.
         *
         * @param {ICtPlaceLineSegment} line An object that describes the line segment.
         * @param {string} [cgroup] An optional collision group to trace against.
         * If omitted, will trace through all the copies in the current room.
         * @param {boolean} [getAll] Whether to return all the intersections (true),
         * or return the first one.
         * @returns {Copy|Array<Copy>}
         */
        traceLine(line, cgroup, getAll) {
            let oversized = false;
            if (Math.abs(line.x1 - line.x2) > ct.place.gridX) {
                oversized = true;
            } else if (Math.abs(line.y1 - line.y2) > ct.place.gridY) {
                oversized = true;
            }
            const shape = {
                x: line.x1,
                y: line.y1,
                scale: {
                    x: 1, y: 1
                },
                rotation: 0,
                angle: 0,
                shape: {
                    type: 'line',
                    x1: 0,
                    y1: 0,
                    x2: line.x2 - line.x1,
                    y2: line.y2 - line.y1
                }
            };
            const result = ct.place.traceCustom(shape, oversized, cgroup, getAll);
            if (getAll) {
                // An approximate sorting by distance
                result.sort(function sortCopies(a, b) {
                    var dist1, dist2;
                    dist1 = ct.u.pdc(line.x1, line.y1, a.x, a.y);
                    dist2 = ct.u.pdc(line.x1, line.y1, b.x, b.y);
                    return dist1 - dist2;
                });
            }
            return result;
        },
        /**
         * Tests for intersections with a filled rectangle.
         * If `getAll` is set to `true`, returns all the copies that intersect
         * the rectangle; otherwise, returns the first one that fits the conditions.
         *
         * @param {ICtPlaceRectangle} rect An object that describes the line segment.
         * @param {string} [cgroup] An optional collision group to trace against.
         * If omitted, will trace through all the copies in the current room.
         * @param {boolean} [getAll] Whether to return all the intersections (true),
         * or return the first one.
         * @returns {Copy|Array<Copy>}
         */
        traceRect(rect, cgroup, getAll) {
            let oversized = false;
            rect = { // Copy the object
                ...rect
            };
            // Turn x1, x2, y1, y2 into x, y, width, and height
            if ('x1' in rect) {
                rect.x = rect.x1;
                rect.y = rect.y1;
                rect.width = rect.x2 - rect.x1;
                rect.height = rect.y2 - rect.y1;
            }
            if (Math.abs(rect.width) > ct.place.gridX || Math.abs(rect.height) > ct.place.gridY) {
                oversized = true;
            }
            const shape = {
                x: rect.x,
                y: rect.y,
                scale: {
                    x: 1, y: 1
                },
                rotation: 0,
                angle: 0,
                shape: {
                    type: 'rect',
                    left: 0,
                    top: 0,
                    right: rect.width,
                    bottom: rect.height
                }
            };
            return ct.place.traceCustom(shape, oversized, cgroup, getAll);
        },
        /**
         * Tests for intersections with a filled circle.
         * If `getAll` is set to `true`, returns all the copies that intersect
         * the circle; otherwise, returns the first one that fits the conditions.
         *
         * @param {ICtPlaceCircle} rect An object that describes the line segment.
         * @param {string} [cgroup] An optional collision group to trace against.
         * If omitted, will trace through all the copies in the current room.
         * @param {boolean} [getAll] Whether to return all the intersections (true),
         * or return the first one.
         * @returns {Copy|Array<Copy>}
         */
        traceCircle(circle, cgroup, getAll) {
            let oversized = false;
            if (circle.radius * 2 > ct.place.gridX || circle.radius * 2 > ct.place.gridY) {
                oversized = true;
            }
            const shape = {
                x: circle.x,
                y: circle.y,
                scale: {
                    x: 1, y: 1
                },
                rotation: 0,
                angle: 0,
                shape: {
                    type: 'circle',
                    r: circle.radius
                }
            };
            return ct.place.traceCustom(shape, oversized, cgroup, getAll);
        },
        /**
         * Tests for intersections with a polyline. It is a hollow shape made
         * of connected line segments. The shape is not closed unless you add
         * the closing point by yourself.
         * If `getAll` is set to `true`, returns all the copies that intersect
         * the polyline; otherwise, returns the first one that fits the conditions.
         *
         * @param {Array<IPoint>} polyline An array of objects with `x` and `y` properties.
         * @param {string} [cgroup] An optional collision group to trace against.
         * If omitted, will trace through all the copies in the current room.
         * @param {boolean} [getAll] Whether to return all the intersections (true),
         * or return the first one.
         * @returns {Copy|Array<Copy>}
         */
        tracePolyline(polyline, cgroup, getAll) {
            const shape = {
                x: 0,
                y: 0,
                scale: {
                    x: 1, y: 1
                },
                rotation: 0,
                angle: 0,
                shape: {
                    type: 'strip',
                    points: polyline
                }
            };
            return ct.place.traceCustom(shape, true, cgroup, getAll);
        },
        /**
         * Tests for intersections with a point.
         * If `getAll` is set to `true`, returns all the copies that intersect
         * the point; otherwise, returns the first one that fits the conditions.
         *
         * @param {object} point An object with `x` and `y` properties.
         * @param {string} [cgroup] An optional collision group to trace against.
         * If omitted, will trace through all the copies in the current room.
         * @param {boolean} [getAll] Whether to return all the intersections (true),
         * or return the first one.
         * @returns {Copy|Array<Copy>}
         */
        tracePoint(point, cgroup, getAll) {
            const shape = {
                x: point.x,
                y: point.y,
                scale: {
                    x: 1, y: 1
                },
                rotation: 0,
                angle: 0,
                shape: {
                    type: 'point'
                }
            };
            return ct.place.traceCustom(shape, false, cgroup, getAll);
        }
    };
    // Aliases
    ct.place.traceRectange = ct.place.traceRect;
    // a magic procedure which tells 'go' function to change its direction
    setInterval(function switchCtPlaceGoDirection() {
        ct.place.m *= -1;
    }, 789);
})(ct);
/**
 * @typedef {ITextureOptions}
 * @property {} []
 */

(function resAddon(ct) {
    const loadingScreen = document.querySelector('.ct-aLoadingScreen'),
          loadingBar = loadingScreen.querySelector('.ct-aLoadingBar');
    const dbFactory = window.dragonBones ? dragonBones.PixiFactory.factory : null;
    /**
     * A utility object that manages and stores textures and other entities
     * @namespace
     */
    ct.res = {
        sounds: {},
        textures: {},
        skeletons: {},
        groups: [{"fonts":{"ungrouped":[]},"textures":{"ungrouped":["Tileset","DALL·E_2023-11-23_22.35.09_-_A_collection_of_2D_pipe_sprites,_arranged_on_a_grid_for_easy_use,_featuring_specific_combinations_of_directions_and_colors._The_directions_include_str","pipe-steel-ew","pipe-steel-ns","room-128-4","room-128-3","room-128-blue","room-128-6","room-128-5","room-128-2","walls-2x128+8","room-128-1","periodic-table","walls-128+8","starry-sky-2675322_1920","wall-v","wall-h","backdrop","room-128-7","chimp-walk","chimp-idle","platform","block","coin","DALL·E_2023-11-26_14.05.24_-_An_updated_version_of_the_backdrop_for_a_2D_game,_depicting_the_bridge_of_a_steampunk_spaceship,_now_with_more_space_for_people._Retain_the_original_r","coin-32","telephone","door-open","door-locked","captain","door-unlocked","speech-bubble","thought-bubble","text-bubble","tank-1","tank-2","modal","side-panel","empty-tile","spark-1","stairs","manhole-closed","manhole-open","exit-button","canister-label","tank-2-red","paper","pipe-corner-NW","pipe-corner-SW","pipe-bit-1","code-blank","element","element-b","table-ship","spit","sailor","black-hole","engine-fire","asteroid","captain-2","janitors-room","explosion","blackSmoke00","wall-3","wall-2","wall-4","wall-1","button.scaled","snake-spit","snake-3","cat-1","red-neon","pipe-end-block","atom.64","pipe-empty","pluming-container","magnifier","msg-canister","tube"]},"styles":{"ungrouped":["Style_Score","Style_BodyText","Style_InfoBar","Style_Tooltip","Style_CodeOff","Style_5Rk63W","Style_CodeOn"]},"rooms":{"ungrouped":["Room_p-table","Room_Platformer","Room_UI","Room_Bridge","Room_Puzzle_Pipes","Room_CodewordModal","Room_Space","Room_Menu","Room_Janitor","Platformer6","Room_Platformer_backup","Room_Platformer_backup_dup","PlatformerNe","Platformer2"]},"sounds":{"ungrouped":["Wood_Start","Wood_End","Success","MonkeyDies","Stomp","ChaChing","Sound_Squeaky_Open","Sound_Nope","Sound_Chug","Sound_Cat"]},"emitterTandems":{"ungrouped":["Tandem_Sparks","SmokeFX"]},"templates":{"ungrouped":["chimp","Block","Platform","cat-1","snake-spit","coin","coin_score","door","captain","tank-2","tank-1","telephone","speech-bubble","info-bar","modal","empty-tile","TextBlock","manhole","exit-button","canister","empty-button","code-blank","element-button","spit-bullet","table-ship","skip-button","bridge","sailor","asteroid","black-hole","explosion","start-button","snake-3","pipe-bit","atom_score","PlumbingContainer","PipeColorMarker","Empty","AbstractEnemy","magnifier"]}}][0],
        /**
         * Loads and executes a script by its URL
         * @param {string} url The URL of the script file, with its extension.
         * Can be relative or absolute.
         * @returns {Promise<void>}
         * @async
         */
        loadScript(url = ct.u.required('url', 'ct.res.loadScript')) {
            var script = document.createElement('script');
            script.src = url;
            const promise = new Promise((resolve, reject) => {
                script.onload = () => {
                    resolve();
                };
                script.onerror = () => {
                    reject();
                };
            });
            document.getElementsByTagName('head')[0].appendChild(script);
            return promise;
        },
        /**
         * Loads an individual image as a named ct.js texture.
         * @param {string} url The path to the source image.
         * @param {string} name The name of the resulting ct.js texture
         * as it will be used in your code.
         * @param {ITextureOptions} textureOptions Information about texture's axis
         * and collision shape.
         * @returns {Promise<Array<PIXI.Texture>>}
         */
        loadTexture(url = ct.u.required('url', 'ct.res.loadTexture'), name = ct.u.required('name', 'ct.res.loadTexture'), textureOptions = {}) {
            const loader = new PIXI.Loader();
            loader.add(url, url);
            return new Promise((resolve, reject) => {
                loader.load((loader, resources) => {
                    resolve(resources);
                });
                loader.onError.add(() => {
                    reject(new Error(`[ct.res] Could not load image ${url}`));
                });
            })
            .then(resources => {
                const tex = [resources[url].texture];
                tex.shape = tex[0].shape = textureOptions.shape || {};
                tex[0].defaultAnchor = new PIXI.Point(
                    textureOptions.anchor.x || 0,
                    textureOptions.anchor.x || 0
                );
                ct.res.textures[name] = tex;
                return tex;
            });
        },
        /**
         * Loads a skeleton made in DragonBones into the game
         * @param {string} ske Path to the _ske.json file that contains
         * the armature and animations.
         * @param {string} tex Path to the _tex.json file that describes the atlas
         * with a skeleton's textures.
         * @param {string} png Path to the _tex.png atlas that contains
         * all the textures of the skeleton.
         * @param {string} name The name of the skeleton as it will be used in ct.js game
         */
        loadDragonBonesSkeleton(ske, tex, png, name = ct.u.required('name', 'ct.res.loadDragonBonesSkeleton')) {
            const dbf = dragonBones.PixiFactory.factory;
            const loader = new PIXI.Loader();
            loader
                .add(ske, ske)
                .add(tex, tex)
                .add(png, png);
            return new Promise((resolve, reject) => {
                loader.load(() => {
                    resolve();
                });
                loader.onError.add(() => {
                    reject(new Error(`[ct.res] Could not load skeleton with _ske.json: ${ske}, _tex.json: ${tex}, _tex.png: ${png}.`));
                });
            }).then(() => {
                dbf.parseDragonBonesData(loader.resources[ske].data);
                dbf.parseTextureAtlasData(
                    loader.resources[tex].data,
                    loader.resources[png].texture
                );
                // eslint-disable-next-line id-blacklist
                ct.res.skeletons[name] = loader.resources[ske].data;
            });
        },
        /**
         * Loads a Texture Packer compatible .json file with its source image,
         * adding ct.js textures to the game.
         * @param {string} url The path to the JSON file that describes the atlas' textures.
         * @returns {Promise<Array<string>>} A promise that resolves into an array
         * of all the loaded textures.
         */
        loadAtlas(url = ct.u.required('url', 'ct.res.loadAtlas')) {
            const loader = new PIXI.Loader();
            loader.add(url, url);
            return new Promise((resolve, reject) => {
                loader.load((loader, resources) => {
                    resolve(resources);
                });
                loader.onError.add(() => {
                    reject(new Error(`[ct.res] Could not load atlas ${url}`));
                });
            })
            .then(resources => {
                const sheet = resources[url].spritesheet;
                for (const animation in sheet.animations) {
                    const tex = sheet.animations[animation];
                    const animData = sheet.data.animations;
                    for (let i = 0, l = animData[animation].length; i < l; i++) {
                        const a = animData[animation],
                              f = a[i];
                        tex[i].shape = sheet.data.frames[f].shape;
                    }
                    tex.shape = tex[0].shape || {};
                    ct.res.textures[animation] = tex;
                }
                return Object.keys(sheet.animations);
            });
        },
        /**
         * Loads a bitmap font by its XML file.
         * @param {string} url The path to the XML file that describes the bitmap fonts.
         * @param {string} name The name of the font.
         * @returns {Promise<string>} A promise that resolves into the font's name
         * (the one you've passed with `name`).
         */
        loadBitmapFont(url = ct.u.required('url', 'ct.res.loadBitmapFont'), name = ct.u.required('name', 'ct.res.loadBitmapFont')) {
            const loader = new PIXI.Loader();
            loader.add(name, url);
            return new Promise((resolve, reject) => {
                loader.load((loader, resources) => {
                    resolve(resources);
                });
                loader.onError.add(() => {
                    reject(new Error(`[ct.res] Could not load bitmap font ${url}`));
                });
            });
        },
        loadGame() {
            // !! This method is intended to be filled by ct.IDE and be executed
            // exactly once at game startup. Don't put your code here.
            const changeProgress = percents => {
                loadingScreen.setAttribute('data-progress', percents);
                loadingBar.style.width = percents + '%';
            };

            const atlases = [["./img/a0.0720cabc5d.json","./img/a1.3c768f3031.json","./img/a2.8b6d4ed935.json"]][0];
            const tiledImages = [{"starry-sky-2675322_1920":{"source":"./img/t0.e48091a3fb.png","shape":{"type":"rect","top":0,"bottom":1080,"left":0,"right":1920},"anchor":{"x":0,"y":0}},"backdrop":{"source":"./img/t1.135928b270.png","shape":{"type":"rect","top":0,"bottom":1024,"left":0,"right":1792},"anchor":{"x":0,"y":0}},"DALL·E_2023-11-26_14.05.24_-_An_updated_version_of_the_backdrop_for_a_2D_game,_depicting_the_bridge_of_a_steampunk_spaceship,_now_with_more_space_for_people._Retain_the_original_r":{"source":"./img/t2.92ab90d666.png","shape":{"type":"rect","top":0,"bottom":1024,"left":0,"right":1024},"anchor":{"x":0,"y":0}},"janitors-room":{"source":"./img/t3.f0add17e1d.png","shape":{"type":"rect","top":0,"bottom":1024,"left":0,"right":1024},"anchor":{"x":0,"y":0}},"wall-3":{"source":"./img/t4.a9a1a0d3c3.png","shape":{"type":"rect","top":0,"bottom":1024,"left":0,"right":1024},"anchor":{"x":0,"y":0}},"wall-1":{"source":"./img/t5.41178032f6.png","shape":{"type":"rect","top":0,"bottom":1024,"left":0,"right":1792},"anchor":{"x":0,"y":0}}}][0];
            const sounds = [[{"name":"Wood_Start","wav":false,"mp3":false,"ogg":"./snd/42e768ce-6c19-4c34-9f14-11e257ecff18.ogg","poolSize":5,"isMusic":false},{"name":"Wood_End","wav":false,"mp3":false,"ogg":"./snd/55aa6dac-1071-4725-bdc8-b68d98ac72bf.ogg","poolSize":5,"isMusic":false},{"name":"Success","wav":false,"mp3":false,"ogg":"./snd/2e225de2-b896-4a53-a302-4d2b7ad26dee.ogg","poolSize":5,"isMusic":false},{"name":"MonkeyDies","wav":false,"mp3":"./snd/GhgcHm6p3N8nW3.mp3","ogg":false,"poolSize":5,"isMusic":false},{"name":"Stomp","wav":false,"mp3":"./snd/FkmwDBHN1P7Gkc.mp3","ogg":false,"poolSize":5,"isMusic":false},{"name":"ChaChing","wav":false,"mp3":false,"ogg":"./snd/jR18GJwt6t2hbb.ogg","poolSize":5,"isMusic":false},{"name":"Sound_Squeaky_Open","wav":false,"mp3":false,"ogg":"./snd/9GCpfG61H52j9q.ogg","poolSize":5,"isMusic":false},{"name":"Sound_Nope","wav":false,"mp3":"./snd/hF2fkN6mKc2zR2.mp3","ogg":false,"poolSize":5,"isMusic":false},{"name":"Sound_Chug","wav":false,"mp3":"./snd/rfGLCnHbr8dmD4.mp3","ogg":false,"poolSize":5,"isMusic":false},{"name":"Sound_Cat","wav":false,"mp3":"./snd/tCT1qGCKBD5Mrq.mp3","ogg":false,"poolSize":5,"isMusic":false}]][0];
            const bitmapFonts = [{}][0];
            const dbSkeletons = [[]][0]; // DB means DragonBones

            if (sounds.length && !ct.sound) {
                throw new Error('[ct.res] No sound system found. Make sure you enable one of the `sound` catmods. If you don\'t need sounds, remove them from your ct.js project.');
            }

            const totalAssets = atlases.length;
            let assetsLoaded = 0;
            const loadingPromises = [];

            loadingPromises.push(...atlases.map(atlas =>
                ct.res.loadAtlas(atlas)
                .then(texturesNames => {
                    assetsLoaded++;
                    changeProgress(assetsLoaded / totalAssets * 100);
                    return texturesNames;
                })));

            for (const name in tiledImages) {
                loadingPromises.push(ct.res.loadTexture(
                    tiledImages[name].source,
                    name,
                    {
                        anchor: tiledImages[name].anchor,
                        shape: tiledImages[name].shape
                    }
                ));
            }
            for (const font in bitmapFonts) {
                loadingPromises.push(ct.res.loadBitmapFont(bitmapFonts[font], font));
            }
            for (const skel of dbSkeletons) {
                loadingPromises.push(ct.res.loadDragonBonesSkeleton(...skel));
            }

            for (const sound of sounds) {
                ct.sound.init(sound.name, {
                    wav: sound.wav || false,
                    mp3: sound.mp3 || false,
                    ogg: sound.ogg || false
                }, {
                    poolSize: sound.poolSize,
                    music: sound.isMusic
                });
            }

            /*@res@*/
            

            Promise.all(loadingPromises)
            .then(() => {
                ct.pointer.setupListeners();

ct.sprite(
    'snake-spit', 'snake-spitting', [0, 1, 1, 2, 2, 1, 1, 0]
);
ct.sprite(
    'snake-3', 'snake-slither', [0, 1]
);
ct.sprite(
    'snake-3', 'snake-slither-die', [2]
);
ct.touch.setupListeners();
if ([false][0]) {
    ct.touch.setupMouseListeners();
}
Object.defineProperty(ct.templates.Copy.prototype, 'cgroup', {
    set: function (value) {
        this.$cgroup = value;
    },
    get: function () {
        return this.$cgroup;
    }
});
Object.defineProperty(ct.templates.Copy.prototype, 'moveContinuous', {
    value: function (cgroup, precision) {
        if (this.gravity) {
            this.hspeed += this.gravity * ct.delta * Math.cos(this.gravityDir * Math.PI / 180);
            this.vspeed += this.gravity * ct.delta * Math.sin(this.gravityDir * Math.PI / 180);
        }
        return ct.place.moveAlong(this, this.direction, this.speed * ct.delta, cgroup, precision);
    }
});
Object.defineProperty(ct.templates.Copy.prototype, 'moveBullet', {
    value: function (cgroup, precision) {
        return this.moveContinuous(cgroup, precision);
    }
});

Object.defineProperty(ct.templates.Copy.prototype, 'moveContinuousByAxes', {
    value: function (cgroup, precision) {
        if (this.gravity) {
            this.hspeed += this.gravity * ct.delta * Math.cos(this.gravityDir * Math.PI / 180);
            this.vspeed += this.gravity * ct.delta * Math.sin(this.gravityDir * Math.PI / 180);
        }
        return ct.place.moveByAxes(
            this,
            this.hspeed * ct.delta,
            this.vspeed * ct.delta,
            cgroup,
            precision
        );
    }
});
Object.defineProperty(ct.templates.Copy.prototype, 'moveSmart', {
    value: function (cgroup, precision) {
        return this.moveContinuousByAxes(cgroup, precision);
    }
});

Object.defineProperty(ct.templates.Tilemap.prototype, 'enableCollisions', {
    value: function (cgroup) {
        ct.place.enableTilemapCollisions(this, cgroup);
    }
});

                loadingScreen.classList.add('hidden');
                ct.pixiApp.ticker.add(ct.loop);
                ct.rooms.forceSwitch(ct.rooms.starting);
            })
            .catch(console.error);
        },
        /*
         * Gets a pixi.js texture from a ct.js' texture name,
         * so that it can be used in pixi.js objects.
         * @param {string|-1} name The name of the ct.js texture, or -1 for an empty texture
         * @param {number} [frame] The frame to extract
         * @returns {PIXI.Texture|Array<PIXI.Texture>} If `frame` was specified,
         * returns a single PIXI.Texture. Otherwise, returns an array
         * with all the frames of this ct.js' texture.
         *
         * @note Formatted as a non-jsdoc comment as it requires a better ts declaration
         * than the auto-generated one
         */
        getTexture(name, frame) {
            if (frame === null) {
                frame = void 0;
            }
            if (name === -1) {
                if (frame !== void 0) {
                    return PIXI.Texture.EMPTY;
                }
                return [PIXI.Texture.EMPTY];
            }
            if (!(name in ct.res.textures)) {
                throw new Error(`Attempt to get a non-existent texture ${name}`);
            }
            const tex = ct.res.textures[name];
            if (frame !== void 0) {
                return tex[frame];
            }
            return tex;
        },
        /*
         * Returns the collision shape of the given texture.
         * @param {string|-1} name The name of the ct.js texture, or -1 for an empty collision shape
         * @returns {object}
         *
         * @note Formatted as a non-jsdoc comment as it requires a better ts declaration
         * than the auto-generated one
         */
        getTextureShape(name, template) {
            if (name === -1) {
                return template ? template.shape || {} : {};
            }
            if (!(name in ct.res.textures)) {
                throw new Error(`Attempt to get a shape of a non-existent texture ${name}`);
            }
            return ct.res.textures[name].shape;
        },
        /**
         * Creates a DragonBones skeleton, ready to be added to your copies.
         * @param {string} name The name of the skeleton asset
         * @param {string} [skin] Optional; allows you to specify the used skin
         * @returns {object} The created skeleton
         */
        makeSkeleton(name, skin) {
            const r = ct.res.skeletons[name],
                  skel = dbFactory.buildArmatureDisplay('Armature', r.name, skin);
            skel.ctName = name;
            skel.on(dragonBones.EventObject.SOUND_EVENT, function skeletonSound(event) {
                if (ct.sound.exists(event.name)) {
                    ct.sound.spawn(event.name);
                } else {
                    // eslint-disable-next-line no-console
                    console.warn(`Skeleton ${skel.ctName} tries to play a non-existing sound ${event.name} at animation ${skel.animation.lastAnimationName}`);
                }
            });
            return skel;
        }
    };

    ct.res.loadGame();
})(ct);

/**
 * A collection of content that was made inside ct.IDE.
 * @type {any}
 */
ct.content = JSON.parse(["{}"][0] || '{}');

 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }
let seed = Math.floor(Math.random()*1000);

const random = ct.random.createSeededRandomizer(seed);

function getRandomChoice(p) {
    return random() > p;
}
function getRandomMember(set) {
    let i = Math.floor(random()*set.length);
    // console.log("random",i,set.length,set);
    return set[i];
}

/** collect UI widgets from elsewhere 
 * modal (room)
*/
UI = {};

function assert(a, ...msg) {
    if (a) return;
    console.error(...msg);
}

let logged1 = [];
function log1(...msgs) {
    let msg = msgs.join(", ");
    if (contains(msg, logged1)) {
        return;
    }
    logged1.push(msg);
    console.log(msg);
}
/**
 * @param {Room} room
 * @param {string} templateName
 */
function getTemplates(room, templateName) {
    return ct.templates.list[templateName].filter(tmp => tmp.getRoom() === room);
}

function setText(pBlock, text, x, y, options) {
    // if ( ! pBlock.dwid) pBlock.dwid = "p"+Math.floor(Math.random()*1000);
    // console.log("setText", text, pBlock);
    assert( ! text || typeof(text)==="string",text);
    if (pBlock.pText) {
        if (pBlock.pText.text === text) {
            // console.log("no-op", text);
            return; // no-op
        }
        // console.log("destroy", this.dwid, "old", this.pText.text, "new text", text, this.pText);
        pBlock.pText.destroy();
        pBlock.pText = null;
    }
    if (text) {
        pBlock.pText = addText(pBlock, text, x, y, options);
        assert(pBlock.pText.text === text, text+" vs "+pBlock.pText.text);
        // console.log("set-add", this.dwid, "old", this.pText.text, "new text", text, this.pText);
    }
}

function showMessage(text) {
    console.log("showMessage", text);
    let pTextBlock = ct.templates.copy("TextBlock", 100, 500);
    pTextBlock.x = ct.room.width / 3;
    pTextBlock.width = ct.room.width / 4;
    pTextBlock.height = 80;
    setText(pTextBlock, text, 10, 10);
    // remove
    ct.timer.addUi(2000)
    .then(() => {
        pTextBlock.kill = true;
    });
}

function showTooltip(pBlock, text) {
    if (this.pTooltip) {
        if (this.pTooltip.text === text) {
            return; // no-op
        }
        hideTooltip(pBlock);
    }
    this.pTooltip = addText(pBlock, text, 0, -20, {style:"Style_Tooltip"});
}
function hideTooltip(pBlock) {
    if (this.pTooltip) {
        this.pTooltip.destroy();
        this.pTooltip = null;
    }
}

const ADDTEXT_DEFAULT_OPTIONS = {style:"Style_BodyText"};

function addText(pBlock, text, x, y, options=ADDTEXT_DEFAULT_OPTIONS) {
    assert(typeof(text)==="string", text);
    options = Object.assign({}, ADDTEXT_DEFAULT_OPTIONS, options); // merge options
    let style = ct.styles.get(options.style);
    if (options.wordWrap) {
        let www = options.wordWrapWidth;
        if ( ! www) {
            www = Math.min(pBlock.width, 450); // x offset??
        }
        style.wordWrap = true;        
        style.wordWrapWidth = www;
        console.log("wordWrapWidth", www, "options",options, "style",style, "pw",pBlock.width);
    }
    let ptext = new PIXI.Text(text, style);
    if (x) ptext.x = x;
    if (y) ptext.y = y;
    // reverse scale
    let preScaleWidth = ptext.width;
    let preScaleHeight = ptext.height;
    // console.log(text,"prescale width",ptext.width, "h",ptext.height);
    if (_optionalChain([pBlock, 'access', _ => _.scale, 'optionalAccess', _2 => _2.x])) {
        ptext.scale.x = 1 / pBlock.scale.x;
    }
    if (_optionalChain([pBlock, 'access', _3 => _3.scale, 'optionalAccess', _4 => _4.y])) {
        ptext.scale.y = 1 / pBlock.scale.y;
    }
    // console.log("BUG",text,"post-scale width",ptext.width, "scale-x", ptext.scale.x, "block-width",pBlock.width);
    if (options.center) {
        let sx = (pBlock.width - preScaleWidth) / 2;
        ptext.x = sx * ptext.scale.x;
    }
    if (options.verticalCenter) {
        let th = preScaleHeight; //ptext.height;
        let sy = (pBlock.height - th) / 2;
        // console.log("vcenter", "b-h", pBlock.height, "t-h", ptext.height, "sy", sy, "scale.y", ptext.scale.y);
        ptext.y = sy * ptext.scale.y;
    }
    pBlock.addChild(ptext);

    // const mask = new PIXI.Graphics()
    // mask.beginFill(0xff0000)
    // mask.drawCircle(ptext.x, ptext.y, 3);
    // pBlock.addChild(mask);

    assert(ptext.text === text, ptext.text, text);
    // console.log("addText", text, "x", ptext.x, "y", ptext.y, style, options, ptext);
    return ptext;
}

let msecs = 2300;


/**
 * @param {PIXI.Sprite} pSprite
 * @param {Chat} chat
 */
function doTalk(pSprite, chat) {
    // chain async calls to step through the text
    const control = {};
    let p = null;
    chat.lines.forEach(line => {
        if (p) {
            p = p.then(() => doTalk2(pSprite, line, control));
            p.control = control;
        } else {
            p = doTalk2(pSprite, line, control);
            p.control = control;
        }
    });
    // talking promise
    p = p.then(() => { 
        pSprite.talking = null; 
        console.log("null talking",pSprite.pSpeechBubble);
    });
    assert(p);
    pSprite.talking = p;
    return p;
}

async function doTalk2(pSprite, chatLine, control) {
    const text = chatLine.text;
    assert(text, chatLine);
    if (control.stop) {
        console.log("stop talking", chatLine);
        if (pSprite.pSpeechBubble) {
            pSprite.pSpeechBubble.kill = true;
        }
        pSprite.pSpeechBubble = null;
    }
    if (pSprite.pSpeechBubble) {
        // console.warn("speech bubble already?", text, "already:"+pSprite.pSpeechBubble.ptext?.text);
        return;
    }
    // let leafRoom = ct.room.children.filter(kid => {
    //     console.warn(typeof(kid),kid);
    //     return false;
    // });
    pSprite.pSpeechBubble = ct.templates.copyIntoRoom("speech-bubble", pSprite.x-20, pSprite.y - pSprite.height, ct.room);
    // pSprite.pSpeechBubble.depth = -1000;
    let scale = Math.min(Math.max(1, text.length * 2.0 / 40), 2);
    // console.log("scale",scale,text.length);
    pSprite.pSpeechBubble.scale.x = scale;
    pSprite.pSpeechBubble.scale.y = scale;
    let wordWrapWidth = pSprite.pSpeechBubble.width - 60;

    let ptext = addText(pSprite.pSpeechBubble, text, -130, -100, {wordWrap:true, wordWrapWidth});
    pSprite.pSpeechBubble.ptext = ptext;
    ptext.scale.x = 1/scale;
    ptext.scale.y = 1/scale;

    var timer = ct.timer.add(msecs, 'test');
    let promise = timer.then(() => {
        chatLine.done = true;
        console.log("done "+text, chatLine);
        if (pSprite.pSpeechBubble) {
            pSprite.pSpeechBubble.kill = true;
        }
        pSprite.pSpeechBubble = null;
    });
    await promise;
}

let lastMove = new Date().getTime() - 2000;
let moving = false;

/**
  HACK: set playerx, playery for the room you are _leaving_
 * @param {!string} roomName * no-op if already in the room AND options arent modified
 * @param {?Object} options update state for roomName
 * @param {?Object} moveOptions {transition:none|??}
 */
function moveRoom(roomName, options, moveOptions) {
    console.error("moveRoom",roomName, options,moveOptions); // for debug
    if (moving) return; // no overlaps
    // avoid flickering
    if (new Date().getTime() - lastMove < 1000) {
        console.log("moveRoom - skip - anti-flicker");
        return;
    }
    if (ct.room.name === roomName) { // paranoia
        // change options?
        let ro = roomOptions[roomName] || {};
        let mod = options && Object.entries(options).find(([k,v]) => ro[k] !== v);
        if ( ! mod) {
            console.log("moveRoom no-op", roomName);    
            return;
        }
        console.log("moveRoom",roomName, "mod",mod);
    }
    // anti-flicker
    lastMove = new Date().getTime();
    console.log("moveRoom", roomName, options, moveOptions);
    // stash player x/y on the leaving room
    let player = getPlayer();
    if (player) {
        let leaveState = {playerx: player.x, playery: player.y};
        updateRoomState(ct.room.name, leaveState);
    }
    const moveRoom2 = () => {
        moving = false;
        // // close modal?
        // if (UI.modal) {
        //     ct.rooms.remove(UI.modal);
        //     UI.modal = null;
        // }
        // switch
        ct.rooms.switch(roomName);
        // pass on options
        if (options) {
            updateRoomState(roomName, options);
        }
    };
    if (_optionalChain([moveOptions, 'optionalAccess', _5 => _5.transition]) === "none") {
        moveRoom2();
        return;
    }
    moving = true;
    ct.transition.slideOut()
        .then(moveRoom2);
}

function getPlayer() {
    let chimp = getTemplates(ct.room, "chimp")[0];
    if (chimp) return chimp;
};

function remove(array, item) {
    assert(Array.isArray(array), "Not an array"+array);
    let i = array.indexOf(item);
    if (i===-1) return array; 
    array.splice(i,1);
    return array;
}

function getCompassCorner(pSprite) {
    let ns = pSprite.y < 300? "N" : "S";
    let ew = pSprite.x < 300? "W" : "E";
    return ns+ew;
}

/**
 Object at xy or null
 */
function getGridEntry(grid, xy) {
    assert(grid && xy);
    const row = grid[xy[1]];
    if ( ! row) return null;
    return row[xy[0]];
}

function isMobile() {
	const userAgent = _optionalChain([navigator, 'optionalAccess', _6 => _6.userAgent]) || _optionalChain([navigator, 'optionalAccess', _7 => _7.vendor]) || window.opera;
	let _isMobile = userAgent.match('/mobile|Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i');
	return !!_isMobile;
};


function getBounds(pSprite) {
    if ( ! pSprite.shape) {
        console.log("no shape",pSprite);
        return pSprite.getBounds();
    }
	let h = pSprite.height;
	let w = pSprite.width;
	let {left,right,top,bottom, type, r} = pSprite.shape;
	// scale
	if (pSprite.scale.y) {
		top *= pSprite.scale.y;
		bottom *= pSprite.scale.y;
		r *= pSprite.scale.y;
	}
	if (pSprite.scale.x) {
		left *= pSprite.scale.x;
		right *= pSprite.scale.x;
	}
	let b1;
	if (type==="circle") {
		b1 = {
			x: pSprite.x - r, 
			y: pSprite.y - r,
			width: 2*r, 
			height: 2*r
		};
	} else {
		b1 = {
			x: pSprite.x - left, 
			y: pSprite.y - top,
			width: right - left, //;left - right, 
			height: top - bottom
		};
	}
	assert(b1.height >= -0.1, b1); // allow maths precision
	assert(b1.width >= -0.1, b1);
    // console.log("boundsshape",pSprite);
    return b1;
}


let pg1, pg2;
/**
 * @returns {boolean} box collision test
 */
function testBoxCollision(bounds1, bounds2)
{
    console.log("testBoxCollision",bounds1, bounds2);
    let hit = bounds1.x < bounds2.x + bounds2.width
        && bounds1.x + bounds1.width > bounds2.x
        && bounds1.y < bounds2.y + bounds2.height
        && bounds1.y + bounds1.height > bounds2.y;
    if ( ! this.pg1) {
        let pg1 = new PIXI.Graphics();
        this.pg1 = pg1;
        ct.room.addChild(this.pg1);            
        let pg2 = new PIXI.Graphics();
        this.pg2 = pg2;
        ct.room.addChild(this.pg2);            
    }
    this.pg1.clear();
    this.pg1.beginFill(hit? 0xFFCCCC : 0xCCFFCC, 0.5);
    this.pg1.drawRect(bounds1.x,bounds1.y,bounds1.width,bounds1.height);
    this.pg1.beginFill(0xCCFFCC,1);
    this.pg1.drawCircle(bounds1.x, bounds1.y, 3);

    this.pg2.clear();
    this.pg2.beginFill(hit? 0xFFFFCC : 0xCCCCFF, 0.5);
    this.pg2.drawRect(bounds2.x,bounds2.y,bounds2.width,bounds2.height);
    this.pg2.beginFill(0xCCCCFF,1);
    this.pg2.drawCircle(bounds2.x, bounds2.y, 3);

    return hit;
}
;

const periodicTable = [
    ["H", "", "", "", "", "","","","","","","","","","","","","","He"],
    ["Li","Be","","","","","","","","","","","","B","C","N","O","F","Ne"],
    ["Na","Mg","","","","","","","","","","","","Al","Si","P","S","Sl","Ar"],
    "K Ca - Sc Ti V Cr Mn Fe Co Ni Cu Zn Ga Ge As Se Br Kr".split(" "),
    "Rb Sr - Y Zr Nb Mo Tc Ru Rh Pd Ag Cd In Sn Sb Te I Xe".split(" "),
    "Cs Ba Lanthanides Lu Hf Ta W Re Os Ir Pt Au Hg Tl Pb Bi Po At Rn".split(" "),
    "Fr RA Actinides Lr Rf Db Sg Bh Hs Mt Ds Rg Cn Nh Fl Mc Lv Ts Og".split(" "),
    ];
let Lanthanides = "La Ce Pr Nd Pm Sm Eu Gd Tb Dy Ho Er Tm Yb".split(" ");
let Actinides = "Ac Th Pa U Np Pu Am Cm Bk Cf Es Fm Md No".split(" ");

function getNextElementSymbol(symbolName, dx, dy) {
    let xy = getSymbolXY(symbolName);
    let xy2 = [xy[0] + dx, xy[1] + dy];
    let row = periodicTable[xy2[1]];
    if ( ! row) return null;
    let cell = row[xy2[0]];
    if ( ! cell) return null;
    return cell;
}
/**
 * @returns [column, row]
 */
function getSymbolXY(symbolName) {
    if ( ! symbolName) return null;
    for(let r=0; r<periodicTable.length; r++) {
        for(let c=0; c<periodicTable[r].length; c++) {
            if (periodicTable[r][c] === symbolName) {
                return [c,r];
            }
        }
    }
    console.warn("no symbol", symbolName);
}
const info4symbol = {
    "H": {
        "name": "Hydrogen",
        "symbol": "H",
        "standard_conditions_state": "gas",
        "appearance": "colorless gas",
        "atomic_number": 1,
        "atomic_weight": 1.008,
        "block": "s-block",
        "group": "group 1: hydrogen and alkali metals",
        "electron_configuration": "1s^1",
        "interesting_fact": "Hydrogen is the main fuel used by the Sun and other stars. They don't burn hydrogen - they use nuclear fusion turning it into helium and releasing great energy.",
        "historical_story": "Being the lightest element, Hydrogen was used for airships, until the Hindenberg trans-atlantic airship exploded."
    },
    "He": {
        "name": "Helium",
        "symbol": "He",
        "standard_conditions_state": "gas",
        "appearance": "colorless gas",
        "atomic_number": 2,
        "atomic_weight": 4.0026,
        "block": "s-block",
        "group": "group 18: noble gases",
        "electron_configuration": "1s^2",
        "interesting_fact": "Helium is the second lightest and second most abundant element in the observable universe.",
        "historical_story": "Helium was first discovered in the solar spectrum by Jules Janssen during a solar eclipse in 1868."
    },
    "Li": {
        "name": "Lithium",
        "symbol": "Li",
        "standard_conditions_state": "solid",
        "appearance": "silvery-white metal",
        "atomic_number": 3,
        "atomic_weight": 6.94,
        "block": "s-block",
        "group": "group 1: hydrogen and alkali metals",
        "electron_configuration": "1s^2 2s^1",
        "interesting_fact": "Lithium is the lightest metal and the least dense solid element under standard conditions.",
        "historical_story": "Lithium was discovered by Johan August Arfwedson in 1817 during an analysis of petalite ore."
    },
    "Be": {
        "name": "Beryllium",
        "symbol": "Be",
        "standard_conditions_state": "solid",
        "appearance": "steel gray, strong, lightweight metal",
        "atomic_number": 4,
        "atomic_weight": 9.0122,
        "block": "s-block",
        "group": "group 2: alkaline earth metals",
        "electron_configuration": "1s^2 2s^2",
        "interesting_fact": "Beryllium is transparent to X-rays and is therefore used in windows for X-ray tubes.",
        "historical_story": "Beryllium was discovered as an oxide in beryl and emeralds by Louis-Nicolas Vauquelin in 1798. Metallic beryllium was isolated in 1828 by Friedrich Wöhler and independently by Antoine Bussy."
    },
    "B": {
        "name": "Boron",
        "symbol": "B",
        "standard_conditions_state": "solid",
        "appearance": "black-brown solid",
        "atomic_number": 5,
        "atomic_weight": 10.81,
        "block": "p-block",
        "group": "group 13",
        "electron_configuration": "1s^2 2s^2 2p^1",
        "interesting_fact": "Boron is used in borax, boric acid, and other compounds for a variety of uses including glass and ceramics manufacturing, and as a mild antiseptic.",
        "historical_story": "Boron was first identified by Joseph Louis Gay-Lussac and Louis Jacques Thénard in 1808, and it was first isolated in a pure form by Sir Humphry Davy, also in 1808."
    },
    "C": {
        "name": "Carbon",
        "symbol": "C",
        "standard_conditions_state": "solid",
        "appearance": "varies (e.g., graphite is black, diamond is transparent)",
        "atomic_number": 6,
        "atomic_weight": 12.011,
        "block": "p-block",
        "group": "group 14",
        "electron_configuration": "1s^2 2s^2 2p^2",
        "interesting_fact": "Carbon is the basis of life on Earth, and forms more compounds than any other element.",
        "historical_story": "Known since ancient times, the earliest known production of carbon was in China around 3750 BCE for ink."
    },
    "N": {
        "name": "Nitrogen",
        "symbol": "N",
        "standard_conditions_state": "gas",
        "appearance": "colorless gas",
        "atomic_number": 7,
        "atomic_weight": 14.007,
        "block": "p-block",
        "group": "group 15",
        "electron_configuration": "1s^2 2s^2 2p^3",
        "interesting_fact": "Nitrogen makes up about 78% of the Earth's atmosphere and is a constituent of all living tissues.",
        "historical_story": "Nitrogen was discovered by Scottish physician Daniel Rutherford in 1772."
    },
    "O": {
        "name": "Oxygen",
        "symbol": "O",
        "standard_conditions_state": "gas",
        "appearance": "colorless gas",
        "atomic_number": 8,
        "atomic_weight": 15.999,
        "block": "p-block",
        "group": "group 16",
        "electron_configuration": "1s^2 2s^2 2p^4",
        "interesting_fact": "Oxygen is essential for respiration in most living organisms and is used in various industrial chemical reactions.",
        "historical_story": "Oxygen was discovered independently by Carl Wilhelm Scheele in 1773 and Joseph Priestley in 1774, but Priestley is often given priority."
    },
    "F": {
        "name": "Fluorine",
        "symbol": "F",
        "standard_conditions_state": "gas",
        "appearance": "pale yellow gas",
        "atomic_number": 9,
        "atomic_weight": 18.998,
        "block": "p-block",
        "group": "group 17: halogens",
        "electron_configuration": "1s^2 2s^2 2p^5",
        "interesting_fact": "Fluorine is the most reactive of all elements, desperate to fill the missing 10th electron in it's electron shell, and capable of forming compounds with almost all other elements.",
        "historical_story": "Fluorine is difficult and dangerous to handle, and several early chemists were injured or killed studying it."
    },
    "Ne": {
        "name": "Neon",
        "symbol": "Ne",
        "standard_conditions_state": "gas",
        "appearance": "colorless, inert, noble gas",
        "atomic_number": 10,
        "atomic_weight": 20.180,
        "block": "p-block",
        "group": "group 18: noble gases",
        "electron_configuration": "1s^2 2s^2 2p^6",
        "interesting_fact": 'Only red neon signs use neon gas. Other colors of "neon" sign were discovered later and use different gases.',
        "historical_story": "Neon was discovered in 1898 by Sir William Ramsay and Morris Travers in London during their experiments with liquid air."
    },
    "Na": {
        "name": "Sodium",
        "symbol": "Na",
        "standard_conditions_state": "solid",
        "appearance": "silvery-white metallic",
        "atomic_number": 11,
        "atomic_weight": 22.990,
        "block": "s-block",
        "group": "group 1: alkali metals",
        "electron_configuration": "1s^2 2s^2 2p^6 3s^1",
        "interesting_fact": "Sodium is a highly reactive metal, commonly found in the Earth's crust in compounds such as table salt (sodium chloride).",
        "historical_story": "Sodium was first isolated by Sir Humphry Davy in 1807 through the electrolysis of caustic soda (sodium hydroxide)."
    },
    "Mg": {
        "name": "Magnesium",
        "symbol": "Mg",
        "standard_conditions_state": "solid",
        "appearance": "shiny gray solid",
        "atomic_number": 12,
        "atomic_weight": 24.305,
        "block": "s-block",
        "group": "group 2: alkaline earth metals",
        "electron_configuration": "1s^2 2s^2 2p^6 3s^2",
        "interesting_fact": "Magnesium is the eighth most abundant element in the Earth's crust and is essential for all cells and over 300 enzymatic processes.",
        "historical_story": "Magnesium was first recognized as an element by Joseph Black in 1755, and first isolated by Sir Humphry Davy in 1808."
    },
    "Al": {
        "name": "Aluminum",
        "symbol": "Al",
        "standard_conditions_state": "solid",
        "appearance": "silvery-gray metallic",
        "atomic_number": 13,
        "atomic_weight": 26.982,
        "block": "p-block",
        "group": "group 13",
        "electron_configuration": "1s^2 2s^2 2p^6 3s^2 3p^1",
        "interesting_fact": "Aluminum is the most abundant metal in the Earth's crust and is used extensively in aerospace, transportation, and packaging.",
        "historical_story": "Aluminum was first isolated by Hans Christian Ørsted in 1825, though it was only in the late 19th century that an efficient method for its extraction was developed by Charles Martin Hall and Paul Héroult."
    },
    "Si": {
        "name": "Silicon",
        "symbol": "Si",
        "standard_conditions_state": "solid",
        "appearance": "crystalline, reflective with bluish-tinged faces",
        "atomic_number": 14,
        "atomic_weight": 28.085,
        "block": "p-block",
        "group": "group 14",
        "electron_configuration": "1s^2 2s^2 2p^6 3s^2 3p^2",
        "interesting_fact": "Silicon is the second most abundant element in the Earth's crust, and is the primary component of most semiconductor devices.",
        "historical_story": "Silicon was first identified by Antoine Lavoisier in 1787 and was later given its current name by Thomas Thomson in 1831."
    },
    "P": {
        "name": "Phosphorus",
        "symbol": "P",
        "standard_conditions_state": "solid",
        "appearance": "colorless, waxy white, yellow, scarlet, red, violet, black",
        "atomic_number": 15,
        "atomic_weight": 30.974,
        "block": "p-block",
        "group": "group 15",
        "electron_configuration": "1s^2 2s^2 2p^6 3s^2 3p^3",
        "interesting_fact": "Phosphorus is essential for life, as it is a key component of DNA, RNA, and ATP, the molecule used by cells for energy transfer.",
        "historical_story": "Phosphorus was first isolated in 1669 by German alchemist Hennig Brand when he evaporated urine and heated the residue until it was red hot."
    },
    "S": {
        "name": "Sulfur",
        "symbol": "S",
        "standard_conditions_state": "solid",
        "appearance": "bright yellow crystalline solid",
        "atomic_number": 16,
        "atomic_weight": 32.06,
        "block": "p-block",
        "group": "group 16",
        "electron_configuration": "1s^2 2s^2 2p^6 3s^2 3p^4",
        "interesting_fact": "Sulfur is used in the vulcanization of rubber, in black gunpowder, and as a fungicide and insecticide in agriculture.",
        "historical_story": "Known since ancient times, sulfur's true nature as an element was recognized in 1777 by Antoine Lavoisier."
    },
    "Cl": {
        "name": "Chlorine",
        "symbol": "Cl",
        "standard_conditions_state": "gas",
        "appearance": "pale yellow-green gas",
        "atomic_number": 17,
        "atomic_weight": 35.45,
        "block": "p-block",
        "group": "group 17",
        "electron_configuration": "1s^2 2s^2 2p^6 3s^2 3p^5",
        "interesting_fact": "Chlorine is used extensively for purifying water, especially in swimming pools and drinking water, to kill harmful bacteria.",
        "historical_story": "Chlorine was first isolated in 1774 by Carl Wilhelm Scheele, who mistakenly thought it contained oxygen."
    },
    "Ar": {
        "name": "Argon",
        "symbol": "Ar",
        "standard_conditions_state": "gas",
        "appearance": "colorless, odorless, tasteless, inert gas",
        "atomic_number": 18,
        "atomic_weight": 39.948,
        "block": "p-block",
        "group": "group 18",
        "electron_configuration": "1s^2 2s^2 2p^6 3s^2 3p^6",
        "interesting_fact": "Argon makes up about 0.93% of the Earth's atmosphere and is used in fluorescent light bulbs and in welding.",
        "historical_story": "Argon was first discovered in 1894 by Lord Rayleigh and Sir William Ramsay by comparing a sample of clean air to chemically purified nitrogen."
    },
    "K": {
        "name": "Potassium",
        "symbol": "K",
        "standard_conditions_state": "solid",
        "appearance": "silvery-white metal",
        "atomic_number": 19,
        "atomic_weight": 39.098,
        "block": "s-block",
        "group": "group 1",
        "electron_configuration": "1s^2 2s^2 2p^6 3s^2 3p^6 4s^1",
        "interesting_fact": "Potassium is vital for living organisms, playing a key role in heart, muscle, and nerve function.",
        "historical_story": "Potassium was first isolated in 1807 by Sir Humphry Davy using electrolysis of caustic potash (potassium hydroxide)."
    },
    "Ca": {
        "name": "Calcium",
        "symbol": "Ca",
        "standard_conditions_state": "solid",
        "appearance": "silvery-white metal",
        "atomic_number": 20,
        "atomic_weight": 40.078,
        "block": "s-block",
        "group": "group 2: alkaline earth metals",
        "electron_configuration": "1s^2 2s^2 2p^6 3s^2 3p^6 4s^2",
        "interesting_fact": "Calcium is essential for living organisms, particularly in cell physiology and bone formation.",
        "historical_story": "Calcium was first isolated in 1808 by Sir Humphry Davy by electrolyzing a mixture of lime and mercuric oxide."
    },
    "Sc": {
        "name": "Scandium",
        "symbol": "Sc",
        "standard_conditions_state": "solid",
        "appearance": "silvery-white metallic",
        "atomic_number": 21,
        "atomic_weight": 44.956,
        "block": "d-block",
        "group": "group 3",
        "electron_configuration": "1s^2 2s^2 2p^6 3s^2 3p^6 3d^1 4s^2",
        "interesting_fact": "Scandium is used in aerospace components and sports equipment like bicycle frames and baseball bats.",
        "historical_story": "Scandium was discovered in 1879 by Lars Fredrik Nilson, who named it after Scandinavia."
    },
    "Ti": {
        "name": "Titanium",
        "symbol": "Ti",
        "standard_conditions_state": "solid",
        "appearance": "silvery grey-white metallic",
        "atomic_number": 22,
        "atomic_weight": 47.867,
        "block": "d-block",
        "group": "group 4",
        "electron_configuration": "1s^2 2s^2 2p^6 3s^2 3p^6 3d^2 4s^2",
        "interesting_fact": "Titanium has the highest strength-to-density ratio of any metallic element, and it's as strong as steel but much less dense.",
        "historical_story": "Titanium was discovered in 1791 by William Gregor and was named by Martin Heinrich Klaproth after the Titans of Greek mythology."
    },
    "V": {
        "name": "Vanadium",
        "symbol": "V",
        "standard_conditions_state": "solid",
        "appearance": "blue-silver-grey metal",
        "atomic_number": 23,
        "atomic_weight": 50.942,
        "block": "d-block",
        "group": "group 5",
        "electron_configuration": "1s^2 2s^2 2p^6 3s^2 3p^6 3d^3 4s^2",
        "interesting_fact": "Vanadium is used to make very strong and stable alloys for tools, construction elements, and jet engines.",
        "historical_story": "Vanadium was first discovered by Andrés Manuel del Río, a Spanish-born Mexican mineralogist, in 1801. It was rediscovered in 1830 by Nils Gabriel Sefström, who named it after the Norse goddess Vanadis."
    },
    "Cr": {
        "name": "Chromium",
        "symbol": "Cr",
        "standard_conditions_state": "solid",
        "appearance": "silvery, lustrous, hard, and brittle metal",
        "atomic_number": 24,
        "atomic_weight": 51.996,
        "block": "d-block",
        "group": "group 6",
        "electron_configuration": "1s^2 2s^2 2p^6 3s^2 3p^6 3d^5 4s^1",
        "interesting_fact": "Chromium is widely used in stainless steel to prevent corrosion and in chrome plating for its shiny appearance and corrosion resistance.",
        "historical_story": "Chromium was discovered in 1797 by French chemist Louis Nicolas Vauquelin, who was able to isolate the metal by heating the mineral crocoite (lead chromate)."
    },
    "Mn": {
        "name": "Manganese",
        "symbol": "Mn",
        "standard_conditions_state": "solid",
        "appearance": "silvery-grayish metal",
        "atomic_number": 25,
        "atomic_weight": 54.938,
        "block": "d-block",
        "group": "group 7",
        "electron_configuration": "1s^2 2s^2 2p^6 3s^2 3p^6 3d^5 4s^2",
        "interesting_fact": "Manganese is essential for human health, as it's a cofactor in many enzyme reactions, particularly in the processing of cholesterol, carbohydrates, and protein.",
        "historical_story": "Manganese was recognized as an element by several scientists in the 1770s, but credit often goes to Johan Gottlieb Gahn who isolated it in 1774."
    },
    "Fe": {
        "name": "Iron",
        "symbol": "Fe",
        "standard_conditions_state": "solid",
        "appearance": "lustrous, metallic, with a grayish tinge",
        "atomic_number": 26,
        "atomic_weight": 55.845,
        "block": "d-block",
        "group": "group 8",
        "electron_configuration": "1s^2 2s^2 2p^6 3s^2 3p^6 3d^6 4s^2",
        "interesting_fact": "Iron is the most commonly used metal on Earth, forming much of Earth's outer and inner core, and it's vital for blood oxygen transport in animals.",
        "historical_story": "Iron use dates back to ancient times, and it played a key role in the societal transition to the Iron Age. The first iron used by humans is likely to have been sourced from meteorites."
    },
    "Co": {
        "name": "Cobalt",
        "symbol": "Co",
        "standard_conditions_state": "solid",
        "appearance": "hard, lustrous, silver-gray metal",
        "atomic_number": 27,
        "atomic_weight": 58.933,
        "block": "d-block",
        "group": "group 9",
        "electron_configuration": "1s^2 2s^2 2p^6 3s^2 3p^6 3d^7 4s^2",
        "interesting_fact": "Cobalt is used in superalloys for aircraft engines, magnets, and in the medical field for implants and prosthetics due to its wear resistance and biocompatibility.",
        "historical_story": "Cobalt was first isolated by Swedish chemist Georg Brandt in 1735, though its compounds had been used for centuries to create deep blue glass and ceramics."
    },
    "Ni": {
        "name": "Nickel",
        "symbol": "Ni",
        "standard_conditions_state": "solid",
        "appearance": "lustrous, metallic, and silver with a gold tinge",
        "atomic_number": 28,
        "atomic_weight": 58.693,
        "block": "d-block",
        "group": "group 10",
        "electron_configuration": "1s^2 2s^2 2p^6 3s^2 3p^6 3d^8 4s^2",
        "interesting_fact": "Nickel is used in stainless steel, coins, rechargeable batteries, and as a catalyst for hydrogenation.",
        "historical_story": "Nickel was first isolated and classified as a chemical element by Axel Fredrik Cronstedt in 1751."
    },
    "Cu": {
        "name": "Copper",
        "symbol": "Cu",
        "standard_conditions_state": "solid",
        "appearance": "red-orange metallic luster",
        "atomic_number": 29,
        "atomic_weight": 63.546,
        "block": "d-block",
        "group": "group 11",
        "electron_configuration": "1s^2 2s^2 2p^6 3s^2 3p^6 3d^10 4s^1",
        "interesting_fact": "Copper is one of the few metals that can occur in nature in a directly usable metallic form (native metals).",
        "historical_story": "Copper has been used since ancient times, with evidence of copper smelting dating back to around 5000 BC."
    },
    "Zn": {
        "name": "Zinc",
        "symbol": "Zn",
        "standard_conditions_state": "solid",
        "appearance": "blue-silver, malleable metal",
        "atomic_number": 30,
        "atomic_weight": 65.38,
        "block": "d-block",
        "group": "group 12",
        "electron_configuration": "1s^2 2s^2 2p^6 3s^2 3p^6 3d^10 4s^2",
        "interesting_fact": "Zinc is the 24th most abundant element in Earth's crust and is used for galvanizing to protect iron and steel from corrosion.",
        "historical_story": "Zinc has been used since the time of the ancient Greeks and Romans, but it was first recognized as a unique element by Andreas Sigismund Marggraf in 1746."
    },
    "Ga": {
        "name": "Gallium",
        "symbol": "Ga",
        "standard_conditions_state": "solid",
        "appearance": "silver-white solid/liquid",
        "atomic_number": 31,
        "atomic_weight": 69.723,
        "block": "p-block",
        "group": "group 13",
        "electron_configuration": "1s^2 2s^2 2p^6 3s^2 3p^6 3d^10 4s^2 4p^1",
        "interesting_fact": "Gallium can melt in your hand, as it has a melting point of just above room temperature (29.76°C, 85.57°F).",
        "historical_story": "Gallium was discovered using spectroscopy by French chemist Paul Émile Lecoq de Boisbaudran in 1875."
    },
    "Ge": {
        "name": "Germanium",
        "symbol": "Ge",
        "standard_conditions_state": "solid",
        "appearance": "grayish-white, lustrous, hard and brittle",
        "atomic_number": 32,
        "atomic_weight": 72.630,
        "block": "p-block",
        "group": "group 14",
        "electron_configuration": "1s^2 2s^2 2p^6 3s^2 3p^6 3d^10 4s^2 4p^2",
        "interesting_fact": "Germanium is a semiconductor, commonly used in fiber optics, infrared optics, and in solar cell applications.",
        "historical_story": "Germanium was predicted by Dmitri Mendeleev in 1871 and discovered by Clemens Winkler in 1886."
    },
    "As": {
        "name": "Arsenic",
        "symbol": "As",
        "standard_conditions_state": "solid",
        "appearance": "metallic grey",
        "atomic_number": 33,
        "atomic_weight": 74.922,
        "block": "p-block",
        "group": "group 15",
        "electron_configuration": "1s^2 2s^2 2p^6 3s^2 3p^6 3d^10 4s^2 4p^3",
        "interesting_fact": "Arsenic has a notorious history as a poison, but it also has various applications, including in semiconductors and lead arsenate in pesticides.",
        "historical_story": "Known since ancient times, arsenic's discovery as an element is attributed to Albertus Magnus, a German philosopher and alchemist, around 1250."
    },
    "Se": {
        "name": "Selenium",
        "symbol": "Se",
        "standard_conditions_state": "solid",
        "appearance": "black, red, and gray allotropes",
        "atomic_number": 34,
        "atomic_weight": 78.971,
        "block": "p-block",
        "group": "group 16",
        "electron_configuration": "1s^2 2s^2 2p^6 3s^2 3p^6 3d^10 4s^2 4p^4",
        "interesting_fact": "Selenium is used in photocells and solar cells, as well as in glassmaking to decolorize glass and to counteract the color due to iron impurities.",
        "historical_story": "Selenium was discovered in 1817 by Jöns Jacob Berzelius and Johann Gottlieb Gahn who noted the similarity of the new element to the previously known tellurium (named for the Earth)."
    },
    "Br": {
        "name": "Bromine",
        "symbol": "Br",
        "standard_conditions_state": "liquid",
        "appearance": "red-brown liquid",
        "atomic_number": 35,
        "atomic_weight": 79.904,
        "block": "p-block",
        "group": "group 17",
        "electron_configuration": "1s^2 2s^2 2p^6 3s^2 3p^6 3d^10 4s^2 4p^5",
        "interesting_fact": "Bromine is the only nonmetallic element that is liquid at room temperature.",
        "historical_story": "Bromine was discovered independently by two chemists, Carl Jacob Löwig and Antoine Jerome Balard, in 1825 and 1826, respectively."
    },
    "Kr": {
        "name": "Krypton",
        "symbol": "Kr",
        "standard_conditions_state": "gas",
        "appearance": "colorless, odorless, tasteless noble gas",
        "atomic_number": 36,
        "atomic_weight": 83.798,
        "block": "p-block",
        "group": "group 18",
        "electron_configuration": "1s^2 2s^2 2p^6 3s^2 3p^6 3d^10 4s^2 4p^6",
        "interesting_fact": "Krypton is used in certain photographic flashes for high-speed photography and in fluorescent lamps.",
        "historical_story": "Krypton was discovered in 1898 by Sir William Ramsay and Morris Travers in residue left from evaporating nearly all components of liquid air."
    },
    "Rb": {
        "name": "Rubidium",
        "symbol": "Rb",
        "standard_conditions_state": "solid",
        "appearance": "soft, silvery-white metallic",
        "atomic_number": 37,
        "atomic_weight": 85.468,
        "block": "s-block",
        "group": "group 1",
        "electron_configuration": "1s^2 2s^2 2p^6 3s^2 3p^6 3d^10 4s^2 4p^6 5s^1",
        "interesting_fact": "Rubidium is highly reactive and ignites spontaneously in air, and reacts violently with water.",
        "historical_story": "Rubidium was discovered in 1861 by Robert Bunsen and Gustav Kirchhoff, who detected it spectroscopically in the mineral lepidolite."
    },
    "Sr": {
        "name": "Strontium",
        "symbol": "Sr",
        "standard_conditions_state": "solid",
        "appearance": "silvery-white, soft metal",
        "atomic_number": 38,
        "atomic_weight": 87.62,
        "block": "s-block",
        "group": "group 2",
        "electron_configuration": "1s^2 2s^2 2p^6 3s^2 3p^6 3d^10 4s^2 4p^6 5s^2",
        "interesting_fact": "Strontium is used in fireworks for its bright red color and is a key component in producing glass for color television cathode ray tubes.",
        "historical_story": "Strontium was discovered in 1790 by Adair Crawford and William Cruickshank and was named after Strontian, a village in Scotland."
    },
    "Y": {
        "name": "Yttrium",
        "symbol": "Y",
        "standard_conditions_state": "solid",
        "appearance": "silvery metallic",
        "atomic_number": 39,
        "atomic_weight": 88.906,
        "block": "d-block",
        "group": "group 3",
        "electron_configuration": "1s^2 2s^2 2p^6 3s^2 3p^6 3d^10 4s^2 4p^6 5s^2 4d^1",
        "interesting_fact": "Yttrium is used in the production of phosphors, which are important for making the red color in television tubes and LED screens.",
        "historical_story": "Yttrium was discovered in 1794 by Johan Gadolin, who detected it in the mineral ytterbite (later renamed gadolinite) from Ytterby, Sweden."
    },
    "Zr": {
        "name": "Zirconium",
        "symbol": "Zr",
        "standard_conditions_state": "solid",
        "appearance": "silvery white",
        "atomic_number": 40,
        "atomic_weight": 91.224,
        "block": "d-block",
        "group": "group 4",
        "electron_configuration": "[Kr] 4d^2 5s^2",
        "interesting_fact": "Zirconium is widely used in nuclear reactors due to its low neutron-capture cross-section.",
        "historical_story": "Zirconium was discovered in 1789 by Martin Heinrich Klaproth, who found it in a sample of zircon."
    },
    "Nb": {
        "name": "Niobium",
        "symbol": "Nb",
        "standard_conditions_state": "solid",
        "appearance": "gray metallic",
        "atomic_number": 41,
        "atomic_weight": 92.90637,
        "block": "d-block",
        "group": "group 5",
        "electron_configuration": "[Kr] 4d^4 5s^1",
        "interesting_fact": "Niobium is used in superconducting magnets and alloys, such as those used in medical imaging.",
        "historical_story": "Niobium was discovered in 1801 by Charles Hatchett in a mineral called columbite."
    },
    "Mo": {
        "name": "Molybdenum",
        "symbol": "Mo",
        "standard_conditions_state": "solid",
        "appearance": "gray metallic",
        "atomic_number": 42,
        "atomic_weight": 95.95,
        "block": "d-block",
        "group": "group 6",
        "electron_configuration": "[Kr] 4d^5 5s^1",
        "interesting_fact": "Molybdenum is essential for life, being found in several enzymes in organisms.",
        "historical_story": "Molybdenum was discovered in 1778 by Carl Wilhelm Scheele, who thought it was a new element, but it was later isolated by Peter Jacob Hjelm in 1781."
    },
    "Tc": {
        "name": "Technetium",
        "symbol": "Tc",
        "standard_conditions_state": "solid",
        "appearance": "silvery gray metallic",
        "atomic_number": 43,
        "atomic_weight": [98],
        "block": "d-block",
        "group": "group 7",
        "electron_configuration": "[Kr] 4d^5 5s^2",
        "interesting_fact": "Technetium was the first element to be artificially produced, and all its isotopes are radioactive.",
        "historical_story": "Technetium was artificially created in 1937 by Carlo Perrier and Emilio Segrè by bombarding molybdenum atoms with deuterons."
    },
    "Ru": {
        "name": "Ruthenium",
        "symbol": "Ru",
        "standard_conditions_state": "solid",
        "appearance": "silvery white metallic",
        "atomic_number": 44,
        "atomic_weight": 101.07,
        "block": "d-block",
        "group": "group 8",
        "electron_configuration": "[Kr] 4d^7 5s^1",
        "interesting_fact": "Ruthenium is often used in wear-resistant electrical contacts and thick-film resistors.",
        "historical_story": "Ruthenium was discovered in 1844 by Karl Ernst Claus at Kazan State University, Russia, while examining platinum ore."
    },
    "Rh": {
        "name": "Rhodium",
        "symbol": "Rh",
        "standard_conditions_state": "solid",
        "appearance": "silvery white metallic",
        "atomic_number": 45,
        "atomic_weight": 102.90550,
        "block": "d-block",
        "group": "group 9",
        "electron_configuration": "[Kr] 4d^8 5s^1",
        "interesting_fact": "Rhodium is one of the rarest and most valuable precious metals.",
        "historical_story": "Rhodium was discovered in 1803 by William Hyde Wollaston in England, shortly after his discovery of palladium."
    },
    "Pd": {
        "name": "Palladium",
        "symbol": "Pd",
        "standard_conditions_state": "solid",
        "appearance": "silvery white metallic",
        "atomic_number": 46,
        "atomic_weight": 106.42,
        "block": "d-block",
        "group": "group 10",
        "electron_configuration": "[Kr] 4d^10",
        "interesting_fact": "Palladium is a key component in fuel cells, which react hydrogen with oxygen to produce electricity, water, and heat.",
        "historical_story": "Palladium was discovered in 1803 by William Hyde Wollaston, who named it after the asteroid Pallas."
    },
    "Ag": {
        "name": "Silver",
        "symbol": "Ag",
        "standard_conditions_state": "solid",
        "appearance": "lustrous white metal",
        "atomic_number": 47,
        "atomic_weight": 107.8682,
        "block": "d-block",
        "group": "group 11",
        "electron_configuration": "[Kr] 4d^10 5s^1",
        "interesting_fact": "Silver has the highest electrical conductivity of any element and the highest thermal conductivity of any metal.",
        "historical_story": "Silver has been known since ancient times, being one of the seven metals of antiquity, and its discovery date is unknown."
    },
    "Cd": {
        "name": "Cadmium",
        "symbol": "Cd",
        "standard_conditions_state": "solid",
        "appearance": "silvery bluish-gray metallic",
        "atomic_number": 48,
        "atomic_weight": 112.414,
        "block": "d-block",
        "group": "group 12",
        "electron_configuration": "[Kr] 4d^10 5s^2",
        "interesting_fact": "Cadmium is used in nickel-cadmium rechargeable batteries and for corrosion resistant plating on steel.",
        "historical_story": "Cadmium was discovered in Germany in 1817 by Friedrich Stromeyer and Karl Samuel Leberecht Hermann, as an impurity in zinc carbonate."
    },
    "In": {
        "name": "Indium",
        "symbol": "In",
        "standard_conditions_state": "solid",
        "appearance": "silvery lustrous gray",
        "atomic_number": 49,
        "atomic_weight": 114.818,
        "block": "p-block",
        "group": "group 13",
        "electron_configuration": "[Kr] 4d^10 5s^2 5p^1",
        "interesting_fact": "Indium is used in the making of touchscreens and flat panel displays, particularly in liquid crystal displays (LCDs).",
        "historical_story": "Indium was discovered in 1863 by Ferdinand Reich and Hieronymous Theodor Richter while they were testing zinc ores for thallium."
    },
    "Sn": {
        "name": "Tin",
        "symbol": "Sn",
        "standard_conditions_state": "solid",
        "appearance": "silvery-white, often with a bluish tinge",
        "atomic_number": 50,
        "atomic_weight": 118.710,
        "block": "p-block",
        "group": "group 14",
        "electron_configuration": "[Kr] 4d^10 5s^2 5p^2",
        "interesting_fact": "Tin has been used since ancient times and was a major component in the alloy bronze, used to advance human technology in the Bronze Age.",
        "historical_story": "Tin has been known since ancient times and was used as early as 3000 BC in the Middle East and the Balkans."
    },
    "Sb": {
        "name": "Antimony",
        "symbol": "Sb",
        "standard_conditions_state": "solid",
        "appearance": "silvery, lustrous gray",
        "atomic_number": 51,
        "atomic_weight": 121.760,
        "block": "p-block",
        "group": "group 15",
        "electron_configuration": "[Kr] 4d^10 5s^2 5p^3",
        "interesting_fact": "Antimony compounds have been used for centuries for cosmetics; the ancient Egyptians used antimony sulfide as mascara.",
        "historical_story": "Antimony was recognized in compounds by the ancients and was known as a metal at the beginning of the 17th century."
    },



    // gap



    "Lv": {
        "name": "Livermorium",
        "symbol": "Lv",
        "standard_conditions_state": "unknown, probably solid",
        "appearance": "unknown, probably metallic",
        "atomic_number": 116,
        "atomic_weight": [293],
        "block": "p-block",
        "group": "group 16",
        "electron_configuration": "predicted: [Rn] 5f^14 6d^10 7s^2 7p^4",
        "interesting_fact": "Livermorium is named after the Lawrence Livermore National Laboratory in the United States.",
        "historical_story": "Livermorium was first synthesized in 2000 by a joint team of Russian and American scientists at the Joint Institute for Nuclear Research in Dubna, Russia."
    },
    "Ts": {
        "name": "Tennessine",
        "symbol": "Ts",
        "standard_conditions_state": "unknown, probably solid",
        "appearance": "unknown",
        "atomic_number": 117,
        "atomic_weight": [294],
        "block": "p-block",
        "group": "group 17",
        "electron_configuration": "predicted: [Rn] 5f^14 6d^10 7s^2 7p^5",
        "interesting_fact": "Tennessine is one of the heaviest elements and is named after the U.S. state of Tennessee.",
        "historical_story": "Tennessine was synthesized for the first time in 2010 by a collaboration involving Russian, American, and other researchers."
    },
    "Og": {
        "name": "Oganesson",
        "symbol": "Og",
        "standard_conditions_state": "unknown, predicted to be gaseous",
        "appearance": "unknown",
        "atomic_number": 118,
        "atomic_weight": [294],
        "block": "p-block",
        "group": "group 18",
        "electron_configuration": "predicted: [Rn] 5f^14 6d^10 7s^2 7p^6",
        "interesting_fact": "Oganesson is the heaviest element in the periodic table and is named after Russian physicist Yuri Oganessian.",
        "historical_story": "Oganesson was first synthesized in 2002 by a joint team of Russian and American scientists at the Joint Institute for Nuclear Research in Dubna, Russia."
    }
};

const size4shell = {};

Object.values(info4symbol).forEach(info => {
    let ec = info.electron_configuration;
    let bits = ec.split(" ");
    bits.forEach(bit => {
        let shell_n = bit.split("^");
        if (shell_n.length !== 2) return;
        let s = shell_n[0];
        let m = new Number(shell_n[1]);
        if (size4shell[s]) m = Math.max(size4shell[s], m);
        size4shell[s] = m;
    });
});;
 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }
// HACK jump to test focus
let startSymbol = "F";
let startPlatform = 6;
let startRoom = "Room_Platformer";
setTimeout(() => {
    addCanister("He");
},100);


/**
 * roomName: {symbol, etc}
 */
const roomOptions = {};
window.roomOptions = roomOptions;

/**
 * Set properties of the room state. This merges over existing properties.
 * @returns new state, with a modified flag
 */
function updateRoomState(roomName, state) {
    let rState = roomOptions[roomName];
    if ( ! rState) {
        roomOptions[roomName] = rState = {};
    }
    if ( ! state) return; // odd
    let mod = false;
    Object.entries(state).forEach(e => {
        // console.log("mod?", e[1], ro[e[0]]);    
        if (e[1] === rState[e[0]]) return; // no-op
        rState[e[0]] = e[1];
        mod = true;
    });
    rState.modified = mod;
    // Object.assign(rState, state);
    return rState;
}

function getSymbol() {
    return _optionalChain([roomOptions, 'access', _ => _["Room_Platformer"], 'optionalAccess', _2 => _2.symbol]); // HACK
}

let layout4symbol = {};
window.layout4symbol = layout4symbol;

let counters = {};

counters.health = 1;
counters.elements = 0;
counters.coins = 0;
counters.O2 = 100;
counters.canisterSlots = 3;

class Canister {
    
}

/**
 * @typedef{Canister[]}
 */
let canisters = [];
window.canisters = canisters;

let lastAdd = new Date().getTime();

function addCanister(elementSymbol) {
    // avoid filling everything at once
    if (new Date().getTime() - lastAdd < 2000) {
        return;
    }
    lastAdd = new Date().getTime();
    // find an empty
    let canister = canisters.find(c =>  ! c.symbol);
    if ( ! canister) {
        if (canisters.length >= counters.canisterSlots) {
            showMessage("All the canisters are full. Empty a canister first."); 
            return;
        }
        canister = new Canister();
        canisters.push(canister);
    }
    canister.symbol = elementSymbol;    
    console.log("addCanister", canister, canisters);
}


/**
 * e.g. "H" -> true
 */
let unlocked = {};
window.unlocked = unlocked;

/**
 * unlock and increase score
 */
function doUnlock(symbol1) {
    assert(symbol1);
    if (unlocked[symbol1]) return;
    unlocked[symbol1] = true;
    counters.elements += 1;
}

function isUnlocked(symbol1, symbol2) {
    if ( ! symbol2) return unlocked[symbol1];
    // either way round    
    return unlocked[symbol1+"-"+symbol2] || unlocked[symbol2+"-"+symbol1]
}

/**
 * Use e.g. "He-Ne": {code:"He"} for use He to open the He-Ne manhole
 */
let mission4door = {
    "He-Ne": {
        code:"He", 
        msg:"This manhole is locked with code 'HE'. It needs a canister of the 'He' element to open.",
        msg_done:"This manhole is open. You can go down to the Neon room."},
    "Ne-Ar": {
        code: "NeN"
    },
    "F-Cl": {
        code: "FO"
    }
};
Object.entries(mission4door).forEach(kv => {
    kv[1].key = kv[0];
});

function getMission(symbolA, symbolB) {
    assert(symbolA);
    assert(symbolA !== symbolB);
    let doorName = symbolA+"-"+symbolB;
    let m = mission4door[doorName];
    if (m) return m;
    doorName = symbolB+"-"+symbolA;
    m = mission4door[doorName];
    if (m) return m;
    m = {code:symbolA, msg:"Locked.", msg_done:"Open",key:doorName};
    mission4door[doorName] = m;
    return m;
}

/**
 * @returns {string}
 */
function getLabel(symbolA, symbolB) {
    let m = getMission(symbolA, symbolB);
    if ( ! m) return null;
    let unlocked = isUnlocked(symbolA, symbolB);
    let msg = unlocked? (m.msg_done || m.msg) : m.msg;
    return msg || JSON.stringify(m);
}

let lastLifeLost = new Date().getTime();

function doLoseLife() {
    if (new Date().getTime() - lastLifeLost < 2000) {
        return; // avoid draining life instantly
    }
    lastLifeLost = new Date().getTime();
    console.log("doLoseLife");
    if (counters.health > 0) counters.health--;
    if (counters.health > 0) return;
    console.log("doLoseLife - die");
    let chimp = getTemplates(ct.room, "chimp")[0];
    if (chimp.dying) return;
    chimp.dying = true;
    let target = Math.PI / 2;
    // let targetX = this.x + 100;
    ct.tween.add({
        obj: chimp,
        fields: {
            rotation: target,
        },
        duration: 1000
    }).then(() => {
        chimp.kill = true;
    });
    ct.sound.spawn("MonkeyDies",{volume:0.1});
}

// addCanister("H2O");
// addCanister("H2O");
// unlocked.He = true;
;

// let sqWidth = 40;

let colour = {
    red: 0xff0000,
    blue: 0x0000ff,
    green: 0x00ff00,
    yellow: 0xffff00,
    brown: 0xcc00ff,
    orange: 0x00ffff,
    pink: 0xff00ff,
    grey: 0xcccccc,
    aqua: 0x00ffaa,
    reddy: 0xffaa33,
}
;


class Pipe {constructor() { Pipe.prototype.__init.call(this); }
	
	__init() {this.xys = []}
}
class PipeBit {
    /** start or end */
    
    
    /**
     * two of NESW
     */
    
    /** @type {Copy} */
    
}

function eq(a, b) {
    return a==b || JSON.stringify(a) == JSON.stringify(b);
}
/**
 * Like sincludes() but using `eq()`
 */
function contains(x, array) {
    if ( ! array) return false;
    for(let i=0; i<array.length; i++) {
        if (eq(array[i],x)) return true;
    }
    return false;
}

/**
 * @param {int[]} a0 [x,y]
 * @param {int[]} b0 [x,y]
 * @returns {boolean} true if a0 touches b0 (not diagonal)
 */
function isTouching(a0, b0) {
    return (Math.abs(a0[0] - b0[0])==1 && a0[1]==b0[1])
            || (Math.abs(a0[1] - b0[1])==1 && a0[0]==b0[0]);
}
;

class ChatLine {
    /** @types {String} */
    

    /** @types {boolean} What has been said to the player? */
    

    constructor(text) {
        this.text = text;
    }
}
class Chat {
    /** @types {String[]}  */
    

    constructor(text) {
        let texts = text.split(/\n[ \t]*\n[ \t]*/);
        this.lines = texts.map(line => new ChatLine(line));
    }
}

let chat4symbol = {
    He: 
new Chat(`You should probably find and fix the Oxygen room so we can all keep breathing.

I would help you, but I'm a cat, and it's not in my nature.

Opening the manhole there will help, if you can figure out how.`),

Ne: 
new Chat(`I'm not supposed to be helpful, but I actualy quite like you.

Oxygen is 2 rooms to the left of neon, where we are now.`),

F:new Chat(`Beware of flourine! 

Just one electron less than neon, but what a difference that makes.`),

O:new Chat(``),

};

let platform4symbol = {
    Ne: 6
};;
