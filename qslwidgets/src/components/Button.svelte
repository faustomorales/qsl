<script lang="ts">
  export let disabled: boolean,
    dataIndex: number,
    basis: string,
    text: string,
    className: string | null = "",
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
  class={`${className || ""} ${highlighted ? "highlighted" : ""}`}
  on:click
  ><div class="background" />
  <span class="text">{text}</span></button
>

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
    overflow: hidden;
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
  button:last-of-type {
    border-top-right-radius: 10px;
    border-bottom-right-radius: 10px;
    border-width: 1px;
  }
  button:first-of-type {
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
</style>
