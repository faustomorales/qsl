<script lang="ts">
  export let disabled: boolean,
    dataIndex: number,
    basis: string,
    text: string,
    className: string | null = "",
    tooltip: string | null = "",
    highlighted: boolean = false;
  let disabledCached = false;
  const setDisabled = (value: boolean) => {
    setTimeout(() => {
      if (value === disabled) {
        disabledCached = value;
      }
    }, 100);
  };
  $: disabled, setDisabled(disabled);
</script>

<button
  style="flex: 0 1 {basis};"
  disabled={disabledCached}
  data-index={dataIndex}
  alt={tooltip}
  class={`${className || ""} ${highlighted ? "highlighted" : ""}`}
  on:click
  ><div class="background" />
  <span class="text">{text}</span>
  {#if tooltip}
    <div class="tooltip">{tooltip}</div>
  {/if}
</button>

<style>
  .background {
    position: absolute;
    left: 0;
    right: 0;
    top: 0;
    bottom: 0;
    width: 100%;
    height: 100%;
    z-index: 0;
    background-color: var(--background-color);
  }
  .text {
    z-index: 1;
    position: relative;
    background: none;
  }
  button {
    position: relative;
    border-width: 1px 0px 1px 1px;
    border-style: solid;
    border-color: var(--color2);
    padding: 10px;
    color: var(--text-color);
    text-transform: uppercase;
    cursor: pointer;
  }
  button:disabled {
    border-color: var(--disabled-color);
    cursor: auto;
  }
  button:focus-visible:not(:disabled),
  button:active:not(:disabled) {
    outline: none;
  }
  button:focus-visible:not(:disabled) .background,
  button:active:not(:disabled) .background {
    background-color: var(--color2);
  }
  button:last-of-type,
  button:last-of-type .background {
    border-top-right-radius: 10px;
    border-bottom-right-radius: 10px;
    border-width: 1px;
  }
  button:first-of-type,
  button:first-of-type .background {
    border-bottom-left-radius: 10px;
    border-top-left-radius: 10px;
  }
  button.highlighted .background {
    background-color: var(--color2);
  }
  button:hover:not(:disabled) .background {
    background-color: var(--color2);
    opacity: 0.6;
  }

  /* Tooltip text */
  button:disabled .tooltip {
    background-color: var(--disabled-color);
  }
  button:not(:disabled) .tooltip {
    background-color: var(--color2);
  }
  button .tooltip {
    text-transform: none;
    opacity: 0.0;
    transition: opacity 0.3s, visibility 0.3s;
    visibility: hidden;
    color: var(--text-color);
    text-align: center;
    padding: 8px;
    border-radius: 6px;

    bottom: 100%;
    margin-bottom: 10px;
    transform: translate(-50%, 0%);
    left: 50%;
    position: absolute;
    z-index: 1;
  }

  /* Show the tooltip text when you mouse over the tooltip container */
  button:hover .tooltip {
    visibility: visible;
    opacity: 1.0;
    transition: opacity 0.3s ease 0.5s, visibility 0.3s ease 0.5s;
  }

  button .tooltip::after {
    content: " ";
    position: absolute;
    top: 100%; /* At the bottom of the tooltip */
    left: 50%;
    margin-left: -5px;
    border-width: 5px;
    border-style: solid;
  }
  button:disabled .tooltip::after {
    border-color: var(--disabled-color) transparent transparent transparent;
  }
  button:not(:disabled) .tooltip::after {
    border-color: var(--color2) transparent transparent transparent;
  }
</style>
