<script lang="ts">
	export let progress: number;
</script>

<div class="progress-bar">
	<div class="bar">
		<div class="background"></div>
		<div class="foreground" style="width: {progress}%"></div>
	</div>
	<div class="label"><span>{Math.round(progress)}%</span></div>
</div>

<style>
	.progress-bar {
		display: flex;
		flex-direction: row;
		flex-wrap: none;
		align-items: center;
		background-color: transparent;
	}
	.progress-bar .bar {
		position: relative;
		width: 100%;
	}
	.progress-bar .bar .background {
		width: 100%;
		background-color: var(--color1);
	}
	.progress-bar .bar .foreground {
		background-color: var(--color2);
	}
	.progress-bar .bar .background,
	.progress-bar .bar .foreground {
		border-radius: 16px;
		position: absolute;
		top: 50%;
		bottom: 50%;
		left: 0;
		height: 10px;
		transform: translateY(-7px);
	}
	.progress-bar .label {
		flex: 1;
		white-space: nowrap;
		margin: 10px;
	}
</style>
