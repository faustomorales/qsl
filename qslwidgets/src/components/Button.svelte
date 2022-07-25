<script lang="ts">
  export let disabled: boolean, dataIndex: number, basis: string, text: string;
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
  on:click>{text}</button
>

<style>
  button {
    border-width: 1px 0px 1px 1px;
    border-style: solid;
    border-color: var(--color2);
    padding: 10px;
    background-color: var(--background-color);
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
    background-color: var(--color2);
    outline: none;
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
</style>
