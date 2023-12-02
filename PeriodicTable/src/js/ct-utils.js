
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
    // pSprite.pSpeechBubble.scale = 2;

    let ptext = addText(pSprite.pSpeechBubble, text, -130, -100);
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


