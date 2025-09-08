<script lang="ts">
	import { focus } from '../library/common.js';

	let element: HTMLButtonElement;
</script>

<button
	tabindex="0"
	aria-label="Capture focus for the labeler element."
	bind:this={element}
	class="click-target"
	on:click={() => focus(element)}
></button>

<style>
	.click-target {
		width: 100%;
		height: 100%;
		position: absolute;

		/* Reset button styling */
		background: none;
		border: none;
		padding: 0;
		margin: 0;
		font: inherit;
		color: inherit;
		cursor: default;
		outline: none;
		appearance: none;
		-webkit-appearance: none;
		-moz-appearance: none;
	}
	.click-target:focus-visible {
		outline: 2px solid transparent;
	}
</style>
