import FluidSimulation from "./sim.js";
const { createFFmpeg, fetchFile } = window.FFmpegWASM;
console.log(createFFmpeg);

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

let sim, w = 0, h = 0;
let wx = 0, wy = 0;

const totalFrames = 120;
const fps = 30;
const frameImages = [];

function update () {
	sim.update(w, h, window.screenX - wx, window.screenY - wy);
	wx = window.screenX;
	wy = window.screenY;
}

function draw () {
	ctx.clearRect(0, 0, w, h);
	ctx.save();
	ctx.translate(w * 0.5, h * 0.5);
	sim.draw(ctx, w, h);
	ctx.restore();
}

function resize () {
	w = window.innerWidth;
	h = window.innerHeight;
	canvas.width = w;
	canvas.height = h;
	draw();
}

async function captureFrames () {
	for (let i = 0; i < totalFrames; i++) {
		update();
		draw();
		const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
		frameImages.push(blob);
		await new Promise(r => setTimeout(r, 1000 / fps)); // wait between frames
	}
	await encodeVideo();
}

async function encodeVideo () {
	await ffmpeg.load();

	// Write all frames into ffmpeg FS
	for (let i = 0; i < frameImages.length; i++) {
		const name = `frame${String(i).padStart(3, '0')}.png`;
		await ffmpeg.FS('writeFile', name, await fetchFile(frameImages[i]));
	}

	// Encode to MKV using ffmpeg
	await ffmpeg.run(
		'-framerate', `${fps}`,
		'-i', 'frame%03d.png',
		'-c:v', 'libx264',
		'-preset', 'veryfast',
		'-pix_fmt', 'yuv420p',
		'output.mkv'
	);

	const data = ffmpeg.FS('readFile', 'output.mkv');
	const blob = new Blob([data.buffer], { type: 'video/x-matroska' });
	const url = URL.createObjectURL(blob);

	const a = document.createElement('a');
	a.href = url;
	a.download = 'fluid_sim.mkv';
	a.click();
}

function init () {
	sim = new FluidSimulation({
		density: 15000,
		particleSize: 1
	});
	wx = window.screenX;
	wy = window.screenY;

	resize();
	captureFrames();
}

window.addEventListener('load', init);
