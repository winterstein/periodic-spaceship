
import { info4symbol } from "./ptable";

// HACK global export for ct.js wiring
window.Room_Puzzle_Pipes = {

};
let This = window.Room_Puzzle_Pipes;

Room_Puzzle_Pipes.onRoomStart = () => {
	This.puzzleSize = 7;
	This.puzzleType = "flow";
	This.elementSymbol = "H"; // TODO others

	ct.rooms.append('Room_UI');

	// Text
	let textBlock = getTemplates(This, "TextBlock")[0];
	let info = info4symbol[This.elementSymbol];
	addText(textBlock, 0, 0, JSON.stringify(info));


	This.pipes = makePipes({ w: This.puzzleSize });

	console.log(This.pipes);

	// render
	This.grid = [];
	for (let i = 0; i < This.puzzleSize; i++) This.grid.push([]);
	This.pipes.forEach(pipe => {
		let start = pipe.xys[0];
		let end = pipe.xys[pipe.xys.length - 1];
		// pipe.xys.forEach(xy => {
		[start, end].forEach(xy => {
			let pb = new PipeBit();
			pb.col = pipe.col;
			pb.isEnd = true;
			This.grid[xy[0]][xy[1]] = pb;
		});
	});
	console.log("grid", This.grid);

	let modal = ct.templates.list['modal'].find(m => m.getRoom() === This);

	// let sqWidth = 40;
	// maths isnt working - prob wrong width height getters
	// Math.floor(Math.min(
	//     modal.height/(puzzleSize+3), // +1 to include the bottom tile, then +2 for padding
	//     modal.width/(puzzleSize+3),
	//     ));
	let offsetX = 240; // Math.floor((modal.getBounds().width - (puzzleSize*sqWidth))/2);
	let offsetY = 80; //Math.floor((modal.getBounds().height - (puzzleSize*sqWidth))/2);

	// grid to tile-grid
	for (let i = 0; i < This.grid.length; i++) {
		for (let j = 0; j < This.grid.length; j++) { // NB: assume square
			// console.log("grid i j", i, j, This.grid[i][j], This.grid[i][j]?.col);
			let copy = ct.templates.copy("empty-tile");
			copy.pipeColor = _optionalChain([This, 'access', _ => _.grid, 'access', _2 => _2[i], 'access', _3 => _3[j], 'optionalAccess', _4 => _4.col]);
			let obj = new PIXI.Graphics();
			copy.gridx = j;
			copy.gridy = i;
			copy.x = offsetX + sqWidth * j;
			copy.y = offsetY + sqWidth * i;
			if (copy.pipeColor) {
				copy.isEnd = true;
				obj.beginFill(colour[copy.pipeColor]);
				obj.drawRect(1, 1, sqWidth - 2, sqWidth - 2);
			} else {
				obj.beginFill(0); // not clickabale otherwise??
				obj.drawRect(1, 1, sqWidth - 2, sqWidth - 2);

				// obj.beginFill(colour["grey"]);
				obj.lineStyle(1, colour["grey"]);
				obj.moveTo(1, 1);
				obj.lineTo(1, sqWidth - 2);
				obj.lineTo(sqWidth - 2, sqWidth - 2);
				obj.lineTo(sqWidth - 2, 1);
				obj.lineTo(1, 1);
			}
			copy.addChild(obj);
			// copy.pipeGraphics = obj;
			modal.addChild(copy);
		}
	}

	This.pipeColourMarker = new PIXI.Graphics();
	This.pipeColourMarker.beginFill(colour[0]);
	let r = sqWidth / 2;
	This.pipeColourMarker.drawCircle(r, r, r);

	This.pipeColourMarker.x = offsetX + (sqWidth + 2) * This.puzzleSize;
	This.pipeColourMarker.y = offsetY;
	modal.addChild(This.pipeColourMarker);

};



// TODO seeds

/**
 * @returns {Pipe[]}
 */
function makePipes({ w = 8 }) {
	let pipes = [];
	for (let i = 0; i < w; i++) {
		let pipe = new Pipe();
		pipes.push(pipe);
		pipe.col = Object.keys(colour)[i];
		for (let j = 0; j < w; j++) {
			pipe.xys.push([i, j]);
		}
	}

	// mutate - move a pair of pipe ends
	for (let i = 0; i < 1000000; i++) {
		let pipe1 = getRandomMember(pipes);
		let pipe2 = getRandomMember(pipes);
		if (pipe1 == pipe2) continue;
		let ai = getRandomChoice(0.5) ? 0 : pipe1.xys.length - 1;
		let bi = getRandomChoice(0.5) ? 0 : pipe2.xys.length - 1;
		let a0 = pipe1.xys[ai];
		let b0 = pipe2.xys[bi];
		if (isTouching(a0, b0)) {
			// move one end
			if (getRandomChoice(0.5)) {
				movePipe(pipe1, ai, pipe2, bi);
			} else {
				movePipe(pipe2, bi, pipe1, ai);
			}
		}
	}
	return pipes;
} // ./ makePipes

function movePipe(pipe1, ai, pipe2, bi) {
	if (pipe1.xys.length < 4) return;
	let s = pipe1.xys[ai];
	// avoid looping back:
	if (isLoopBack(s, pipe2, pipe2.xys[bi])) {
		return;
	} else {
		pipe1.xys = pipe1.xys.filter(xy => xy !== s);
		if (bi == 0) pipe2.xys.splice(bi, 0, s);
		else pipe2.xys.push(s);
	}
}

function isLoopBack(s, pipe2, b0) {
	for (let i = 0; i < pipe2.xys.length; i++) {
		let b = pipe2.xys[i];
		if (b === b0) continue;
		if (isTouching(s, b)) return true;
	}
	return false;
}
