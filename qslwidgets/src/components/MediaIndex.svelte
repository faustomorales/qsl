<script lang="ts" generics="T extends number | string">
  import { createEventDispatcher } from "svelte";
  import type { IndexState } from "../library/types.js";
  import ButtonGroup from "./ButtonGroup.svelte";
  import Edit from "../icons/Edit.svelte";
  import IconButton from "./IconButton.svelte";
  import Filter from "../icons/Filter.svelte";
  import RemoveFilter from "../icons/RemoveFilter.svelte";
  import Sort from "../icons/Sort.svelte";
  import SortUp from "../icons/SortUp.svelte";
  import SortDown from "../icons/SortDown.svelte";
  import ClickTarget from "./ClickTarget.svelte";
  import FocusIndicator from "./FocusIndicator.svelte";

  export let indexState: IndexState<T>, idx: T;
  const dispatcher = createEventDispatcher();
  $: pages = Math.ceil(indexState.rowCount / indexState.rowsPerPage);
  $: sortState =
    indexState.sortModel.length > 0
      ? indexState.sortModel[0]
      : { field: undefined, sort: undefined };
  $: filterState =
    indexState.filterModel.length > 0
      ? indexState.filterModel[0]
      : { field: undefined, value: undefined };
  let filterValue = "";
  const initializeFilterValue = () => {
    filterValue = filterState && filterState.value ? filterState.value : "";
  };
  $: indexState, initializeFilterValue();
  const onFilterValueChange = () => {
    filterState = {
      field: filterState.field as string,
      value: filterValue,
    };
    indexState = { ...indexState, filterModel: [filterState] };
    dispatcher("sort");
  };
  const onFilterDeletion = () => {
    filterState = { field: undefined, value: undefined };
    indexState = { ...indexState, filterModel: [] };
    dispatcher("sort");
  };
  const createFilterInitializer = (field: string) => () => {
    filterState = { field, value: undefined };
    indexState = { ...indexState, filterModel: [filterState] };
    dispatcher("sort");
  };
  const createLabelCallback = (index: T) => () => {
    idx = index;
    dispatcher("label");
  };
  const createSortCallback = (field: string) => () => {
    if (sortState.field === field && sortState.sort === "desc") {
      indexState = { ...indexState, sortModel: [{ field, sort: "asc" }] };
    } else if (sortState.field === field && sortState.sort == "asc") {
      indexState = { ...indexState, sortModel: [] };
    } else {
      indexState = { ...indexState, sortModel: [{ field, sort: "desc" }] };
    }
    dispatcher("sort");
  };
</script>

<ClickTarget />
<table>
  <thead>
    <tr>
      {#each indexState.columns as column}
        <th
          ><div class="heading">
            <span>{column.headerName || column.field}</span>
            <div class="heading-controls">
              <span on:click={createSortCallback(column.field)}>
                {#if sortState.field === column.field && sortState.sort === "asc"}
                  <SortUp />
                {:else if sortState.field === column.field && sortState.sort === "desc"}
                  <SortDown />
                {:else}
                  <Sort />
                {/if}
              </span>
              <div>
                {#if filterState.field === column.field}
                  <span on:click={onFilterDeletion}><RemoveFilter /></span>
                {:else}
                  <span on:click={createFilterInitializer(column.field)}
                    ><Filter />
                  </span>
                {/if}
              </div>
              {#if filterState.field === column.field}
                <input
                  type="text"
                  class="filter"
                  on:change={onFilterValueChange}
                  bind:value={filterValue}
                />
              {/if}
            </div>
          </div>
        </th>
      {/each}
    </tr>
  </thead>
  <tbody>
    {#each indexState.rows as row}
      <tr class={row.qslId === idx ? "active" : ""}>
        {#each indexState.columns as column, index}
          <td>
            {#if index == 0}
              <IconButton on:click={createLabelCallback(row.qslId)}
                ><Edit /></IconButton
              >
            {/if}
            {row[column.field]}</td
          >
        {/each}
      </tr>
    {/each}
  </tbody>
</table>
<div class="navigation">
  <span class="page-indicator">Page {indexState.page + 1} / {pages}</span>
  <FocusIndicator />
  <div class="buttons">
    <ButtonGroup
      on:click={({ detail: { name } }) => {
        if (name === "back") {
          dispatcher("label");
        }
      }}
      configs={[
        {
          text: "Back to Labeling",
          event: "back",
          disabled: false,
          shortcuts: [],
          tooltip: "Return to labeling.",
        },
      ]}
    />
  </div>
  <div class="buttons">
    <ButtonGroup
      on:click={({ detail: { name } }) => {
        if (name === "next") {
          indexState = { ...indexState, page: indexState.page + 1 };
        } else if (name === "prev") {
          indexState = { ...indexState, page: indexState.page - 1 };
        }
        dispatcher("sort");
      }}
      configs={[
        {
          text: "Previous",
          event: "prev",
          disabled: indexState.page == 0,
          shortcuts: [{ key: "ArrowLeft" }],
          tooltip: "Go to previous page.",
        },
        {
          text: "Next",
          event: "next",
          disabled: indexState.page >= pages - 1,
          shortcuts: [{ key: "ArrowRight" }],
          tooltip: "Go to next page.",
        },
      ]}
    />
  </div>
</div>

<style>
  .heading span {
    width: 100%;
    text-align: left;
  }
  .heading :global(svg) {
    fill: var(--label-color);
    height: 18px;
  }
  .heading {
    display: flex;
    flex-direction: row;
    align-items: center;
    position: relative;
  }
  .heading-controls {
    cursor: pointer;
    display: flex;
    flex-direction: row;
  }
  .heading-controls .filter {
    position: absolute;
    z-index: 1;
    top: 100%;
  }
  th:not(:last-of-type) .heading-controls .filter {
    left: 100%;
    transform: translateX(-20px);
  }
  th:last-of-type .heading-controls .filter {
    right: 0%;
  }
  .navigation {
    display: flex;
    flex-direction: row;
    column-gap: 10px;
    align-items: center;
  }
  .navigation .page-indicator {
    white-space: nowrap;
  }
  .navigation .buttons {
    width: 100%;
  }
  tr.active {
    background-color: darkgrey;
  }
  td,
  th {
    border: 1px solid var(--border-color);
    border-spacing: 0;
  }
  table {
    border-spacing: 0;
    z-index: 1;
  }
  td,
  th {
    padding: 8px;
  }
  table tr:first-child th:first-child {
    border-top-left-radius: 10px;
  }
  table tr:last-child th:last-child {
    border-top-right-radius: 10px;
  }

  table tr:last-child td:first-child {
    border-bottom-left-radius: 10px;
  }

  table tr:last-child td:last-child {
    border-bottom-right-radius: 10px;
  }
  td:first-child {
    display: flex;
    flex-direction: row;
    white-space: nowrap;
    align-items: center;
    column-gap: 5px;
  }
</style>
