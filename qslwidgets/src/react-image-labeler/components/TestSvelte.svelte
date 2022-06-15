<script lang="ts">
  import { createEventDispatcher } from "svelte";

  let number = 0;
  const dispatch = createEventDispatcher();
</script>

<h1>{number}</h1>
<button on:click={() => dispatch("magicalclick")}> Click Me </button>
