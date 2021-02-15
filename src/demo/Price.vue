<template>
  <component :is="tag" :class="bem()">
    <template v-if="compareAtPrice > price">
      <Money :value="compareAtPrice" tag="s" :class="bem('compared-at')" />
      &nbsp;
    </template>
    <Money :value="price" tag="span" :class="bem('final')" />
  </component>
</template>

<script>
import Money from "./Money.vue";

export default {
  name: "Price",
  components: { Money },
  props: {
    price: {
      type: Number,
      required: true,
    },
    compareAtPrice: {
      type: Number,
      required: false,
      default: 0,
    },
    tag: {
      type: String,
      required: false,
      default: "span",
    },
  },
};
</script>

<style></style>
