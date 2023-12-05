
import ct from './ct';

/**
 * @param {Room} room
 * @param {string} templateName
 */
export function getTemplates(room, templateName) {
    return ct.templates.list[templateName].filter(tmp => tmp.getRoom() === room);
}

const ADDTEXT_DEFAULT_OPTIONS = {style:"Style_BodyText",anchor:{}};

export function addText(pBlock, text, x, y, options=ADDTEXT_DEFAULT_OPTIONS) {
    let style = ct.styles.get(options.style);
    if (style.wordWrap) {
        let www = options.wordWrapWidth;
        if ( ! www) {
            www = Math.min(pBlock.width, 450); // x offset??
        }
        style.wordWrapWidth = www;
    }
    let ptext = new PIXI.Text(text, style);
    if (x) ptext.x = x;
    if (y) ptext.y = y;
    if (options.anchor?.y) ptext.anchor.y = 0.5;
    pBlock.addChild(ptext);
    console.log("addText", text, x, y, style, options);
    return ptext;
};

let msecs = 2500;

export function doTalk(pSprite, text) {
    if (pSprite.pSpeechBubble) {
        return;
    }
    pSprite.pSpeechBubble = ct.templates.copy("speech-bubble", pSprite.x-20, pSprite.y - pSprite.height);
	// hack: larger bubble
    pSprite.pSpeechBubble.scale.x = 2;
	pSprite.pSpeechBubble.scale.y = 2;

    let ptext = addText(pSprite.pSpeechBubble, text, -130, -100);
	// hack: scale-back
	ptext.scale.x = 0.5;
	ptext.scale.y = 0.5;
    console.log("talk!",ptext.width,ptext.height);
    // {wordWrapWidth: 440}
    // let ptext2 = addText(this, "Meow2 "+ct.room.element?.name, -100, 100);

    var timer = ct.timer.add(msecs, 'test');
    let promise = timer.then(() => {
        console.log("done");
        if (pSprite.pSpeechBubble) {
            pSprite.pSpeechBubble.kill = true;
        }
        pSprite.pSpeechBubble = null;
    });
    return promise;
}


export function eq(a, b) {
    return a==b || JSON.stringify(a) == JSON.stringify(b);
}
/**
 * Like sincludes() but using `eq()`
 */
export function contains(x, array) {
    if ( ! array) return false;
    for(let i=0; i<array.length; i++) {
        if (eq(array[i],x)) return true;
    }
    return false;
}

export function deepCopy(a) {
	if ( ! a) return a;
	return JSON.parse(JSON.stringify(a));
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
