<template>
  <div :class="bem()" :style="{height: `${this.contentHeight}px`}" v-if="total > 0">

    <div :class="[bem('grid'), {[bem('grid', '2columns', false)]: columnsOnMobile === 2 }]" ref="grid">

      <ProductItem :class="bem('item', 'dummy')" ref="isPlaceholder"/>

      <ProductItem v-for="(hit, index) in buffer"
                   :key="index"
                   :handle="hit.payload.handle"
                   :price="hit.payload.price | price"
                   :compare-at-price="hit.payload.compare_at_price | price"
                   :published-at="hit.payload.published_at | date"
                   :class="bem('item')"
                   :style="getItemStyle(hit.localIndex)"
                   :master-src="hit.payload.product_image"
                   :initial-alt-master-src="true"
                   :alt="hit.payload.title"
                   :sizes="$options.imgSizes"
                   :tags="hit.payload.tags"
      >
        <AisHighlight :result="hit.payload" attribute-name="vendor" slot="vendor" v-if="hit.payload._highlightResult"/>
        <template v-else slot="vendor">{{hit.payload.vendor}}</template>

        <AisHighlight :result="hit.payload" attribute-name="title" slot="title" v-if="hit.payload._highlightResult"/>
        <template v-else slot="title">{{hit.payload.title}}</template>
      </ProductItem>

    </div>

  </div>
</template>

<script>
import {
  Component as AisComponent,
  Highlight as AisHighlight
} from 'vue-instantsearch'
import { createNamespacedHelpers } from 'vuex'
import customMedia from '../../customMedia'
import ProductItem from '../Misc/ProductItem'
import config from '../../config'

const { mapState } = createNamespacedHelpers('collection')

/**
 * Display results from Algolia as product grid.
 * It supports virtual scrolling.
 */
export default {
  name: 'AllResults',
  mixins: [AisComponent],
  components: { ProductItem, AisHighlight },
  imgSizes: `${customMedia['--tablet']} 360px, 290px`,
  data () {
    return {
      blockClassName: 'all-results',
      items: Array(config.ALGOLIA.PAGINATION_LIMITED_TO).fill(null).map((item, index) => {
        return {
          localIndex: index,
          payload: {}
        }
      }),
      buffer: [],
      loadedPages: [],
      heightAboveWindow: 0,
      containerHeight: window.innerHeight,

      // visual attributes
      columns: 0,
      colGap: 0,
      rowGap: 0,
      itemWidthWithGap: 0,
      itemHeightWithGap: 0
    }
  },
  computed: {
    classMap () {
      return {
        'ais-no-results': this.bem('no-results'),
        'ais-no-results__query': this.bem('no-results-query')
      }
    },
    offset () {
      const rowsBeforeView = this.itemHeightWithGap && Math.floor((this.heightAboveWindow + this.rowGap) / this.itemHeightWithGap)
      return rowsBeforeView * this.columns
    },
    length () {
      const rowsInView = this.itemHeightWithGap && Math.ceil((this.containerHeight + this.rowGap) / this.itemHeightWithGap) + 1
      return rowsInView * this.columns
    },
    bufferedOffset () {
      const buffer = Math.floor(this.length / 2)
      return Math.max(this.offset - buffer, 0)
    },
    bufferedLength () {
      return Math.min(this.length * 2, this.total)
    },
    total () {
      return Math.min(config.ALGOLIA.PAGINATION_LIMITED_TO, this.searchStore.totalResults)
    },
    contentHeight () {
      const rows = Math.ceil(this.total / this.columns)
      const rowHeight = this.itemHeightWithGap
      return rowHeight * rows - this.rowGap
    },
    ...mapState(['columnsOnMobile'])
  },
  watch: {
    bufferedOffset () {
      this.onScanningWindowChange()
    },
    bufferedLength () {
      this.onScanningWindowChange()
    },
    // loading the first page will trigger the following
    'searchStore.results' () {
      // console.log('loaded from store')
      this.scrollToTop()

      // this.items.forEach(item => {
      //   item.payload = this.dummy
      // })
      this.loadedPages = [this.searchStore.page - 1]
      this.fillCache(this.searchStore.results, this.searchStore.page - 1, this.searchStore.resultsPerPage)

      if (this.total) {
        this.$nextTick(() => {
          this.updateMeasurement()
        })
      }
    },
    columnsOnMobile () {
      this.$nextTick(this.updateMeasurement)
    }
  },
  created () {
    window.addEventListener('resize', this.onResize, { passive: true })
    window.addEventListener('scroll', this.onScroll, { passive: true, capture: true })
  },
  beforeDestroy () {
    window.removeEventListener('resize', this.onResize)
    window.removeEventListener('scroll', this.onScroll)
  },
  methods: {
    scrollToTop () {
      let el = this.$el.parentElement
      let scrolled = false
      while (el) {
        if (el.scrollTop > 0) {
          el.scrollTop = 0
          scrolled = true
        }
        el = el.parentElement
      }

      return scrolled
    },
    onResize () {
      // console.log('onResize')
      window.requestAnimationFrame(this.updateMeasurement)
    },
    onScroll () {
      // console.log('onScroll')
      window.requestAnimationFrame(this.updateHeightAboveWindow)
    },
    updateHeightAboveWindow () {
      const boundingBox = this.$el.getBoundingClientRect()
      this.heightAboveWindow = Math.abs(Math.min(boundingBox.top, 0))
      // console.log('updateHeightAboveWindow', boundingBox.top, this.heightAboveWindow)
    },
    onScanningWindowChange () {
      this.updateBuffer()
      this.updateItems()
    },
    updateItems () {
      if (this.bufferedLength > 0) {
        // convert bufferedOffset/bufferedLength to pagination with fixed hitsPerPage so we don't reload the same item from Algolia
        const firstPage = Math.floor(this.bufferedOffset / this.searchStore.resultsPerPage)
        const lastPage = Math.floor(Math.min(this.bufferedOffset + this.bufferedLength - 1, this.total) / this.searchStore.resultsPerPage)

        for (let page = firstPage; page <= lastPage; page++) {
          if (!this.loadedPages.includes(page) && page > 0) {
            this.load(page)
            this.loadedPages.push(page)
          }
        }
      }
    },
    async load (page) {
      // console.log('loading')
      // loading the 2+ pages using searchOnce() because the underling algoliaHelper.search() has its own state and
      // will swallow the "outdated" results if they don't come in order (which may occur if you scroll too fast),
      // hence won't trigger the "result" event.
      // See https://github.com/algolia/algoliasearch-helper-js/blob/55c2e753be2236df91cd33a11a113e9dc4dd3038/src/algoliasearch.helper.js#L1222
      const { content } = await this.searchStore.algoliaHelper.searchOnce({
        page: page,
        hitsPerPage: this.searchStore.resultsPerPage,
        highlightPreTag: '<em>',
        highlightPostTag: '</em>'
      })
      this.fillCache(content.hits, content.page, content.hitsPerPage)
    },
    fillCache (hits, page, hitsPerPage) {
      hits.forEach((hit, index) => {
        const localIndex = page * hitsPerPage + index
        this.items[localIndex].payload = hit
      })
    },
    updateBuffer () {
      // console.log('updateBuffer')

      const visibleItems = this.items.slice(this.bufferedOffset, Math.min(this.bufferedOffset + this.bufferedLength, this.total))
      const itemsToRender = visibleItems.filter(item => !this.buffer.includes(item))
      const freeSlotIndices = this.buffer.reduce((freeSlots, renderedItem, index) => {
        if (!visibleItems.includes(renderedItem)) {
          freeSlots.push(index)
        }
        return freeSlots
      }, [])

      // update the rendering buffer
      const updateCount = Math.max(itemsToRender.length, freeSlotIndices.length)
      for (let i = 0; i < updateCount; i++) {
        const slot = freeSlotIndices.pop()
        const item = itemsToRender.pop()
        if (slot >= 0 && item) {
          // replace
          this.$set(this.buffer, slot, item)
          // console.log('replace')
        } else if (slot >= 0 && !item) {
          // remove the extra free buffer
          this.buffer.splice(slot, 1)
          // console.log('remove')
        } else if (slot === undefined && item) {
          // insert
          this.buffer.push(item)
          // console.log('insert')
        }
      }
    },
    getItemStyle (localIndex) {
      const x = (localIndex % this.columns) * this.itemWidthWithGap
      const y = Math.floor(localIndex / this.columns) * this.itemHeightWithGap
      return {
        transform: `translate(${x}px, ${y}px)`
      }
    },
    updateMeasurement () {
      // console.log('updateMeasurement')
      this.updateHeightAboveWindow()

      this.containerHeight = window.innerHeight
      this.colGap = parseInt(window.getComputedStyle(this.$refs.grid).getPropertyValue('grid-column-gap'))
      this.rowGap = parseInt(window.getComputedStyle(this.$refs.grid).getPropertyValue('grid-row-gap'))
      const gridCols = window.getComputedStyle(this.$refs.grid).getPropertyValue('grid-template-columns').split(' ')
      this.columns = gridCols.length

      this.itemHeightWithGap = this.$refs.isPlaceholder.$el.offsetHeight + this.rowGap
      this.itemWidthWithGap = this.$refs.isPlaceholder.$el.offsetWidth + this.colGap
    }
  },
  filters: {
    price (value) {
      return value * 100
    },
    date (value) {
      return new Date(value)
    }
  }
}
</script>

<style>
.all-results {
  min-height : 100%;
  overflow   : hidden;
}

.all-results__grid {
  display         : grid;
  /* @formatter:off */
    grid-template : "item" auto
                    /1fr;
    /* @formatter:on */
  grid-gap        : 20px;
  justify-items   : stretch;
  align-items     : start;
}

@media (--mobile-l-max) {
  .all-results__grid.all-results__grid--2columns {
    /* @formatter:off */
      grid-template : "item  .  " auto
                      /1fr   1fr;
      /* @formatter:on */
  }
}

@media (--tablet) {
  .all-results__grid {
    grid-gap        : 25px;
    /* @formatter:off */
      grid-template : "item .  " auto
                      /1fr  1fr;
    /* @formatter:on */
  }
}

@media (--tablet-l) {
  .all-results__grid {
    /* @formatter:off */
    grid-template : "item  .     .  " auto
                    /1fr   1fr   1fr;
    /* @formatter:on */
  }
}

@media (--desktop-s) {
  .all-results__grid {
    /* @formatter:off */
    grid-template : "item  .     .     .  " auto
                    /1fr   1fr   1fr   1fr;
    /* @formatter:on */
  }
}

@media (--desktop) {
  .all-results__grid {
    /* @formatter:off */
    grid-template : "item  .     .     .     .  " auto
                    /1fr   1fr   1fr   1fr   1fr;
    /* @formatter:on */
  }
}

@media (--desktop-l) {
  .all-results__grid {
    /* @formatter:off */
    grid-template : "item  .     .     .     .     .  " auto
                    /1fr   1fr   1fr   1fr   1fr   1fr;
    /* @formatter:on */
  }
}

.all-results__item {
  grid-area   : item;
  will-change : transform;
}

.all-results__item.all-results__item--dummy {
  pointer-events : none;
  opacity        : 0;
  visibility     : hidden;
  z-index        : -1;
  justify-self   : stretch;
  align-self     : stretch;
}
</style>
