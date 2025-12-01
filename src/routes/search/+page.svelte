<script>
	import { base } from '$app/paths';
	import { page } from '$app/stores';
	import { InlineLoading, Search } from 'carbon-components-svelte';
	import { db } from '$lib/db';
	import { debounce } from '$lib/debounce';
	import { getFeatureClip } from '$lib/feature-utils';
	import FeatureClip from '@components/FeatureClip.svelte';

	/** @type {FeatureMatch[]} */
	let matches = $state([]);
	let searching = $state(false);
	let search = $state();
	let totalImages = $state(0);
	let totalFeatures = $state(0);
	let totalMatches = $state(0);
	let matchedImages = $state(new Set());

	const maxResults = 1000;

	$effect(() => {
		db.table('images').each((imageObject) => {
			if (imageObject.features) totalFeatures += imageObject.features.length;
			totalImages++;
		});
	});

	$effect(() => {
		const searchStr = $page.url.searchParams.get('s');
		if (searchStr) {
			search = searchStr;
			doSearch(search);
		}
	});

	/** @param {ImageObject} imageObject */
	async function searchImage(imageObject) {
		let imageBitmap;
		if (imageObject.features) {
			for (const [featureId, feature] of imageObject.features.entries()) {
				if (feature.properties.text.toLowerCase().includes(search.toLowerCase())) {
					matchedImages.add(/** @type {number} */ (imageObject.id));
					totalMatches++;
					if (matches.length >= maxResults) continue;
					if (!imageBitmap) {
						imageBitmap = await createImageBitmap(imageObject.imageBlob);
					}
					const { croppedBitmap, width, height } = getFeatureClip(imageBitmap, feature);
					matches.push({
						key: `${/** @type {number} */ (imageObject.id)}-${featureId}`,
						imageId: /** @type {number} */ (imageObject.id),
						imageName: imageObject.name,
						featureId,
						text: feature.properties.text,
						width,
						height,
						croppedBitmap
					});
				}
			}
		}
		if (imageBitmap) imageBitmap.close();
	}

	const doSearch = debounce(async (/** @type {string | undefined} */ search) => {
		totalMatches = 0;
		matchedImages = new Set();
		matches = [];
		searching = false;
		if (!search) return;
		searching = true;

		db.table('images')
			.toArray()
			.then(async (images) => {
				for (const image of images) await searchImage(image);
				searching = false;
			});
	}, 500);

	$effect(() => {
		// `doSearch` is debounced, so set `searching` to `true` immediately
		//  to avoid "no matches found" while typing
		searching = true;
		doSearch(search);
	});
</script>

<svelte:head>
	<title>Search | Map ATR Explorer</title>
	<meta name="description" content="Application for investigating MapReader Text-Spotter outputs" />
</svelte:head>

<div class="container">
	<div class="search">
		<div class="search-input">
			<Search bind:value={search} />
		</div>
		<div class="search-status">
			{#if searching}
				<InlineLoading description="Searching..." />
			{:else if matches.length}
				{totalMatches.toLocaleString()} matches found in {matchedImages.size} image(s)
				{#if totalMatches > maxResults}(max 1,000 shown){/if}
			{:else if search !== ''}
				<p>No results found for "{search}"</p>
			{/if}
			<span>
				Searching {totalFeatures.toLocaleString()} features across {totalImages.toLocaleString()} images
			</span>
		</div>
	</div>

	{#if matches.length}
		<table class="bx--data-table bx--data-table--sort">
			<thead>
				<tr>
					<th aria-sort="none" scope="col" data-header="imageName">
						<div class="bx--table-header-label">Image</div>
					</th>
					<th aria-sort="none" scope="col" data-header="text">
						<div class="bx--table-header-label">Feature Text</div>
					</th>
					<th scope="col" data-header="clip">
						<div class="bx--table-header-label">Clipped Image</div>
					</th>
				</tr>
			</thead>
			<tbody aria-live="polite">
				{#each matches as match (match.key)}
					<tr>
						<td>
							{match.imageName}
						</td>
						<td>{match.text} ({match.featureId})</td>
						<td>
							<a href={`${base}/view/?id=${match.imageId}&feat=${match.featureId}`}>
								<FeatureClip
									croppedBitmap={match.croppedBitmap}
									width={match.width}
									height={match.height}
								/>
							</a>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	{/if}
</div>

<style>
	.container {
		display: flex;
		flex-direction: column;
		height: 100%;
		overflow: hidden;
	}

	.search {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.search-input {
		display: flex;
	}

	.search-status {
		align-items: center;
		display: flex;
		gap: 1rem;
		height: 1rem;
		margin-bottom: 1rem;

		span {
			flex: 1 0 auto;
			text-align: right;
		}
	}

	table {
		display: block;
		height: 100%;
		width: 100%;
	}

	thead,
	tbody,
	tr {
		display: table;
		table-layout: fixed;
		width: 100%;
	}

	tbody {
		display: block;
		height: calc(100% - 96px - 48px); /* 96px = .search height, 48px = thead height */
		overflow: auto;
	}
</style>
