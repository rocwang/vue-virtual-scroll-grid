<template>
  <div
    v-show="length > 0"
    ref="rootRef"
    :style="{
      height: `${contentHeight}px`,
      placeContent: 'start',
    }"
  >
    <div
      :style="{
        opacity: 0,
        visibility: 'hidden',
        gridArea: '1/1',
        pointerEvents: 'none',
        zIndex: -1,
        placeSelf: 'stretch',
      }"
      ref="probeRef"
    >
      <slot name="probe" />
    </div>

    <template v-for="(internalItem, index) in buffer" :key="index">
      <slot
        v-if="internalItem.value === undefined"
        name="placeholder"
        :index="internalItem.index"
        :style="internalItem.style"
      />
      <slot
        v-else
        name="default"
        :item="internalItem.value"
        :index="internalItem.index"
        :style="internalItem.style"
      />
    </template>
  </div>
</template>

<script lang="ts">
import { defineComponent, onMounted, PropType, ref, watchEffect } from "vue";
import {
  combineLatest,
  fromEvent,
  fromEventPattern,
  merge,
  Observable,
  range,
} from "rxjs";
import {
  distinct,
  distinctUntilChanged,
  map,
  mergeAll,
  mergeMap,
  pluck,
  scan,
  share,
  shareReplay,
  switchMap,
  withLatestFrom,
} from "rxjs/operators";
import { useObservable } from "@vueuse/rxjs";
import {
  __,
  concat,
  difference,
  equals,
  gt,
  identity,
  ifElse,
  insertAll,
  map as ramdaMap,
  min,
  pipe,
  prop,
  remove,
  slice,
  unary,
  without,
  zip,
} from "ramda";
import { concatRight, mapIndexed, sliceTo } from "ramda-adjunct";

interface InternalItem {
  index: number;
  value: unknown | undefined;
  style?: { transform: string; gridArea: string };
}

export default defineComponent({
  name: "Grid",
  props: {
    // The number of items in the list.
    length: {
      type: Number as PropType<number>,
      required: true,
      validator: (value: number) => Number.isInteger(value) && value >= 0,
    },
    // The callback that returns a page of items as a promise.
    pageProvider: {
      type: Function as PropType<
        (pageNumber: number, pageSize: number) => Promise<unknown[]>
      >,
      required: true,
    },
    // The number of items in a page from the item provider (e.g. a backend API).
    pageSize: {
      type: Number as PropType<number>,
      required: true,
      validator: (value: number) => Number.isInteger(value) && value >= 1,
    },
  },
  setup(props) {
    const length$ = new Observable<number>((subscriber) =>
      watchEffect(() => subscriber.next(props.length))
    );

    const pageSize$ = new Observable<number>((subscriber) =>
      watchEffect(() => subscriber.next(props.pageSize))
    );

    const pageProvider$ = new Observable<
      (pageNumber: number, pageSize: number) => Promise<unknown[]>
    >((subscriber) => watchEffect(() => subscriber.next(props.pageProvider)));

    // region: rendering trigger streams

    // on mounted
    const rootRef = ref<HTMLElement>(document.createElement("div"));
    const probeRef = ref<HTMLElement>(document.createElement("div"));
    const mounted$: Observable<{
      root: HTMLElement;
      probe: HTMLElement;
    }> = fromEventPattern<undefined>(onMounted).pipe(
      share(),
      map(() => ({ root: rootRef.value, probe: probeRef.value }))
    );

    const scroll$: Observable<HTMLElement> = combineLatest([
      mounted$,
      fromEvent<UIEvent>(window, "scroll", {
        passive: true,
        capture: true,
      }),
    ]).pipe(map(([{ root }]) => root));

    const rootResize$: Observable<Element> = mounted$.pipe(
      mergeMap(({ root }) =>
        fromEventPattern<ResizeObserverEntry[]>(
          (handler): ResizeObserver => {
            const observer = new ResizeObserver(unary(handler));
            observer.observe(root);

            return observer;
          },
          (handler, observer: ResizeObserver) =>
            root && observer.unobserve(root)
        )
      ),
      mergeAll(),
      pluck<ResizeObserverEntry, "target">("target")
    );

    const itemResize$: Observable<{
      itemHeight: number;
      itemWidth: number;
    }> = mounted$.pipe(
      mergeMap(({ probe }) =>
        fromEventPattern<ResizeObserverEntry[]>(
          (handler): ResizeObserver => {
            const observer = new ResizeObserver(unary(handler));
            observer.observe(probe);

            return observer;
          },
          (handler, observer: ResizeObserver) =>
            probe && observer.unobserve(probe)
        )
      ),
      mergeAll(),
      map(({ contentRect }) => ({
        itemHeight: contentRect.height,
        itemWidth: contentRect.width,
      }))
    );
    // endregion

    // region: measure on the visual grid
    const heightAboveWindow$: Observable<number> = merge(
      rootResize$,
      scroll$
    ).pipe(
      map((rootEl) => rootEl.getBoundingClientRect().top),
      distinctUntilChanged(),
      map(pipe(min<number>(0), Math.abs))
    );

    const resizeMeasure$: Observable<{
      rowGap: number;
      columns: number;
      itemHeightWithGap: number;
      itemWidthWithGap: number;
    }> = combineLatest([rootResize$, itemResize$]).pipe(
      map(([rootEl, { itemHeight, itemWidth }]) => {
        const computedStyle = window.getComputedStyle(rootEl);
        const colGap =
          parseInt(computedStyle.getPropertyValue("grid-column-gap")) || 0;
        const rowGap =
          parseInt(computedStyle.getPropertyValue("grid-row-gap")) || 0;

        return {
          rowGap,
          columns: computedStyle
            .getPropertyValue("grid-template-columns")
            .split(" ").length,
          itemHeightWithGap: itemHeight + rowGap,
          itemWidthWithGap: itemWidth + colGap,
        };
      }),
      distinctUntilChanged<{
        rowGap: number;
        columns: number;
        itemHeightWithGap: number;
        itemWidthWithGap: number;
      }>(equals)
    );
    // endregion

    const contentHeight$: Observable<number> = combineLatest([
      resizeMeasure$,
      length$,
    ]).pipe(
      map(
        ([{ columns, rowGap, itemHeightWithGap }, length]) =>
          itemHeightWithGap * Math.ceil(length / columns) - rowGap
      )
    );

    const bufferMeta$: Observable<{
      columns: number;
      bufferedOffset: number;
      bufferedLength: number;
      itemWidthWithGap: number;
      itemHeightWithGap: number;
    }> = combineLatest([heightAboveWindow$, resizeMeasure$]).pipe(
      map(
        ([
          heightAboveWindow,
          { columns, rowGap, itemHeightWithGap, itemWidthWithGap },
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
          const bufferedLength = Math.min(length * 2);

          return {
            columns,
            bufferedOffset,
            bufferedLength,
            itemWidthWithGap,
            itemHeightWithGap,
          };
        }
      ),
      distinctUntilChanged<{
        columns: number;
        bufferedOffset: number;
        bufferedLength: number;
        itemWidthWithGap: number;
        itemHeightWithGap: number;
      }>(equals)
    );

    const pageNumber$: Observable<number> = combineLatest([
      bufferMeta$,
      length$,
      pageSize$,
      pageProvider$,
    ]).pipe(
      mergeMap(([{ bufferedOffset, bufferedLength }, length, pageSize]) => {
        const startPage = Math.floor(bufferedOffset / pageSize);
        const endPage = Math.ceil(
          Math.min(bufferedOffset + bufferedLength, length) / pageSize
        );
        const numberOfPages = endPage - startPage;

        return range(startPage, numberOfPages);
      }),
      distinct(identity, merge(pageSize$, pageProvider$))
    );

    const itemsByPage$: Observable<{
      pageNumber: number;
      items: unknown[];
    }> = pageNumber$.pipe(
      withLatestFrom(pageSize$, pageProvider$),
      mergeMap(([pageNumber, pageSize, pageProvider]) =>
        pageProvider(pageNumber, pageSize).then((items) => ({
          pageNumber,
          items,
        }))
      ),
      shareReplay(1)
    );

    const replayLength$ = length$.pipe(shareReplay(1));

    const allItems$: Observable<unknown[]> = pageProvider$.pipe(
      switchMap(() =>
        combineLatest([itemsByPage$, replayLength$]).pipe(
          scan(
            (allItems: unknown[], [{ pageNumber, items }, length]) =>
              pipe(
                ifElse(
                  pipe(prop("length"), gt(length)),
                  concatRight(
                    new Array(Math.max(length - allItems.length, 0)).fill(
                      undefined
                    )
                  ),
                  sliceTo(length)
                ),
                remove(pageNumber * items.length, items.length),
                insertAll(pageNumber * items.length, items)
              )(allItems),
            []
          )
        )
      )
    );

    const visibleItems$: Observable<InternalItem[]> = combineLatest([
      bufferMeta$,
      allItems$,
    ]).pipe(
      map(
        ([
          {
            columns,
            bufferedOffset,
            bufferedLength,
            itemWidthWithGap,
            itemHeightWithGap,
          },
          allItems,
        ]) =>
          pipe(
            slice(bufferedOffset, bufferedOffset + bufferedLength),
            mapIndexed((value, localIndex) => {
              const index = bufferedOffset + localIndex;
              const x = (index % columns) * itemWidthWithGap;
              const y = Math.floor(index / columns) * itemHeightWithGap;

              return {
                index,
                value,
                style: {
                  gridArea: "1/1",
                  transform: `translate(${x}px, ${y}px)`,
                },
              } as InternalItem;
            })
          )(allItems)
      )
    );

    const buffer$: Observable<InternalItem[]> = visibleItems$.pipe(
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
      rootRef,
      probeRef,

      // data to render
      buffer: useObservable(buffer$),
      contentHeight: useObservable(contentHeight$),
    };
  },
});
</script>
