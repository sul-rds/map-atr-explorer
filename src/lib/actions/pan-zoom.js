import Panzoom from '@panzoom/panzoom';

/** @type {WeakMap<HTMLElement, import('@panzoom/panzoom').PanzoomObject>} */
const panzoomInstances = new WeakMap();

/**
 * Initializes the Panzoom functionality on the given node.
 * @param {HTMLElement} node - The HTML element to initialize
 * @return {void}
 */
export function panZoom(node) {
	const panzoom = Panzoom(node, {
		contain: 'outside',
		canvas: true,
		panOnlyWhenZoomed: false,
		startScale: 1,
		minScale: 1,
		maxScale: 20
	});
	panzoomInstances.set(node, panzoom);
	const parent = node.parentElement;
	if (parent === null) {
		throw new Error('PanZoom node has no parent element');
	}
	parent.addEventListener('wheel', panzoom.zoomWithWheel);
}

/**
 * Gets the Panzoom instance for a given node.
 * @param {HTMLElement} node - The HTML element
 * @return {import('@panzoom/panzoom').PanzoomObject | undefined} The Panzoom instance
 */
export function getPanzoom(node) {
	return panzoomInstances.get(node);
}
