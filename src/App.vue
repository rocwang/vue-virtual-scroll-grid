<template>
  <Grid
    :length="1000"
    :pageSize="2"
    :pageProvider="pageProvider"
    :class="$style.grid"
  >
    <template v-slot:placeholder="{ index, style, className }">
      <ProductItem :index="index" :class="className" :style="style" />
    </template>
    <template v-slot:default="{ item, style, index, className }">
      <ProductItem
        :index="index"
        :item="item"
        :class="className"
        :style="style"
      />
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
  components: {
    Grid,
    ProductItem,
  },
  setup() {
    return {
      pageProvider(pageNumber: number, pageSize: number): Promise<number[]> {
        return new Promise((resolve) =>
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
        );
      },
    };
  },
});
</script>

<style module>
body {
  margin: 0;
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
}

.grid {
  display: grid;
  grid-gap: 20px;
  grid-template-rows: 200px;
  grid-template-columns: repeat(2, 1fr);
  place-items: strech;
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
