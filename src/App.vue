<template>
  <Grid :items="items" v-slot="{ item, style }" :class="$style.grid">
    <ProductItem
      :text="item.toString(10)"
      :class="$style.item"
      :style="style"
    />
  </Grid>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import Grid from "./components/Grid.vue";
import ProductItem from "./components/ProductItem.vue";

export default defineComponent({
  name: "App",
  components: {
    Grid,
    ProductItem,
  },
  setup() {
    return {
      items: Array(1000)
        .fill(null)
        .map((item, index) => index),
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
  place-items: center;
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

.item {
  grid-area: 1/1;
  will-change: transform;
}
</style>
