<script lang="ts">
  export let disabled: boolean = false;
</script>

<button disabled={!!disabled} on:click><slot /></button>

<style>
  button {
    position: relative;
    border-radius: 50%;
    border: none;
    background-color: transparent;
    width: 1.5rem;
    height: 1.5rem;
  }
  button:active:not(:disabled) {
    background-color: lightgrey;
  }
  button:disabled :global(svg) {
    fill: darkgrey;
  }
  button :global(svg) {
    position: absolute;
    width: 90%;
    height: 90%;
    left: 50%;
    top: 50%;
    fill: var(--label-color);
    transform: translate(-50%, -50%);
  }
</style>
