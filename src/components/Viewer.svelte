<script>
	import { tick } from 'svelte';
	import { panZoom, getPanzoom } from '$lib/actions/pan-zoom';
	import { tooltip } from '$lib/actions/tooltip';
	import { getCenter, getVertices } from '@/lib/feature-utils';

	/**
	 * @typedef {Object} ViewerProps
	 * @property {ImageObject} imageObject Image object to view
	 * @property {string | function} [search] String to search for or callback function to use for marking features
	 * @property {function} [setMarkedCount] Callback which will be called when the number of matched features is updated
	 * @property {number} [featureId]
	 */

	/** @type {ViewerProps} */
	let { imageObject, search, setMarkedCount, featureId } = $props();

	/** @type {function} */
	let markFeature = $state(() => false);
	let panzoomOuter = $state();
	let panzoomContainer = $state();

	let markedCount = 0;

	$effect(() => {
		markedCount = 0;
		if (!search) {
			markFeature = () => false;
			if (setMarkedCount) setMarkedCount(0);
			return;
		}
		markFeature = (/** @type {FeatureProperty} */ featureProps) => {
			const mark =
				typeof search === 'function'
					? search(featureProps)
					: featureProps.text.toLowerCase().includes(search.toLowerCase());
			if (mark) markedCount++;
			return mark;
		};
		if (setMarkedCount) tick().then(() => /** @type {function} */ (setMarkedCount)(markedCount));
	});

	/** @param {Feature} feature */
	const panToFeature = (feature) => {
		const dim = panzoomOuter.getBoundingClientRect();
		const r = dim.height / imageObject.height;
		const { x, y } = getCenter(feature);
		const rx = x - imageObject.width / 2;
		const ry = y - imageObject.height / 2;
		getPanzoom(panzoomContainer)?.pan(-rx * r, -ry * r, { relative: false, animate: true });
	};

	export const panToNextMarked = () => {
		if (!imageObject.features) return;
		const marks = [...panzoomContainer.querySelectorAll('.marked')];
		let active = panzoomContainer.querySelector('.active');
		let nextMark;
		if (active) {
			active.classList.remove('active');
			const focusedIdx = marks.indexOf(active);
			const nextIdx = (focusedIdx + 1) % marks.length;
			nextMark = marks[nextIdx];
		} else {
			nextMark = marks[0];
		}
		if (!nextMark) return;
		nextMark.classList.add('active');
		const feature = imageObject.features[nextMark.dataset.idx];
		getPanzoom(panzoomContainer)?.zoom(5);
		setTimeout(() => {
			panToFeature(feature);
			if (nextMark._tippy) setTimeout(() => nextMark._tippy.show(), 300);
		});
	};

	$effect(() => {
		if (!featureId || !imageObject.features) return;
		const focusedFeature = imageObject.features[featureId];
		if (!focusedFeature) return;
		getPanzoom(panzoomContainer)?.zoom(5); // TODO: the zoom level should take account of the feature size somehow
		setTimeout(() => panToFeature(focusedFeature));
	});
</script>

<div class="panzoom-outer" bind:this={panzoomOuter}>
	<div
		class="panzoom-container"
		use:panZoom
		bind:this={panzoomContainer}
		style="--aspect-ratio: {imageObject.width} / {imageObject.height}"
	>
		<img src={URL.createObjectURL(imageObject.imageBlob)} alt={imageObject.name} />
		<svg
			xmlns="http://www.w3.org/2000/svg"
			viewBox={`0 0 ${imageObject.width} ${imageObject.height}`}
		>
			{#each imageObject.features || [] as feature, i}
				{@const vertices = getVertices(feature)}
				<path
					d={`M ${vertices[0][0]} ${vertices[0][1]} ${vertices
						.slice(1)
						.map(([x, y]) => `L ${x} ${y}`)
						.join(' ')} Z`}
					data-idx={i}
					data-text={feature.properties.text}
					data-score={feature.properties.score.toFixed(4)}
					data-tippy-content={`text: ${feature.properties.text}<br>score: ${feature.properties.score}`}
					use:tooltip={{ allowHTML: true }}
					class:marked={markFeature(feature.properties)}
					class:focused={featureId == i}
					role="button"
					tabindex="0"
					onclick={() => panToFeature(feature)}
					onkeydown={(/** @type {KeyboardEvent} */ { key }) =>
						(key === 'Enter' || key === ' ') && panToFeature(feature)}
				/>
			{/each}
		</svg>
	</div>
</div>

<style>
	.panzoom-outer {
		height: 100%;
		width: 100%;
	}

	.panzoom-container {
		display: flex;
		justify-content: center;
		height: 100%;
		overflow: hidden;
		position: relative;
		width: 100%;

		img {
			max-height: 100%;
			max-width: 100%;
		}

		svg {
			left: 50%;
			height: 100%;
			width: 100%;
			position: absolute;
			top: 50%;
			translate: -50% -50%;
		}

		svg :global(path) {
			fill: transparent;
			stroke: #44f8;
			stroke-width: 6px;
		}

		svg :global(path.marked),
		svg :global(path.focused) {
			opacity: 0.6;
			stroke: lime;
		}

		svg :global(path.active),
		svg :global(path:hover) {
			opacity: 1;
			stroke: hotpink;
		}
	}
</style>
