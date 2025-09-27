import '@testing-library/jest-dom';

// Minimal canvas 2D context polyfill for jsdom environment used in tests
if (typeof HTMLCanvasElement !== 'undefined') {
	// eslint-disable-next-line @typescript-eslint/ban-ts-comment
	// @ts-ignore
	HTMLCanvasElement.prototype.getContext = function () {
		return {
			getImageData: () => ({ data: [] }),
			putImageData: () => {},
			createImageData: () => [],
			setTransform: () => {},
			drawImage: () => {},
			save: () => {},
			restore: () => {},
			fillRect: () => {},
			clearRect: () => {},
			getContextAttributes: () => ({}),
			measureText: () => ({ width: 0 }),
			fillText: () => {},
			strokeText: () => {},
			beginPath: () => {},
			moveTo: () => {},
			lineTo: () => {},
			closePath: () => {},
			stroke: () => {},
			fill: () => {},
			arc: () => {},
			translate: () => {},
			scale: () => {},
			rotate: () => {},
			drawFocusIfNeeded: () => {}
		};
	};
}