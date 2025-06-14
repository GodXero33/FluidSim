import FluidSimulation from "./sim.js";

const ctx = canvas.getContext('2d');
let sim = null;
let w = 0, h = 0;
let wx = 0, wy = 0;
let animationFrame = null;

function draw () {
	ctx.clearRect(0, 0, w, h);
	ctx.save();
	ctx.translate(w * 0.5, h * 0.5);

	sim.draw(ctx, w, h);

	ctx.restore();
}

function update () {
	sim.update(w, h, window.screenX - wx, window.screenY - wy);

	wx = window.screenX;
	wy = window.screenY;
}

function resize () {
	w = window.innerWidth;
	h = window.innerHeight;

	canvas.width = w;
	canvas.height = h;

	draw();
}

function animate () {
	update();
	draw();

	animationFrame = requestAnimationFrame(animate);
}

function play () {
	if (!animationFrame) animate();
}

function pause () {
	cancelAnimationFrame(animationFrame);

	animationFrame = null;
}

function init () {
	window.addEventListener('resize', resize);
	window.addEventListener('keydown', event => {
		if (event.code === 'Space') animationFrame == null ? play() : pause()
	});

	sim = new FluidSimulation({
		density: 100,
		particleSize: 20
	});
	wx = window.screenX;
	wy = window.screenY;

	resize();
	play();
	console.log(sim);
}

window.addEventListener('load', init);
