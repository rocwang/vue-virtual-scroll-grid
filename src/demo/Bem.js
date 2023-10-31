import kebabCase from "lodash-es/kebabCase";

export default {
  methods: {
    bem(element, modifier, outputElement = false) {
      const blockClass = kebabCase(
        this.$options.className || this.$options.name,
      );
      const elementClass = `${blockClass}__${element}`;
      const elementModifierClass = `${elementClass}--${modifier}`;

      if (element && modifier && outputElement) {
        return `${elementClass} ${elementModifierClass}`;
      } else if (element && modifier && !outputElement) {
        return elementModifierClass;
      } else if (element && !modifier) {
        return elementClass;
      } else if (modifier) {
        return `${blockClass}--${modifier}`;
      } else {
        return blockClass;
      }
    },
  },
};
