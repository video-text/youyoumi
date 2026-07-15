import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const sourcePath = path.resolve(root, "..", "data", "reports", "dashboard_data.json");
const outputPath = path.resolve(root, "public", "data", "product-analysis.json");

const source = JSON.parse(await readFile(sourcePath, "utf8"));

const excludedPools = new Set(["fashion_basics"]);
const womenswearPattern = /women'?s\s+(?:clothing|dress|top|bottom|suit|underwear|lingerie|skirt|blouse)|womenswear|女装|连衣裙|女式(?:上衣|裤|裙)|女士服装/i;
const liquidPattern = /\b(?:liquid|serum|oil|lotion|spray|perfume|fragrance|toner|shampoo|conditioner|essence|juice|drink|beverage)\b|液体|精华液|精油|香水|喷雾|洗发水|护发素|饮料|果汁|水剂/i;

const asNumber = (value) => {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
};

const textForFilter = (product) => [
  product.product_concept,
  product.product_name_original,
  product.product_name,
  product.pool_name,
].filter(Boolean).join(" ");

const isEligibleProduct = (product) => {
  if (excludedPools.has(product.pool_key)) return false;
  const text = textForFilter(product);
  return !womenswearPattern.test(text) && !liquidPattern.test(text);
};

const productFields = [
  "product_id", "product_concept", "product_concept_key", "product_name_original",
  "source_region", "pool_key", "pool_name", "source_rank", "seller_id",
  "category_id", "category_l2_id", "category_l3_id", "min_price", "max_price",
  "spu_avg_price", "product_rating", "review_count", "total_sale_cnt",
  "total_sale_7d_cnt", "total_sale_15d_cnt", "total_sale_30d_cnt",
  "total_sale_gmv_amt", "total_sale_gmv_7d_amt", "total_sale_gmv_30d_amt",
  "total_ifl_cnt", "total_video_cnt", "total_live_cnt",
  "trend_sale_last_7d_cnt", "trend_sale_previous_7d_cnt", "trend_sale_growth_rate",
  "ifl_sample_count", "ifl_followers_in_sample", "ifl_views_in_sample",
  "influencer_sale_in_sample", "influencer_gmv_in_sample", "top_influencer_name",
  "top_influencer_product_sales", "video_sample_count", "video_views_in_sample",
  "video_likes_in_sample", "video_comments_in_sample", "video_sale_in_sample",
  "top_video_views", "avg_video_views", "top_video_id", "live_sample_count",
  "top_live_views", "content_tag", "distribution_type", "concept_total_sale_cnt",
  "concept_total_sale_30d_cnt", "concept_max_total_sale_cnt",
  "concept_max_total_sale_30d_cnt", "concept_total_ifl_cnt",
  "concept_total_video_cnt", "concept_total_live_cnt", "concept_total_review_count",
  "concept_listing_count", "concept_market_count", "concept_markets", "br_search_keyword",
  "br_supply_verified", "br_raw_search_result_count", "br_matched_supply_count",
  "br_unverified_cached_supply_count", "br_supply_with_sales", "br_result_cap_reached",
  "br_matched_total_sale_cnt", "br_matched_total_sale_30d_cnt", "br_matched_total_ifl_cnt",
  "br_matched_total_video_cnt", "br_matched_total_live_cnt", "br_matched_total_review_count",
  "pool_br_sale_7d", "pool_br_sale_30d", "pool_br_product_count",
  "pool_br_creator_count", "pool_br_growth_7d_vs_30d", "demand_level",
  "competition_level", "competition_evidence", "conclusion", "recommended_action",
  "association_stats", "brazil_top_matches",
];

const products = source.products
  .filter(isEligibleProduct)
  .map((product) => Object.fromEntries(productFields.map((field) => [field, product[field] ?? null])))
  .sort((a, b) => asNumber(b.total_sale_30d_cnt) - asNumber(a.total_sale_30d_cnt));

const conceptMap = new Map();
for (const product of products) {
  const key = product.product_concept_key || product.product_concept || product.product_id;
  const current = conceptMap.get(key);
  if (!current) {
    conceptMap.set(key, {
      concept_key: key,
      product_concept: product.product_concept || "未归一产品",
      pool_key: product.pool_key,
      pool_name: product.pool_name,
      listing_count: asNumber(product.concept_listing_count) || 1,
      market_count: asNumber(product.concept_market_count) || 1,
      markets: product.concept_markets || product.source_region,
      total_sale: asNumber(product.concept_total_sale_cnt),
      sale_30d: asNumber(product.concept_total_sale_30d_cnt),
      max_listing_sale: asNumber(product.concept_max_total_sale_cnt),
      max_listing_sale_30d: asNumber(product.concept_max_total_sale_30d_cnt),
      creators: asNumber(product.concept_total_ifl_cnt),
      videos: asNumber(product.concept_total_video_cnt),
      lives: asNumber(product.concept_total_live_cnt),
      reviews: asNumber(product.concept_total_review_count),
      conclusion: product.conclusion,
      recommended_action: product.recommended_action,
      product_ids: [product.product_id],
    });
  } else {
    current.product_ids.push(product.product_id);
    current.listing_count = Math.max(current.listing_count, asNumber(product.concept_listing_count), current.product_ids.length);
    current.market_count = Math.max(current.market_count, asNumber(product.concept_market_count));
  }
}

const concepts = [...conceptMap.values()].sort((a, b) => b.sale_30d - a.sale_30d);
const allowedPool = (row) => !excludedPools.has(row.pool_key);
const categoryLandscape = source.category_landscape.filter(allowedPool);
const brCategories = source.br_categories.filter((row) => !(row.pools || []).some((pool) => excludedPools.has(pool)));
const poolSummaryFields = [
  "source_region", "pool_key", "pool_name", "sample_count", "sample_total_sale_cnt",
  "sample_total_sale_30d_cnt", "sample_median_sale_30d_cnt", "sample_total_ifl_cnt",
  "sample_total_video_cnt", "low_competition_test_count", "small_test_count",
  "differentiate_count", "red_ocean_count", "low_sales_count", "br_supply_pending_count",
  "pool_br_sale_7d", "pool_br_sale_30d", "pool_br_product_count", "pool_br_creator_count",
];
const poolSummaries = source.pool_summaries
  .filter(allowedPool)
  .map((row) => Object.fromEntries(poolSummaryFields.map((field) => [field, row[field] ?? null])));
const configuredMarkets = [...new Set([...(source.methodology?.signal_markets || []), source.methodology?.validation_market].filter(Boolean))];

const marketCoverage = configuredMarkets.map((region) => {
  const marketProducts = products.filter((product) => product.source_region === region);
  const marketCategories = categoryLandscape.filter((row) => row.region === region);
  return {
    region,
    role: region === source.methodology?.validation_market ? "validation" : "signal",
    sample_rows: marketProducts.length,
    concept_count: new Set(marketProducts.map((product) => product.product_concept_key || product.product_concept)).size,
    sample_sale_30d: marketProducts.reduce((sum, product) => sum + asNumber(product.total_sale_30d_cnt), 0),
    sample_creators: marketProducts.reduce((sum, product) => sum + asNumber(product.total_ifl_cnt), 0),
    category_sale_30d: marketCategories.reduce((sum, row) => sum + asNumber(row.total_sale_30d_cnt), 0),
    category_products: marketCategories.reduce((sum, row) => sum + asNumber(row.total_product_cnt), 0),
    category_creators: marketCategories.reduce((sum, row) => sum + asNumber(row.total_ifl_cnt), 0),
    status: marketProducts.length || marketCategories.length ? "available" : "pending",
  };
});

const conclusions = Object.fromEntries(
  [...new Set(products.map((product) => product.conclusion || "未分类"))]
    .map((conclusion) => [conclusion, products.filter((product) => (product.conclusion || "未分类") === conclusion).length]),
);

const payload = {
  meta: {
    title: "TikTok Shop 爆品证据分析",
    generated_at: source.meta?.generated_at,
    source: "EchoTik API report snapshot",
    total_api_calls: source.meta?.total_api_calls,
    product_count: products.length,
    concept_count: concepts.length,
    signal_markets: source.methodology?.signal_markets || [],
    validation_market: source.methodology?.validation_market || "BR",
    exclusions: ["女装赛道", "液体商品"],
  },
  summary: {
    total_sale_30d: products.reduce((sum, product) => sum + asNumber(product.total_sale_30d_cnt), 0),
    total_sale: products.reduce((sum, product) => sum + asNumber(product.total_sale_cnt), 0),
    total_creators: products.reduce((sum, product) => sum + asNumber(product.total_ifl_cnt), 0),
    total_videos: products.reduce((sum, product) => sum + asNumber(product.total_video_cnt), 0),
    total_lives: products.reduce((sum, product) => sum + asNumber(product.total_live_cnt), 0),
    conclusions,
  },
  market_coverage: marketCoverage,
  category_landscape: categoryLandscape,
  br_categories: brCategories,
  pool_summaries: poolSummaries,
  concepts,
  products,
  methodology: source.methodology,
};

await mkdir(path.dirname(outputPath), { recursive: true });
await writeFile(outputPath, `${JSON.stringify(payload)}\n`, "utf8");

console.log(`Synced ${products.length} products and ${concepts.length} concepts to ${outputPath}`);
