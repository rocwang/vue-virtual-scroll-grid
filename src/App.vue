<template>
  <Grid
    :length="1000"
    :pageSize="2"
    :pageProvider="pageProvider"
    :class="$style.grid"
  >
    <template v-slot:placeholder="{ index, style }">
      <ProductItem :index="index" :style="style" />
    </template>
    <template v-slot:default="{ item, style, index }">
      <ProductItem :index="index" :item="item" :style="style" />
    </template>
  </Grid>
</template>

<script lang="ts">
import { range } from "ramda";
import { defineComponent } from "vue";
import Grid from "./Grid.vue";
import ProductItem from "./ProductItem.vue";

export default defineComponent({
  name: "App",
  components: { Grid, ProductItem },
  setup: () => ({
    pageProvider: (pageNumber: number, pageSize: number): Promise<number[]> =>
      new Promise((resolve) =>
        setTimeout(
          () =>
            resolve(
              range(0, 1000).slice(
                pageNumber * pageSize,
                (pageNumber + 1) * pageSize
              )
            ),
          Math.round(3000 * Math.random())
        )
      ),
  }),
});
</script>

<style module>
.grid {
  display: grid;
  grid-gap: 20px;
  grid-template-rows: 200px;
  grid-template-columns: repeat(2, 1fr);
  place-items: stretch;
}

@media (min-width: 768px) {
  .grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (min-width: 992px) {
  .grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (min-width: 1650px) {
  .grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

@media (min-width: 1890px) {
  .grid {
    grid-template-columns: repeat(5, 1fr);
  }
}

@media (min-width: 2530px) {
  .grid {
    grid-template-columns: repeat(6, 1fr);
  }
}
</style>
