<template>
  <transition :name="`${bem()}-`">
    <div :class="bem()" :style="style">
      <div :class="bem('inner')">
        <div
          :style="{ opacity: isPlaceholderVisible ? 1 : 0 }"
          :class="[bem('layer'), bem('layer', 'placeholder')]"
          v-if="progressive"
        >
          <Logo :class="bem('logo')" />
        </div>

        <img
          :style="{ opacity: isThumbVisible ? 1 : 0 }"
          ref="thumb"
          :src="thumb"
          :alt="alt"
          :class="[bem('layer'), bem('layer', 'thumb')]"
          @load.passive="onThumbLoad"
          crossorigin="anonymous"
          v-if="progressive"
        />

        <img
          :style="{ opacity: isBigVisible ? 1 : 0 }"
          ref="big"
          :src="src"
          :alt="alt"
          :sizes="sizes"
          :srcset="flatSrcSet"
          :class="[bem('layer'), bem('layer', 'big')]"
          @load.passive="onBigLoad"
          crossorigin="anonymous"
        />
      </div>
    </div>
  </transition>
</template>

<script>
import Logo from "./Logo.vue";

export default {
  name: "SmartImage",
  components: { Logo },
  props: {
    lazyLoad: {
      type: Boolean,
      default: true,
    },
    masterSrc: {
      type: String,
      default: "",
    },
    alt: {
      type: String,
      default: "",
    },
    sizes: {
      type: String,
      default: "",
    },
    progressive: {
      type: Boolean,
      default: true,
    },
    widthRatio: {
      type: Number,
      default: 1,
    },
    heightRatio: {
      type: Number,
      default: 1,
    },
    fit: {
      type: String,
      default: "contain",
      validator: function (value) {
        return ["contain", "cover"].includes(value);
      },
    },
  },
  data() {
    return {
      isVisible: !(this.lazyLoad && "IntersectionObserver" in window),
      thumbLoaded: false,
      bigLoaded: false,
    };
  },
  computed: {
    style() {
      return {
        "--img-w-ratio": this.widthRatio,
        "--img-h-ratio": this.heightRatio,
        "--img-fit": this.fit,
      };
    },
    isBigVisible() {
      return this.src && this.isVisible && this.bigLoaded;
    },
    isThumbVisible() {
      return (
        this.thumb && this.isVisible && this.thumbLoaded && !this.bigLoaded
      );
    },
    isPlaceholderVisible() {
      return !this.thumbLoaded && !this.bigLoaded;
    },
    thumb() {
      const thumbWidth = 30;
      const thumbHeight = this.getHeight(thumbWidth);
      return this.masterSrc && this.isVisible
        ? this.resize(`${thumbWidth}x${thumbHeight}`)
        : "";
    },
    srcSet() {
      let srcSet = [];

      let widthItems = this.sizes.match(/[\d.]+(?=px(?! *\)))/gi);
      if (widthItems) {
        widthItems = widthItems.sort();
        widthItems.forEach((width) => {
          [1, 2, 3].forEach((scale) => {
            const imgWidth = Math.ceil(width * scale);
            const imgHeight = this.getHeight(imgWidth);
            const src = this.resize(`${imgWidth}x${imgHeight}`);
            if (src) {
              srcSet.push({
                src,
                imgWidth,
              });
            }
          });
        });
      }

      return srcSet;
    },
    flatSrcSet() {
      return this.isVisible
        ? this.srcSet.reduce(
            (flatSrcSet, { src, imgWidth }) =>
              flatSrcSet
                ? `${flatSrcSet}, ${src} ${imgWidth}w`
                : `${src} ${imgWidth}w`,
            "",
          )
        : "";
    },
    src() {
      if (this.isVisible) {
        if (this.srcSet.length) {
          return this.srcSet[0].src;
        } else {
          return this.masterSrc;
        }
      } else {
        return "";
      }
    },
  },
  emits: ["thumb_load", "load", "big_load"],
  mounted() {
    if (this.lazyLoad && "IntersectionObserver" in window) {
      const io = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting) {
            this.isVisible = true;
            io.disconnect();
          }
        },
        {
          // options
        },
      );

      io.observe(this.$el);
    }
  },
  methods: {
    getHeight(width) {
      return Math.ceil((width * this.heightRatio) / this.widthRatio);
    },
    onBigLoad() {
      this.bigLoaded = true;
      this.$emit("big_load");
      this.$emit("load");
    },
    onThumbLoad() {
      this.thumbLoaded = true;
      this.$emit("thumb_load");
    },
    /**
     * Resize the master src
     * @param size e.g. '150x150', '150x', 'x150', '150x150_crop_center', '150x150_cropped'
     * @returns string
     */
    resize(size) {
      if (!this.masterSrc) {
        return "";
      }

      if (!size) {
        return this.masterSrc;
      }

      return this.resizeImage(this.masterSrc, size);
    },
    resizeImage(masterSrc, size, pngToJpg = true) {
      const matches = masterSrc.match(
        /(^.*)\.(jpg|jpeg|gif|png|bmp|bitmap|tiff|tif)(\?.*)?$/i,
      );

      if (matches) {
        const prefix = matches[1].replace(/http:/, "https:/");
        const suffix =
          matches[2].toLowerCase() === "png" && pngToJpg
            ? `${matches[2]}.jpg`
            : matches[2];
        const cacheBuster = matches[3];

        return `${prefix}_${size}.${suffix}${cacheBuster}`;
      } else {
        return "";
      }
    },
  },
  watch: {
    masterSrc: {
      handler() {
        this.thumbLoaded = false;
        this.bigLoaded = false;
      },
      immediate: true,
    },
  },
};
</script>

<style>
:root {
  --img-w-ratio: 1;
  --img-h-ratio: 1;
  --img-fit: contain;
  --img-bg: var(--color-rice, transparent);
}

.smart-image {
  transition: opacity 100ms ease-out;
}

.smart-image--enter,
.smart-image--leave-to {
  opacity: 0;
}

.smart-image__inner {
  position: relative;
  width: 100%;
  padding-top: 100%;
  padding-top: calc(100% / var(--img-w-ratio, 1) * var(--img-h-ratio, 1));
  overflow: hidden;
}

.smart-image__layer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: var(--img-fit, contain);
  transition: opacity 100ms ease-out;
  will-change: opacity;
}

.smart-image__layer--big {
  z-index: 3;
}

.smart-image__layer--thumb {
  z-index: 2;
  filter: blur(20px);
}

.smart-image__layer--placeholder {
  z-index: 1;
  display: flex;
  flex-flow: row nowrap;
  justify-content: center;
  align-items: center;
  background-color: var(--img-bg);
}

.smart-image__logo {
  width: calc(1 / 3 * 100%);
  color: var(--color-gray);
}
</style>
