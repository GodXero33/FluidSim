class Particle {
	constructor (x, y) {
		this.x = x;
		this.y = y;
		this.vx = 0;
		this.vy = 0;
	}
}

export default class FluidSimulation {
	constructor ({
		density = 100,
		gravity = { x: 0, y: 0.2 },
		particleSize = 10,
		dampingFact = 0.001
	} = {}) {
		this.gravity = gravity;
		this.particleSize = particleSize;
		this.dampingFact = dampingFact;

		this.drawGravity = false;
		this.shakeEnabled = false;
		this.particles = [];

		const particleGap = 2;
		const particlePerRow = Math.floor(Math.sqrt(density));
		const particlePerCol = (density - 1) / particlePerRow + 1;
		const spacing = particleSize + particleGap;

		for (let a = 0; a < density; a++) {
			const x = (a % particlePerRow - particlePerRow * 0.5 + 0.5) * spacing;
			const y = (a / particlePerRow - particlePerCol * 0.5 + 0.5) * spacing;

			this.particles.push(new Particle(x, y));
		}

		if ('DeviceOrientationEvent' in window && /Mobi|Android/i.test(navigator.userAgent)) {
			this.shakeForceX = 0;
			this.shakeForceY = 0;
			this.lastAcc = { x: 0, y: 0, z: 0 };
			this.shakeDecay = 0.9;
			this.shakeThreshold = 12;
			this.shakeCooldown = 10;
			this.lastShakeTime = 0;
			this.shakeEnabled = false;

			window.addEventListener('deviceorientation', event => {
				const beta = event.beta || 0;
				const gamma = event.gamma || 0;

				const isLandscape = window.matchMedia("(orientation: landscape)").matches;

				if (isLandscape) {
					this.gravity.x = -beta / 90 * 0.8;
					this.gravity.y = gamma / 90 * 0.8;
				} else {
					this.gravity.x = gamma / 90 * 0.8;
					this.gravity.y = beta / 90 * 0.8;
				}
			});

			window.addEventListener('devicemotion', event => {
				if (!this.shakeEnabled) return;

				const acc = event.accelerationIncludingGravity;

				if (!acc) return;

				const now = Date.now();

				const dx = acc.x - this.lastAcc.x;
				const dy = acc.y - this.lastAcc.y;
				const dz = acc.z - this.lastAcc.z;

				this.lastAcc = { x: acc.x, y: acc.y, z: acc.z };
				const deltaMag = Math.sqrt(dx * dx + dy * dy + dz * dz);

				if (deltaMag > this.shakeThreshold && (now - this.lastShakeTime) > this.shakeCooldown) {
					this.lastShakeTime = now;
					this.shakeForceX = dx * 0.1;
					this.shakeForceY = dy * 0.1;
				}
			});
		}
	}

	draw (ctx) {
		ctx.strokeStyle = '#ffffff';
		ctx.lineCap = 'round';
		ctx.lineWidth = this.particleSize;

		ctx.beginPath();

		this.particles.forEach(particle => {
			ctx.moveTo(particle.x, particle.y);
			ctx.lineTo(particle.x, particle.y);
		});

		ctx.stroke();

		if (this.drawGravity) {
			ctx.font = '20px Arial';
			ctx.fillStyle = '#0f0';

			ctx.fillText(`gx: ${this.gravity.x.toFixed(2)} gy: ${this.gravity.y.toFixed(2)}`, 20, 20);
		}
	}

	update(w, h, dx = 0, dy = 0) {
		const subSteps = 20;
		const gx = this.gravity.x;
		const gy = this.gravity.y;
		const hw = w * 0.5 - this.particleSize;
		const hh = h * 0.5 - this.particleSize;
		const dampingFact = 1 - this.dampingFact;
		const inertiaFactor = 0.05;
		const minDist = this.particleSize;
		const influenceRadius = this.particleSize * 1.5;
		const influenceRadiusSq = influenceRadius * influenceRadius;

		for (let a = 0; a < subSteps; a++) {
			this.particles.forEach(p => {
				p.vx += (gx - dx * inertiaFactor) / subSteps;
				p.vy += (gy - dy * inertiaFactor) / subSteps;

				if (this.shakeEnabled) {
					p.vx += this.shakeForceX / subSteps;
					p.vy += this.shakeForceY / subSteps;
				}

				p.x += p.vx / subSteps;
				p.y += p.vy / subSteps;
			});


			this.particles.forEach(p => {
				if (Math.abs(p.x) > hw) {
					p.x = hw * Math.sign(p.x);
					p.vx *= -1;
				}

				if (Math.abs(p.y) > hh) {
					p.y = hh * Math.sign(p.y);
					p.vy *= -1;
				}
			});

			this.particles.forEach(p => {
				p.vx *= dampingFact ** (1 / subSteps);
				p.vy *= dampingFact ** (1 / subSteps);
			});

			const densities = new Array(this.particles.length).fill(0);
			this.particles.forEach((p1, i) => {
				this.particles.forEach((p2, j) => {
					if (i === j) return;

					const dx = p2.x - p1.x;
					const dy = p2.y - p1.y;
					const distSq = dx * dx + dy * dy;

					if (distSq < influenceRadiusSq) {
						const weight = 1 - Math.sqrt(distSq) / influenceRadius;
						densities[i] += weight;
					}
				});
			});

			this.particles.forEach((p1, i) => {
				this.particles.forEach((p2, j) => {
					if (i === j) return;

					const dx = p2.x - p1.x;
					const dy = p2.y - p1.y;
					const distSq = dx * dx + dy * dy;

					if (distSq < influenceRadiusSq && distSq > 0.0001) {
						const dist = Math.sqrt(distSq);
						const nx = dx / dist;
						const ny = dy / dist;

						if (dist < minDist) {
							const overlap = 0.5 * (minDist - dist);

							p1.x -= nx * overlap;
							p1.y -= ny * overlap;
							p2.x += nx * overlap;
							p2.y += ny * overlap;

							const bounce = 0.5;
							const dvx = p2.vx - p1.vx;
							const dvy = p2.vy - p1.vy;
							const dot = dvx * nx + dvy * ny;

							if (dot < 0) {
								const impulse = dot * bounce;

								p1.vx += nx * impulse;
								p1.vy += ny * impulse;
								p2.vx -= nx * impulse;
								p2.vy -= ny * impulse;
							}
						} else {
							const k = 0.05;
							const avgDensity = (densities[i] + densities[j]) * 0.5;
							const pressure = k * (avgDensity - 1);

							p1.vx -= nx * pressure;
							p1.vy -= ny * pressure;
							p2.vx += nx * pressure;
							p2.vy += ny * pressure;

							p1.vx -= nx * pressure;
							p1.vy -= ny * pressure;
						}
					}
				});
			});
		}

		if (this.shakeEnabled) {
			this.shakeForceX *= this.shakeDecay;
			this.shakeForceY *= this.shakeDecay;
		}
	}
}
