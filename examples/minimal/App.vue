<template>
  <!--
    length: The number of items in the list.
    pageSize: The number of items in each page returned by the page provider.
    pageProvider: The callback that returns a page of items as a promise.
  -->
  <Grid :length="1000" :pageSize="10" :pageProvider="pageProvider" class="grid">
    <template v-slot:probe>
      <div class="item">Probe</div>
    </template>

    <!-- When the item is not loaded, a placeholder is rendered -->
    <template v-slot:placeholder="{ index, style }">
      <div class="item" :style="style">Placeholder {{ index }}</div>
    </template>

    <!-- Render a loaded item -->
    <template v-slot:default="{ item, style, index }">
      <div class="item" :style="style">{{ item }} {{ index }}</div>
    </template>
  </Grid>
</template>

<script>
import Grid from "vue-virtual-scroll-grid";

export default {
  name: "App",
  components: { Grid },
  setup: () => ({
    // Return items for the given page after a 0-3 second randomly
    pageProvider: (pageNumber, pageSize) =>
      new Promise((resolve) =>
        setTimeout(
          () => resolve(new Array(pageSize).fill("Loaded Item")),
          Math.round(3000 * Math.random())
        )
      ),
  }),
};
</script>

<style>
.grid {
  display: grid;
  grid-gap: 20px;
  grid-template-columns: repeat(2, 1fr);
}

@media (min-width: 768px) { .grid { grid-template-columns: repeat(3, 1fr); } }
@media (min-width: 992px) { .grid { grid-template-columns: repeat(4, 1fr); } }
@media (min-width: 1280px) { .grid { grid-template-columns: repeat(4, 1fr); } }
@media (min-width: 1440px) { .grid { grid-template-columns: repeat(5, 1fr); } }
@media (min-width: 1650px) { .grid { grid-template-columns: repeat(6, 1fr); } }
@media (min-width: 1890px) { .grid { grid-template-columns: repeat(7, 1fr); } }
@media (min-width: 2530px) { .grid { grid-template-columns: repeat(8, 1fr); } }

.item {
  background-color: lightgray;
  padding: 100px 0;
  text-align: center;
}
</style>
