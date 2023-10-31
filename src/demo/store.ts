import { computed, ref } from "vue";
import algoliasearch from "algoliasearch";
import { curry, prop } from "ramda";

export const length = ref<number>(1000);
export const pageSize = ref<number>(40);
export const scrollTo = ref<number | undefined>(undefined);
export const respectScrollToOnResize = ref<boolean>(false);

export type ScrollBehavior = "smooth" | "auto";
export const scrollBehavior = ref<ScrollBehavior>("smooth");

export type Collection = "" | "all-mens" | "womens-view-all";
export const collection = ref<Collection>("");

export type ScrollMode = "vertical" | "horizontal";
export const scrollMode = ref<ScrollMode>("vertical");

export const generalPageProvider = curry(
  (
    collection: Collection,
    pageNumber: number,
    pageSize: number,
  ): Promise<unknown[]> =>
    algoliasearch(
      <string>import.meta.env.VITE_APP_ID,
      <string>import.meta.env.VITE_SEARCH_ONLY_API_KEY,
    )
      .initIndex("shopify_products")
      .search("", {
        distinct: true,
        hitsPerPage: pageSize,
        page: pageNumber,
        facetFilters:
          collection === "" ? undefined : [`collections:${collection}`],
      })
      .then(prop("hits")),
);

export const pageProvider = computed(() =>
  generalPageProvider(collection.value),
);
