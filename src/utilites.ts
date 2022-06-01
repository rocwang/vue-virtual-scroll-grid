import {
  animationFrameScheduler,
  filter,
  fromEvent,
  fromEventPattern,
  mergeAll,
  Observable,
  pluck,
  scheduled,
} from "rxjs";
import { Ref, ref, watchEffect } from "vue";
import { partial, pipe, unary } from "ramda";
import {
  MaybeElementRef,
  ResizeObserverEntry,
  tryOnUnmounted,
  unrefElement,
  useResizeObserver,
} from "@vueuse/core";

export function fromProp<T, U extends keyof T>(
  props: T,
  propName: U
): Observable<T[U]> {
  return new Observable((subscriber) =>
    watchEffect(() => subscriber.next(props[propName]))
  );
}

export function fromResizeObserver<T extends keyof ResizeObserverEntry>(
  elRef: MaybeElementRef,
  pluckTarget: T
): Observable<ResizeObserverEntry[T]> {
  return scheduled(
    fromEventPattern<ResizeObserverEntry[]>(
      pipe(unary, partial(useResizeObserver, [elRef]))
    ),
    animationFrameScheduler
  ).pipe(mergeAll(), pluck<ResizeObserverEntry, T>(pluckTarget));
}

export function fromWindowScroll(elRef: MaybeElementRef): Observable<Element> {
  return fromEvent(
    window,
    "scroll",
    {
      passive: true,
      capture: true,
    },
    () => unrefElement(elRef)
  ).pipe(
    filter<Element | undefined | null, Element>((el): el is Element =>
      Boolean(el)
    )
  );
}

export function useObservable<H>(observable: Observable<H>): Readonly<Ref<H>> {
  const valueRef = ref<H>();
  const subscription = observable.subscribe((val) => (valueRef.value = val));

  tryOnUnmounted(() => subscription.unsubscribe());

  return valueRef as Readonly<Ref<H>>;
}

interface ScrollParents {
  vertical: Element;
  horizontal: Element;
}

export function getScrollParents(
  element: Element,
  includeHidden: boolean = false
): ScrollParents {
  const style = getComputedStyle(element);

  if (style.position === "fixed") {
    return {
      vertical: document.body,
      horizontal: document.body,
    };
  }

  const excludeStaticParent = style.position === "absolute";
  const overflowRegex = includeHidden
    ? /(auto|scroll|hidden)/
    : /(auto|scroll)/;

  let vertical;
  let horizontal;

  for (
    let parent: Element | null = element;
    (parent = parent.parentElement);

  ) {
    const parentStyle = getComputedStyle(parent);

    if (excludeStaticParent && parentStyle.position === "static") continue;

    if (!horizontal && overflowRegex.test(parentStyle.overflowX)) {
      horizontal = parent;
      if (vertical) return { vertical, horizontal };
    }

    if (!vertical && overflowRegex.test(parentStyle.overflowY)) {
      vertical = parent;
      if (horizontal) return { vertical, horizontal };
    }
  }

  const fallback = document.scrollingElement || document.documentElement;
  return {
    vertical: vertical ?? fallback,
    horizontal: horizontal ?? fallback,
  };
}
