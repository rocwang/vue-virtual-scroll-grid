<template>
  <div :class="$style.root">
    <div v-if="item === undefined">Placeholder {{ index }}</div>
    <div v-else>{{ item }}</div>
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from "vue";

export default defineComponent({
  name: "ProductItem",
  props: {
    index: {
      type: Number as PropType<number>,
      required: true,
    },
    item: {
      type: Number as PropType<number>,
      required: false,
    },
  },
});
</script>

<style module>
.root {
  box-sizing: border-box;
  border: 1px solid black;
  display: flex;
  flex-flow: row nowrap;
  justify-content: center;
  align-items: center;
}
</style>
