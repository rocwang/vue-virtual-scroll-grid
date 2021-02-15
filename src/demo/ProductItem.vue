<template>
  <div :class="bem()" @mouseenter="mouseEnter" @mouseleave="mouseLeave">
    <div :class="bem('link')">
      <SmartImage :master-src="masterSrc" :alt="alt || title" :sizes="sizes" />
      <SmartImage
        v-if="altMasterSrc && isHovering"
        :master-src="altMasterSrc"
        :alt="alt || title"
        :sizes="sizes"
        :class="bem('alt-img')"
        :progressive="false"
      />
      <span :class="bem('label')" v-if="label">{{ label }}</span>
    </div>

    <p
      :class="[
        bem('vendor'),
        { [bem('vendor', 'hidden', false)]: isPlaceholder },
      ]"
    >
      <slot name="vendor">{{ vendor }}</slot>
    </p>

    <h2
      :class="[
        bem('title'),
        { [bem('title', 'hidden', false)]: isPlaceholder },
      ]"
    >
      <span :class="bem('title-link')">
        <slot name="title">{{ title }}</slot>
      </span>
    </h2>

    <Price
      :price="price"
      :compare-at-price="compareAtPrice"
      :class="[
        bem('price'),
        { [bem('title', 'hidden', false)]: isPlaceholder },
      ]"
    />
  </div>
</template>

<script>
import Price from "./Price.vue";
import SmartImage from "./SmartImage.vue";

export default {
  name: "ProductItem",
  components: { Price, SmartImage },
  props: {
    handle: {
      type: String,
      default: "",
    },
    price: {
      type: Number,
      default: 0,
    },
    compareAtPrice: {
      type: Number,
      default: 0,
    },
    publishedAt: {
      type: Date,
      default() {
        return new Date(0);
      },
    },
    masterSrc: {
      type: String,
      default: "",
    },
    initialAltMasterSrc: {
      // Boolean value means if the component should try load the lat image using the GraphQL API
      type: [String, Boolean],
      default: true,
    },
    alt: {
      type: String,
      default: "",
    },
    sizes: {
      type: String,
      default: "",
    },
    vendor: {
      type: String,
      default: "Product Vendor",
    },
    title: {
      type: String,
      default: "Product Title",
    },
    tags: {
      type: Array,
      default() {
        return [];
      },
    },
  },
  data() {
    return {
      isHovering: false,
      ...this.getInitialState(),
    };
  },
  computed: {
    isPlaceholder() {
      return !this.handle;
    },
    isSale() {
      return this.compareAtPrice > this.price;
    },
    isNew() {
      //                               day  hour sec    millisecond
      const twoWeeksAgo = new Date() - 14 * 24 * 3600 * 1000;
      return this.publishedAt >= twoWeeksAgo;
    },
    isLimitedEdition() {
      return this.tags.some((tag) => /limited edition/i.test(tag));
    },
    label() {
      if (this.isLimitedEdition) {
        return "limited edition";
        // } else if (this.isNew) { // Disable the new label for site launch
        //   return 'new'
      } else if (this.isSale) {
        return "sale";
      } else {
        return "";
      }
    },
  },
  watch: {
    handle: {
      handler() {
        Object.assign(this, this.getInitialState());
      },
      immediate: false,
    },
  },
  methods: {
    getInitialState() {
      return {
        altMasterSrc:
          typeof this.initialAltMasterSrc === "string"
            ? this.initialAltMasterSrc
            : "",
        altMasterSrcPromise: null,
      };
    },
    async mouseEnter() {
      this.isHovering = true;

      //      if (!this.altMasterSrcPromise && this.initialAltMasterSrc === true && this.handle) {
      //        this.altMasterSrcPromise = shopify.query.altImageByHandle({ handle: this.handle })
      //        const data = await this.altMasterSrcPromise
      //        if (data.shop.productByHandle.images && data.shop.productByHandle.images.edges[1]) {
      //          this.altMasterSrc = data.shop.productByHandle.images.edges[1].node.originalSrc
      //        }
      //      }
    },
    mouseLeave() {
      this.isHovering = false;
    },
  },
};
</script>

<style>
.product-item {
  overflow: hidden;
}

.product-item__text--enter-active {
  transition: opacity 100ms ease-out;
}

.product-item__text--enter {
  opacity: 0;
}

.product-item__text--enter-to {
  opacity: 1;
}

.product-item__link {
  display: block;
  margin-bottom: 10px;
  position: relative;
}

.product-item__alt-img {
  position: absolute;
  top: 0;
  left: 0;
  z-index: 10;
  width: 100%;
  transition: opacity 0.3s ease-out;
}

.product-item__label {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 20;
  font-size: 1.4rem;
  letter-spacing: 0.5px;
  text-transform: uppercase;
}

.product-item__vendor {
  text-transform: uppercase;
  font-weight: 700;
  font-size: 1.4rem;
  letter-spacing: 0.5px;
  margin-bottom: 5px;
}

.product-item__vendor em,
.product-item__title em {
  font-style: normal;
  background-color: var(--color-light-gray);
}

.product-item__title {
  font-size: 1.6rem;
  margin-bottom: 5px;
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
  text-transform: uppercase;
}

.product-item__price {
  font-size: 1.4rem;
  letter-spacing: 0.5px;
  margin-bottom: 5px;
}

.product-item__vendor--hidden,
.product-item__title--hidden,
.product-item__price--hidden {
  visibility: hidden;
}
</style>
