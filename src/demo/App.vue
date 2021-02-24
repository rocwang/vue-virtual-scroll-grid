<template>
  <Header />

  <Grid
    :length="length"
    :pageSize="pageSize"
    :pageProvider="pageProvider"
    :class="$style.grid"
  >
    <template v-slot:probe>
      <ProductItem sizes="(min-width: 768px) 360px, 290px" />
    </template>

    <template v-slot:placeholder="{ style }">
      <ProductItem :style="style" sizes="(min-width: 768px) 360px, 290px" />
    </template>

    <template v-slot:default="{ item, style }">
      <ProductItem
        :handle="item.handle"
        :price="item.price * 100"
        :compare-at-price="item.compare_at_price * 100"
        :published-at="new Date(item.published_at)"
        :style="style"
        :master-src="item.product_image"
        :initial-alt-master-src="true"
        :alt="item.title"
        sizes="(min-width: 768px) 360px, 290px"
        :tags="item.tags"
        :vendor="item.vendor"
        :title="item.title"
      />
    </template>
  </Grid>

  <Control />
</template>

<script lang="ts">
import { defineComponent } from "vue";
import Grid from "../Grid.vue";
import Header from "./Header.vue";
import Control from "./Control.vue";
import ProductItem from "./ProductItem.vue";
import { length, pageSize, pageProvider } from "./store";

export default defineComponent({
  name: "App",
  components: { Grid, ProductItem, Header, Control },
  setup: () => ({
    length,
    pageSize,
    pageProvider,
  }),
});
</script>

<style module>
:root {
  --color-black: #1a1919;
  --color-white: #fff;

  --color-light-gray: #eee;
  --color-gray: #b9b9b9;

  --color-rice: #f8f8f3;
  --color-dark-rice: #727266;

  --color-light-red: #f2e5e5;
  --color-red: #9c8282;

  --color-light-green: #ecf2e5;
  --color-green: #909c82;
}

body {
  color: var(--color-black);
  background-color: var(--color-white);
}

.grid {
  display: grid;
  padding: 0 1rem;
  grid-gap: 2rem;
  grid-template-columns: repeat(2, 1fr);
  place-items: start stretch;
}

@media (min-width: 760px) {
  .grid {
    padding: 1.5rem;
    grid-gap: 3rem;
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (min-width: 1140px) {
  .grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

@media (min-width: 1520px) {
  .grid {
    grid-template-columns: repeat(5, 1fr);
  }
}

@media (min-width: 1900px) {
  .grid {
    grid-template-columns: repeat(6, 1fr);
  }
}

@media (min-width: 2280px) {
  .grid {
    grid-template-columns: repeat(7, 1fr);
  }
}

@media (min-width: 2660px) {
  .grid {
    grid-template-columns: repeat(8, 1fr);
  }
}

@media (min-width: 3040px) {
  .grid {
    grid-template-columns: repeat(9, 1fr);
  }
}

@media (min-width: 3420px) {
  .grid {
    grid-template-columns: repeat(10, 1fr);
  }
}
</style>
