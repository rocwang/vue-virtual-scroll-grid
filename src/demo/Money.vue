<template>
  <component :is="tag">
    {{ this.formattedValue }}
  </component>
</template>
<script>
/**
 * Format money values based on your shop currency settings
 */
export default {
  name: "Money",
  props: {
    // value - value in cents or dollar amount e.g. 300 cents or '3.00' dollars
    value: {
      type: [Number, String],
      required: true,
    },
    tag: {
      type: String,
      required: false,
      default: "div",
    },
  },
  computed: {
    formattedValue() {
      let value = this.value;

      if (typeof value === "string") {
        value = parseInt(value.replace(".", ""));
      }

      return `$${this.formatWithDelimiters(value, 2)}`;
    },
  },
  methods: {
    formatWithDelimiters(
      number,
      precision = 2,
      thousands = ",",
      decimal = ".",
    ) {
      if (isNaN(number) || number == null) {
        return 0;
      }

      number = (number / 100.0).toFixed(precision);

      const parts = number.split(".");
      const dollarsAmount = parts[0].replace(
        /(\d)(?=(\d\d\d)+(?!\d))/g,
        "$1" + thousands,
      );
      const centsAmount = parts[1] ? decimal + parts[1] : "";

      return dollarsAmount + centsAmount;
    },
  },
};
</script>
