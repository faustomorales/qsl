<script lang="ts">
  export let layout: "horizontal" | "vertical" = "horizontal";
</script>

<div class="labeler-layout-container {layout}">
  <div class="content">
    <slot name="content" />
  </div>
  <div class="control">
    <slot name="control" />
  </div>
</div>

<style>
  .labeler-layout-container {
    display: flex;
  }

  .content {
    display: flex;
    flex-direction: column;
    row-gap: 10px;
  }

  .horizontal {
    flex-direction: row-reverse;
    column-gap: 10px;
  }

  .horizontal .control {
    width: 256px;
    min-width: 256px;
    max-width: 256px;
  }

  .horizontal .content {
    flex: 1 1 auto;
  }

  .vertical {
    flex-direction: column;
    row-gap: 10px;
  }
</style>
