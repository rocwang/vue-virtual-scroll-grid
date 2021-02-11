<template>
  <div :class="$style.root">{{ text }}</div>
</template>

<script lang="ts">
import { defineComponent, PropType } from "vue";

export default defineComponent({
  name: "ProductItem",
  props: {
    text: {
      type: String as PropType<string>,
      required: true,
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
  width: 100px;
  height: 100px;
}
</style>
