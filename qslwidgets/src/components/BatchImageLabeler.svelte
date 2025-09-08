<script lang="ts">
	import type { BatchEntry, Labels, Config, WidgetActions } from '../library/types.js';
	import { createEventDispatcher } from 'svelte';
	import { createDraftStore, focus } from '../library/common.js';
	import EnhancementControls from './EnhancementControls.svelte';
	import RangeSlider from './RangeSlider.svelte';
	import ControlMenu from './ControlMenu.svelte';
	import ItemGrid from './ItemGrid.svelte';
	import BatchImageItem from './BatchImageItem.svelte';
	export let labels: Labels,
		config: Config,
		states: BatchEntry[] = [],
		targets: (string | undefined)[] | undefined = [],
		navigation: boolean = false,
		editableConfig: boolean = false,
		transitioning: boolean = false,
		actions: WidgetActions = {};
	let columnSize = 256,
		rotation = 0,
		container: HTMLDivElement;
	const dispatcher = createEventDispatcher();
	const { draft, history } = createDraftStore();
	const click = () => focus(container);
	const createSelectionToggle = (index: number) => () => {
		states = states
			.slice(0, index)
			.concat([{ ...states[index], selected: !states[index].selected }])
			.concat(states.slice(index + 1));
		click();
	};
	const createMassSelection = (selected: boolean) => () =>
		(states = states.map((s) => ({
			...s,
			selected: s.visible ? selected : s.selected
		})));
	$: (targets, labels, draft.reset(labels));
	$: items =
		targets && targets.length === states.length
			? targets
					.map((target, index) => ({ target, state: states[index], index }))
					.filter((entry) => entry.state.visible)
			: [];
</script>

<div bind:this={container}>
	<ItemGrid itemSize={columnSize} on:click={click}>
		{#if !transitioning}
			{#each items as entry}
				<BatchImageItem
					size={columnSize}
					{rotation}
					src={entry.target}
					metadata={entry.state.metadata}
					labeled={entry.state.labeled}
					ignored={entry.state.ignored}
					selected={entry.state.selected}
					on:click={createSelectionToggle(entry.index)}
				/>
			{/each}
		{/if}
	</ItemGrid>
</div>
<EnhancementControls>
	<RangeSlider
		bind:value={columnSize}
		min={100}
		max={600}
		marks={[{ value: 128 }, { value: 256 }, { value: 384 }, { value: 512 }]}
		disabled={false}
		name="Size"
	/>
	<RangeSlider
		bind:value={rotation}
		min={0}
		max={270}
		marks={[{ value: 0 }, { value: 90 }, { value: 180 }, { value: 270 }]}
		disabled={false}
		name="Rotation"
	/>
</EnhancementControls>
<ControlMenu
	bind:config
	bind:draft={$draft}
	on:change={draft.snapshot}
	on:next
	on:prev
	on:delete
	on:ignore
	on:unignore
	on:showIndex
	on:selectAll={createMassSelection(true)}
	on:selectNone={createMassSelection(false)}
	on:undo={() => history.undo()}
	on:save={() => {
		labels = draft.export();
		dispatcher('save');
	}}
	on:reset={() => draft.reset(labels)}
	disabled={transitioning}
	disableRegions={true}
	{editableConfig}
	{navigation}
	actions={{
		...actions,
		undo: $history > 0,
		selectAll: states.some((s) => s.visible && !s.selected),
		selectNone: states.some((s) => s.visible && s.selected)
	}}
/>
