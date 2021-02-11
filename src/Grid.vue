<template>
  <div
    v-if="items.length > 0"
    ref="root"
    :class="$style.root"
    :style="{ height: `${contentHeight}px` }"
  >
    <div ref="grid" v-bind="$attrs">
      <div :class="$style.probe" ref="probe">Probe</div>

      <template v-for="(internalItem, index) in buffer" :key="index">
        <slot
          :item="internalItem.value"
          :index="internalItem.index"
          :style="internalItem.style"
        />
      </template>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, onMounted, PropType, ref, toRefs } from "vue";
import {
  combineLatest,
  fromEvent,
  fromEventPattern,
  merge,
  Observable,
} from "rxjs";
import { map, scan, startWith } from "rxjs/operators";
import { from, useObservable } from "@vueuse/rxjs";
import {
  __,
  concat,
  difference,
  identity,
  ifElse,
  map as ramdaMap,
  min,
  pipe,
  without,
  zip,
} from "ramda";
import { mapIndexed } from "ramda-adjunct";

declare interface InternalItem {
  index: number;
  value: any;
  style?: { transform: string };
}

export default defineComponent({
  name: "Grid",
  inheritAttrs: false,
  props: {
    items: {
      type: Array as PropType<any[]>,
      required: true,
    },
  },
  setup(props) {
    // region: rendering trigger streams

    // todo: on css changes

    // on items change
    const { items } = toRefs(props);
    const items$: Observable<InternalItem[]> = from(items).pipe(
      startWith(items.value as InternalItem[]),
      map(mapIndexed((value, index) => ({ value, index })))
    );

    // on resize
    const resize$ = fromEvent<UIEvent>(window, "resize", { passive: true });

    // on scroll
    const scroll$ = fromEvent<UIEvent>(window, "scroll", {
      passive: true,
      capture: true,
    });

    // on mounted
    const mount$ = fromEventPattern<undefined>(onMounted);
    // endregion

    // region: measure on the visual grid
    const root = ref<HTMLElement>(document.createElement("div"));
    const grid = ref<HTMLElement>(document.createElement("div"));
    const probe = ref<HTMLElement>(document.createElement("div"));

    const heightAboveWindow$: Observable<number> = merge(
      mount$,
      resize$,
      scroll$
    ).pipe(
      map(() => root.value.getBoundingClientRect().top),
      map(pipe(min<number>(0), Math.abs))
    );

    const resizeMeasure$: Observable<{
      rowGap: number;
      columns: number;
      itemHeightWithGap: number;
      itemWidthWithGap: number;
    }> = merge(mount$, resize$).pipe(
      map(() => {
        const computedStyle = window.getComputedStyle(grid.value);
        return {
          colGap: parseInt(computedStyle.getPropertyValue("grid-column-gap")),
          rowGap: parseInt(computedStyle.getPropertyValue("grid-row-gap")),
          columns: computedStyle
            .getPropertyValue("grid-template-columns")
            .split(" ").length,
          itemHeight: probe.value.offsetHeight,
          itemWidth: probe.value.offsetWidth,
        };
      }),
      map(({ colGap, rowGap, columns, itemHeight, itemWidth }) => ({
        rowGap,
        columns,
        itemHeightWithGap: itemHeight + rowGap,
        itemWidthWithGap: itemWidth + colGap,
      }))
    );
    // endregion

    const contentHeight$: Observable<number> = combineLatest([
      resizeMeasure$,
      items$,
    ]).pipe(
      map(
        ([{ columns, rowGap, itemHeightWithGap }, items]) =>
          itemHeightWithGap * Math.ceil(items.length / columns) - rowGap
      )
    );

    const buffer$: Observable<InternalItem[]> = combineLatest([
      heightAboveWindow$,
      resizeMeasure$,
      items$,
    ]).pipe(
      map(
        ([
          heightAboveWindow,
          { columns, rowGap, itemWidthWithGap, itemHeightWithGap },
          items,
        ]) => {
          const rowsInView =
            itemHeightWithGap &&
            Math.ceil((window.innerHeight + rowGap) / itemHeightWithGap) + 1;
          const length = rowsInView * columns;

          const rowsBeforeView =
            itemHeightWithGap &&
            Math.floor((heightAboveWindow + rowGap) / itemHeightWithGap);
          const offset = rowsBeforeView * columns;

          const bufferedOffset = Math.max(offset - Math.floor(length / 2), 0);
          const bufferedLength = Math.min(length * 2, items.length);

          // visible items
          return items
            .slice(
              bufferedOffset,
              Math.min(bufferedOffset + bufferedLength, items.length)
            )
            .map((item) => {
              const x = (item.index % columns) * itemWidthWithGap;
              const y = Math.floor(item.index / columns) * itemHeightWithGap;

              return {
                ...item,
                style: { transform: `translate(${x}px, ${y}px)` },
              };
            });
        }
      ),
      scan((buffer: InternalItem[], visibleItems: InternalItem[]) => {
        const itemsToAdd = difference(visibleItems, buffer);
        const itemsFreeToUse = difference(buffer, visibleItems);

        const replaceMap = new Map(zip(itemsFreeToUse, itemsToAdd));
        const itemsToBeReplaced = [...replaceMap.keys()];
        const itemsToReplaceWith = [...replaceMap.values()];

        const itemsToDelete = difference(itemsFreeToUse, itemsToBeReplaced);
        const itemsToAppend = difference(itemsToAdd, itemsToReplaceWith);

        return pipe(
          without(itemsToDelete),
          ramdaMap(
            ifElse(
              replaceMap.has.bind(replaceMap),
              replaceMap.get.bind(replaceMap),
              identity
            )
          ),
          concat(__, itemsToAppend)
        )(buffer);
      }, [])
    );

    return {
      // refs
      root,
      grid,
      probe,

      // data to render
      buffer: useObservable(buffer$),
      contentHeight: useObservable(contentHeight$),
    };
  },
});
</script>

<style module>
.root {
  min-height: 100%;
  overflow: hidden;
}

.probe {
  /*opacity: 0;*/
  /*visibility: hidden;*/
  grid-area: 1/1;
  pointer-events: none;
  z-index: -1;
  place-self: stretch;
  background-color: lightgray;
}
</style>
