<script>
	import { base } from '$app/paths';
	import {
		Button,
		DataTable,
		Loading,
		OverflowMenu,
		OverflowMenuItem,
		Toolbar,
		ToolbarSearch,
		ToolbarContent,
		Tooltip
	} from 'carbon-components-svelte';
	import TrashCan from 'carbon-icons-svelte/lib/TrashCan.svelte';

	import {
		liveQueryAllImageObjects,
		removeAllImageObjects,
		removeImageObjectById,
		upsertImageObject
	} from '$lib/db';
	import { formatBytes } from '$lib/storage';

	import AddNewImages from '@components/AddNewImages.svelte';
	import AddFeaturesFromJson from '@components/AddFeaturesFromJson.svelte';
	import { notify } from '@components/Notifications.svelte';
	import { confirm } from '@components/ConfirmationModal.svelte';

	let rows = liveQueryAllImageObjects(); // returns a svelte store

	const headers = [
		{ key: 'id', value: 'ID', empty: false },
		{ key: 'name', value: 'Name', empty: false },
		{ key: 'features', value: '# Features', empty: false },
		{ key: 'size', value: 'Image Size', empty: false },
		{ key: 'bytes', value: 'Size in Database', empty: false },
		{ key: 'imageThumbBlob', value: 'Image', empty: false },
		{ key: 'actions', empty: true }
	];

	/** @param {ImageObject} imageObject*/
	async function clearFeatures(imageObject) {
		imageObject.features = undefined;
		await upsertImageObject(imageObject);
		notify({
			title: 'Features cleared',
			subtitle: `Features cleared for image "${imageObject.name}"`
		});
	}

	/** @param {ImageObject & { id: number } } imageObject*/
	async function removeImage(imageObject) {
		await removeImageObjectById(imageObject.id);
		notify({ title: 'Image removed', subtitle: `Image "${imageObject.name}" removed` });
	}
</script>

<svelte:head>
	<title>Dataset | Map ATR Explorer</title>
	<meta name="description" content="Application for investigating MapReader Text-Spotter outputs" />
</svelte:head>

<div class="container">
	<AddNewImages redirectOnAdd={false} class="add-image" />
	{#if !$rows}
		<Loading />
	{:else if $rows.length === 0}
		<p class="get-started">Add some images to get started!</p>
	{:else}
		<DataTable {headers} rows={$rows} stickyHeader class="dataset-table">
			<Toolbar>
				<ToolbarContent>
					<ToolbarSearch
						placeholder="Coming Soon..."
						on:change={() => {
							notify({
								title: 'Search',
								subtitle: 'Table filtering not yet implemented (sorry!)...'
							});
						}}
					/>
					<Button
						iconDescription="Delete all"
						icon={TrashCan}
						on:click={() => {
							confirm('Are you sure you want to delete all images?')
								.then(() => {
									removeAllImageObjects().then(() => {
										notify({ title: 'All images deleted', subtitle: 'All images deleted' });
									});
								})
								.catch(() => {
									notify({ title: 'Action canceled' });
								});
						}}>Delete All</Button
					>
				</ToolbarContent>
			</Toolbar>

			<svelte:fragment slot="cell-header" let:header>
				{#if header.key === 'bytes'}
					{header.value}
					<Tooltip direction="bottom">
						<p>May not correspond exactly to the size of the image on disk.</p>
					</Tooltip>
				{:else}
					{header.value}
				{/if}
			</svelte:fragment>
			<svelte:fragment slot="cell" let:row let:cell>
				{#if cell.key === 'imageThumbBlob'}
					<img
						src={URL.createObjectURL(cell.value)}
						alt={row.name}
						style="--aspect-ratio: {row.width} / {row.height}"
					/>
				{:else if cell.key === 'features'}
					{#if cell.value}
						{cell.value.length}
					{:else}
						{@const imageObject = /** @type {ImageObject} */ (row)}
						<AddFeaturesFromJson {imageObject} />
					{/if}
				{:else if cell.key === 'size'}
					{row.width}x{row.height}
				{:else if cell.key === 'bytes'}
					{formatBytes(row.imageBlob.size)}
				{:else if cell.key === 'actions'}
					<OverflowMenu flipped>
						<OverflowMenuItem text="View" href={`${base}/view/?id=${row.id}`} />
						<OverflowMenuItem text="Add/Update Features from MATRE GeoJSON" disabled />
						<OverflowMenuItem
							danger
							text="Delete Features"
							disabled={!row.features}
							on:click={() => clearFeatures(/** @type {ImageObject} */ (row))}
						/>
						<OverflowMenuItem
							danger
							text="Delete Image"
							on:click={() => removeImage(/** @type {ImageObject & { id: number }} */ (row))}
						/>
					</OverflowMenu>
				{:else}
					{cell.value}
				{/if}
			</svelte:fragment>
		</DataTable>
	{/if}
</div>

<style>
	.container {
		display: grid;
		gap: 1rem;
		grid-template-columns: 1fr;
		grid-template-rows: auto 1fr;
		height: 100%;
		overflow: hidden;
	}

	p.get-started {
		font-size: 1.2rem;
		margin-left: 1rem;
	}

	:global(.dataset-table) {
		max-height: 100%;
		max-width: 1200px;
		min-height: 0;
	}

	:global(.dataset-table .bx--data-table_inner-container) {
		height: 100%;
	}

	:global(.dataset-table table) {
		height: 100%;
		max-height: fit-content;
	}

	:global(.dataset-table thead) {
		overflow: visible;
	}

	:global(.dataset-table tbody) {
		height: calc(100% - 50px);
	}

	:global(.dataset-table tr) {
		height: fit-content;
	}

	:global(.dataset-table tr > :first-child),
	:global(.dataset-table tr > :last-child) {
		max-width: 10rem;
		text-align: center;
		width: 10rem;
	}

	:global(.dataset-table :is(td, th)) {
		align-items: center;
		justify-content: center;
	}

	:global(.dataset-table :is(td)) {
		min-height: 80px;
		padding: 0.875rem;
	}

	:global(.dataset-table tr > :nth-child(2)) {
		justify-content: left;
	}

	:global(.dataset-table .bx--table-header-label) {
		display: flex;
		align-items: flex-start;
		overflow: visible;
	}

	:global(.bx--tooltip__content) {
		white-space: initial;
	}

	img {
		aspect-ratio: var(--aspect-ratio);
		display: block;
		height: auto;
		margin: 0.5rem 0;
		max-height: 80px;
		max-width: 100%;
		transform-origin: 90% 10%;
		transition: all 200ms ease-out;

		&:hover {
			border-radius: 4px;
			box-shadow: 0 0 4px 2px #fff5;
			scale: 4;
			transition: all 400ms ease;
		}
	}
</style>
