"use strict";

(() => {
  const numberFormatter = new Intl.NumberFormat("zh-CN");
  const decimalFormatter = new Intl.NumberFormat("zh-CN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  const compactFormatter = new Intl.NumberFormat("zh-CN", {
    notation: "compact",
    maximumFractionDigits: 1,
  });

  const poolLabels = {
    beauty: "美妆个护（非液体）",
    home_kitchen: "家居厨房",
    electronics_accessories: "电子配件",
  };

  let report = null;
  const charts = {};
  const chartColors = {
    teal: "#0f9e95",
    cyan: "#25d4c6",
    blue: "#4d78e6",
    amber: "#e6a329",
    rose: "#e65d6c",
    violet: "#835ad8",
    gray: "#91a2ad",
    ink: "#163247",
  };

  const byId = (id) => document.getElementById(id);
  const asNumber = (value) => {
    const number = Number(value ?? 0);
    return Number.isFinite(number) ? number : 0;
  };
  const hasValue = (value) => value !== null && value !== undefined && value !== "";
  const fmt = (value) => hasValue(value) ? numberFormatter.format(asNumber(value)) : "—";
  const fmtDecimal = (value) => hasValue(value) ? decimalFormatter.format(asNumber(value)) : "—";
  const fmtPercent = (value) => hasValue(value) ? decimalFormatter.format(asNumber(value) * 100) + "%" : "—";
  const escapeHtml = (value) => String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
  const text = (value) => hasValue(value) ? escapeHtml(value) : "—";
  const boolText = (value) => {
    if (!hasValue(value)) return "—";
    return value === true || value === "True" || value === "true" ? "是" : "否";
  };
  const poolLabel = (key, fallback) => poolLabels[key] || fallback || key || "未分类";

  const decisionClass = (conclusion) => {
    const value = String(conclusion || "");
    if (value.includes("红海")) return "decision-red";
    if (value.includes("待") || value.includes("重抓")) return "decision-pending";
    if (value.includes("不足") || value.includes("观察")) return "decision-low";
    return "decision-good";
  };

  const decisionBadge = (conclusion) => (
    '<span class="decision-badge ' + decisionClass(conclusion) + '">' +
    text(conclusion || "未分类") +
    "</span>"
  );

  const fillSelect = (select, values, labeler = (value) => value) => {
    values.forEach((value) => select?.append(new Option(labeler(value), value)));
  };

  const sumField = (products, field) => products.reduce((sum, product) => sum + asNumber(product[field]), 0);
  const shortLabel = (value, max = 18) => {
    const label = String(value || "未命名");
    return label.length > max ? label.slice(0, max) + "…" : label;
  };
  const signalMarkets = () => report.meta.signal_markets.filter(
    (market) => report.products.some((product) => product.source_region === market)
  );
  const productsForMarket = (market) => report.products.filter((product) => product.source_region === market);
  const productsForCell = (market, pool) => report.products.filter(
    (product) => product.source_region === market && product.pool_key === pool
  );

  function renderDataTable(targetId, headers, rows) {
    byId(targetId).innerHTML =
      '<table class="chart-data-table"><thead><tr>' +
      headers.map((header) => "<th>" + escapeHtml(header) + "</th>").join("") +
      "</tr></thead><tbody>" +
      rows.map((row) => "<tr>" + row.map((cell) => "<td>" + cell + "</td>").join("") + "</tr>").join("") +
      "</tbody></table>";
  }

  function createChart(id, config) {
    const canvas = byId(id);
    if (!canvas || !window.Chart) return null;
    charts[id]?.destroy();
    charts[id] = new window.Chart(canvas, config);
    return charts[id];
  }

  function cartesianOptions({ stacked = false, secondAxis = false, logarithmic = false } = {}) {
    const scales = {
      x: {
        stacked,
        grid: { display: false },
        ticks: { color: "#687b8b", maxRotation: 35, minRotation: 0 },
      },
      y: {
        stacked,
        type: logarithmic ? "logarithmic" : "linear",
        beginAtZero: !logarithmic,
        grid: { color: "rgba(104, 123, 139, 0.16)" },
        ticks: {
          color: "#687b8b",
          callback: (value) => compactFormatter.format(Number(value)),
        },
      },
    };
    if (secondAxis) {
      scales.y1 = {
        position: "right",
        beginAtZero: true,
        grid: { drawOnChartArea: false },
        ticks: {
          color: "#687b8b",
          callback: (value) => compactFormatter.format(Number(value)),
        },
      };
    }
    return {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: {
          position: "bottom",
          labels: { usePointStyle: true, boxWidth: 8, color: "#526575", padding: 14 },
        },
        tooltip: {
          callbacks: {
            label: (context) => context.dataset.label + "：" + fmt(context.parsed.y ?? context.parsed),
          },
        },
      },
      scales,
    };
  }

  function renderMarketSalesChart() {
    const markets = signalMarkets();
    const rows = markets.map((market) => {
      const products = productsForMarket(market);
      return {
        market,
        products: products.length,
        sale7: sumField(products, "total_sale_7d_cnt"),
        sale15: sumField(products, "total_sale_15d_cnt"),
        sale30: sumField(products, "total_sale_30d_cnt"),
        creators: sumField(products, "total_ifl_cnt"),
        videos: sumField(products, "total_video_cnt"),
        lives: sumField(products, "total_live_cnt"),
      };
    });

    createChart("chart-market-sales", {
      type: "bar",
      data: {
        labels: rows.map((row) => row.market),
        datasets: [
          {
            label: "30天销量",
            data: rows.map((row) => row.sale30),
            backgroundColor: "rgba(15, 158, 149, 0.72)",
            borderColor: chartColors.teal,
            borderWidth: 1,
            borderRadius: 6,
            yAxisID: "y",
          },
          {
            type: "line",
            label: "达人数量",
            data: rows.map((row) => row.creators),
            borderColor: chartColors.amber,
            backgroundColor: chartColors.amber,
            pointStyle: "rectRot",
            pointRadius: 4,
            borderWidth: 2,
            tension: 0.28,
            yAxisID: "y1",
          },
        ],
      },
      options: cartesianOptions({ secondAxis: true }),
    });

    renderDataTable("market-sales-table",
      ["市场", "商品", "30天销量", "达人", "视频", "直播"],
      rows.map((row) => [
        text(row.market), fmt(row.products), fmt(row.sale30), fmt(row.creators), fmt(row.videos), fmt(row.lives),
      ])
    );
    return rows;
  }

  function renderPeriodSalesChart(marketRows) {
    const periods = [
      { label: "7天", field: "sale7" },
      { label: "15天", field: "sale15" },
      { label: "30天", field: "sale30" },
    ];
    const colors = [chartColors.teal, chartColors.blue, chartColors.amber, chartColors.rose, chartColors.violet];

    createChart("chart-period-sales", {
      type: "line",
      data: {
        labels: periods.map((period) => period.label),
        datasets: marketRows.map((row, index) => ({
          label: row.market,
          data: periods.map((period) => row[period.field]),
          borderColor: colors[index % colors.length],
          backgroundColor: colors[index % colors.length],
          pointRadius: 4,
          pointHoverRadius: 6,
          borderWidth: 2,
          tension: 0.25,
        })),
      },
      options: cartesianOptions(),
    });

    renderDataTable("period-sales-table",
      ["市场", "7天销量", "15天销量", "30天销量"],
      marketRows.map((row) => [text(row.market), fmt(row.sale7), fmt(row.sale15), fmt(row.sale30)])
    );
  }

  function renderConclusionChart() {
    const entries = Object.entries(report.summary.conclusions);
    const conclusionColors = entries.map(([conclusion]) => {
      if (conclusion.includes("值得测款")) return chartColors.teal;
      if (conclusion.includes("小批量")) return chartColors.cyan;
      if (conclusion.includes("差异化")) return chartColors.amber;
      if (conclusion.includes("红海")) return chartColors.rose;
      return chartColors.gray;
    });

    createChart("chart-conclusions", {
      type: "doughnut",
      data: {
        labels: entries.map(([label]) => label),
        datasets: [{
          data: entries.map(([, value]) => value),
          backgroundColor: conclusionColors,
          borderColor: "#f8fafb",
          borderWidth: 3,
          hoverOffset: 7,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "58%",
        plugins: {
          legend: {
            position: "bottom",
            labels: { usePointStyle: true, boxWidth: 8, color: "#526575", padding: 11 },
          },
          tooltip: {
            callbacks: {
              label: (context) => context.label + "：" + fmt(context.raw) + " 个商品",
            },
          },
        },
      },
    });
  }

  function renderDistributionChart() {
    const counts = new Map();
    report.products.forEach((product) => {
      const label = product.distribution_type || "未分类";
      counts.set(label, (counts.get(label) || 0) + 1);
    });
    const entries = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    const colors = [
      chartColors.teal, chartColors.blue, chartColors.amber,
      chartColors.rose, chartColors.violet, chartColors.gray,
    ];

    createChart("chart-distribution", {
      type: "pie",
      data: {
        labels: entries.map(([label]) => label),
        datasets: [{
          data: entries.map(([, value]) => value),
          backgroundColor: entries.map((_, index) => colors[index % colors.length]),
          borderColor: "#f8fafb",
          borderWidth: 3,
          hoverOffset: 7,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "bottom",
            labels: { usePointStyle: true, boxWidth: 8, color: "#526575", padding: 10 },
          },
          tooltip: {
            callbacks: {
              label: (context) => context.label + "：" + fmt(context.raw) + " 个商品",
            },
          },
        },
      },
    });
  }

  function renderMarketConclusionChart() {
    const markets = signalMarkets();
    const conclusions = Object.keys(report.summary.conclusions);
    const colors = conclusions.map((conclusion) => {
      if (conclusion.includes("值得测款")) return chartColors.teal;
      if (conclusion.includes("小批量")) return chartColors.cyan;
      if (conclusion.includes("差异化")) return chartColors.amber;
      if (conclusion.includes("红海")) return chartColors.rose;
      return chartColors.gray;
    });

    createChart("chart-market-conclusions", {
      type: "bar",
      data: {
        labels: markets,
        datasets: conclusions.map((conclusion, index) => ({
          label: conclusion,
          data: markets.map((market) => report.products.filter(
            (product) => product.source_region === market && product.conclusion === conclusion
          ).length),
          backgroundColor: colors[index],
          borderWidth: 0,
        })),
      },
      options: cartesianOptions({ stacked: true }),
    });
  }

  function renderTopConceptsChart() {
    const concepts = [...report.concepts]
      .sort((a, b) => asNumber(b.sale_30d) - asNumber(a.sale_30d))
      .slice(0, 10);
    const labels = concepts.map((concept) => shortLabel(concept.product_concept, 15));
    const options = cartesianOptions({ secondAxis: true });
    options.indexAxis = "y";
    options.scales.x = options.scales.y;
    options.scales.y = {
      grid: { display: false },
      ticks: { color: "#687b8b" },
    };
    options.scales.x1 = {
      position: "top",
      beginAtZero: true,
      grid: { drawOnChartArea: false },
      ticks: {
        color: "#687b8b",
        callback: (value) => compactFormatter.format(Number(value)),
      },
    };
    delete options.scales.y1;
    options.plugins.tooltip.callbacks.label = (context) => {
      const concept = concepts[context.dataIndex];
      return context.dataset.label + "：" +
        fmt(context.parsed.x) + " · " + concept.product_concept;
    };

    createChart("chart-top-concepts", {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "30天销量",
            data: concepts.map((concept) => concept.sale_30d),
            backgroundColor: "rgba(15, 158, 149, 0.72)",
            borderRadius: 5,
            xAxisID: "x",
          },
          {
            type: "line",
            label: "达人数量",
            data: concepts.map((concept) => concept.creators),
            borderColor: chartColors.amber,
            backgroundColor: chartColors.amber,
            pointRadius: 3,
            borderWidth: 2,
            tension: 0.25,
            xAxisID: "x1",
          },
        ],
      },
      options,
    });
  }

  function renderConceptBubbleChart() {
    const pools = [...new Set(report.concepts.map((concept) => concept.pool_key))];
    const colors = {
      beauty: chartColors.rose,
      home_kitchen: chartColors.teal,
      electronics_accessories: chartColors.blue,
    };
    const datasets = pools.map((pool) => ({
      label: poolLabel(pool),
      data: report.concepts
        .filter((concept) => concept.pool_key === pool && asNumber(concept.sale_30d) > 0)
        .map((concept) => ({
          x: Math.max(1, asNumber(concept.sale_30d)),
          y: Math.max(1, asNumber(concept.creators)),
          r: Math.min(20, Math.max(4, Math.sqrt(asNumber(concept.videos) + 1) / 5)),
          label: concept.product_concept,
          videos: asNumber(concept.videos),
          listings: asNumber(concept.listing_count),
          markets: concept.markets,
        })),
      backgroundColor: colors[pool] + "99",
      borderColor: colors[pool],
      borderWidth: 1,
    }));
    const options = cartesianOptions({ logarithmic: true });
    options.interaction = { mode: "nearest", intersect: true };
    options.plugins.tooltip.callbacks = {
      title: (items) => items[0]?.raw?.label || "",
      label: (context) => [
        "30天销量：" + fmt(context.raw.x),
        "达人：" + fmt(context.raw.y),
        "视频：" + fmt(context.raw.videos),
        "同概念商品：" + fmt(context.raw.listings),
        "市场：" + text(context.raw.markets),
      ],
    };
    options.scales.x.type = "logarithmic";
    options.scales.x.title = { display: true, text: "概念30天销量（对数轴）", color: "#687b8b" };
    options.scales.x.ticks = {
      color: "#687b8b",
      callback: (value) => compactFormatter.format(Number(value)),
    };
    options.scales.y.title = { display: true, text: "概念达人数量（对数轴）", color: "#687b8b" };

    createChart("chart-concept-bubble", {
      type: "bubble",
      data: { datasets },
      options,
    });
  }

  function renderHeatmap() {
    const metric = byId("heatmap-metric").value;
    const metricLabels = {
      total_sale_30d_cnt: "30天销量",
      total_ifl_cnt: "达人",
      total_video_cnt: "视频",
      total_live_cnt: "直播",
    };
    const markets = signalMarkets();
    const pools = Object.keys(poolLabels);
    const values = markets.flatMap((market) => pools.map(
      (pool) => sumField(productsForCell(market, pool), metric)
    ));
    const maxValue = Math.max(...values, 1);

    let heatmap = '<div class="heatmap-label"></div>' +
      pools.map((pool) => '<div class="heatmap-label">' + text(poolLabel(pool)) + "</div>").join("");
    markets.forEach((market) => {
      heatmap += '<div class="heatmap-label market-label">' + text(market) + "</div>";
      pools.forEach((pool) => {
        const value = sumField(productsForCell(market, pool), metric);
        const intensity = Math.sqrt(value / maxValue);
        const alpha = 0.08 + intensity * 0.82;
        const color = alpha > 0.6 ? "#ffffff" : "#163247";
        heatmap += '<div class="heatmap-cell" style="background:rgba(15,158,149,' +
          alpha.toFixed(3) + ");color:" + color + '">' +
          "<strong>" + fmt(value) + "</strong><span>" + text(metricLabels[metric]) + "</span></div>";
      });
    });
    byId("market-pool-heatmap").innerHTML = heatmap;

    const rows = markets.map((market) => {
      const poolValues = pools.map((pool) => sumField(productsForCell(market, pool), metric));
      return [text(market), ...poolValues.map(fmt), fmt(poolValues.reduce((sum, value) => sum + value, 0))];
    });
    const totals = pools.map((pool) => markets.reduce(
      (sum, market) => sum + sumField(productsForCell(market, pool), metric), 0
    ));
    rows.push(["合计", ...totals.map(fmt), fmt(totals.reduce((sum, value) => sum + value, 0))]);
    renderDataTable("market-pool-table",
      ["市场", ...pools.map((pool) => poolLabel(pool)), "合计 · " + metricLabels[metric]],
      rows
    );
  }

  function renderMomentumTable() {
    const products = report.products
      .map((product) => {
        const sale7 = asNumber(product.total_sale_7d_cnt);
        const sale30 = asNumber(product.total_sale_30d_cnt);
        const weeklyBaseline = sale30 > 0 ? sale30 / 30 * 7 : 0;
        return {
          ...product,
          momentumRatio: weeklyBaseline > 0 ? sale7 / weeklyBaseline : 0,
        };
      })
      .filter((product) => asNumber(product.total_sale_30d_cnt) >= 100 && asNumber(product.total_sale_7d_cnt) > 0)
      .sort((a, b) => b.momentumRatio - a.momentumRatio)
      .slice(0, 20);

    byId("momentum-table").innerHTML = products.length ? products.map((product, index) => (
      "<tr>" +
      "<td>" + fmt(index + 1) + "</td>" +
      '<td><span class="region-pill">' + text(product.source_region) + "</span></td>" +
      "<td>" + text(product.product_concept) + "</td>" +
      "<td>" + fmt(product.total_sale_7d_cnt) + "</td>" +
      "<td>" + fmt(product.total_sale_30d_cnt) + "</td>" +
      '<td><span class="momentum-ratio">' + fmtDecimal(product.momentumRatio) + "×</span></td>" +
      "<td>" + fmt(product.total_ifl_cnt) + "</td>" +
      "<td>" + fmt(product.total_video_cnt) + "</td>" +
      "<td>" + decisionBadge(product.conclusion) + "</td>" +
      "</tr>"
    )).join("") : '<tr class="empty-row"><td colspan="9">当前没有可计算动能的商品</td></tr>';
  }

  function renderVisualizations() {
    byId("visual-product-count").textContent = fmt(report.meta.product_count) + " 个合规商品";
    const marketRows = renderMarketSalesChart();
    renderPeriodSalesChart(marketRows);
    renderConclusionChart();
    renderDistributionChart();
    renderMarketConclusionChart();
    renderTopConceptsChart();
    renderConceptBubbleChart();
    renderHeatmap();
    renderMomentumTable();

    if (!window.Chart) {
      document.querySelectorAll(".chart-canvas").forEach((container) => {
        container.innerHTML = '<p class="chart-error">图表组件暂时无法加载，精确数据仍可在下方表格查看。</p>';
      });
    }
  }

  function renderSummary() {
    const values = [
      [report.meta.product_count, "排除女装与液体"],
      [report.meta.concept_count, "长标题归一后去重"],
      [report.summary.total_sale_30d, "候选商品合计"],
      [report.summary.total_creators, "商品详情字段合计"],
      [report.summary.total_videos, "商品详情字段合计"],
      [report.summary.total_lives, "商品详情字段合计"],
    ];
    const cards = [...byId("summary-kpis").querySelectorAll("article")];
    cards.forEach((card, index) => {
      card.querySelector("strong").textContent = fmt(values[index][0]);
      card.querySelector("small").textContent = values[index][1];
      card.querySelector("strong").title = numberFormatter.format(asNumber(values[index][0]));
    });
  }

  function renderUmbrellaProof() {
    const umbrella = report.concepts.find((concept) => String(concept.product_concept).includes("折叠伞"));
    if (!umbrella) {
      byId("umbrella-conclusion").textContent = "当前快照未找到折叠伞概念。";
      return;
    }

    byId("umbrella-proof").innerHTML =
      "<div><span>同概念商品</span><strong>" + fmt(umbrella.listing_count) + "</strong></div>" +
      "<div><span>覆盖市场</span><strong>" + fmt(umbrella.market_count) + " · " + text(umbrella.markets) + "</strong></div>" +
      "<div><span>30天销量</span><strong>" + fmt(umbrella.sale_30d) + "</strong></div>" +
      "<div><span>达人 / 视频</span><strong>" + fmt(umbrella.creators) + " / " + fmt(umbrella.videos) + "</strong></div>";
    byId("umbrella-conclusion").textContent =
      umbrella.conclusion + "。销量高不等于竞争小，同概念供给与内容规模必须一起看。";
  }

  function renderCoverage() {
    const labels = {
      US: "美国",
      MX: "墨西哥",
      GB: "英国",
      TH: "泰国",
      VN: "越南",
      BR: "巴西",
    };

    byId("market-coverage").innerHTML = report.market_coverage.map((market) => {
      const classes = [
        "market-card",
        market.status === "pending" ? "pending" : "",
        market.role === "validation" ? "validation" : "",
      ].filter(Boolean).join(" ");

      if (market.status === "pending") {
        return '<article class="' + classes + '">' +
          "<header><strong>" + text(market.region) + "</strong><span>" + text(labels[market.region]) + " · 待采集</span></header>" +
          '<p class="pending-note">已纳入信号市场配置，但当前报表快照没有真实样本。页面不会用评分或估算值补齐。</p>' +
          "</article>";
      }

      if (market.role === "validation") {
        return '<article class="' + classes + '">' +
          "<header><strong>" + text(market.region) + "</strong><span>" + text(labels[market.region]) + " · 验证市场</span></header>" +
          "<dl>" +
          "<div><dt>类目30天销量</dt><dd>" + fmt(market.category_sale_30d) + "</dd></div>" +
          "<div><dt>类目商品数</dt><dd>" + fmt(market.category_products) + "</dd></div>" +
          "<div><dt>类目达人</dt><dd>" + fmt(market.category_creators) + "</dd></div>" +
          "<div><dt>作用</dt><dd>供给与竞争验证</dd></div>" +
          "</dl></article>";
      }

      return '<article class="' + classes + '">' +
        "<header><strong>" + text(market.region) + "</strong><span>" + text(labels[market.region]) + " · 有数据</span></header>" +
        "<dl>" +
        "<div><dt>商品样本</dt><dd>" + fmt(market.sample_rows) + "</dd></div>" +
        "<div><dt>产品概念</dt><dd>" + fmt(market.concept_count) + "</dd></div>" +
        "<div><dt>样本30天销量</dt><dd>" + fmt(market.sample_sale_30d) + "</dd></div>" +
        "<div><dt>样本达人</dt><dd>" + fmt(market.sample_creators) + "</dd></div>" +
        "<div><dt>类目30天销量</dt><dd>" + fmt(market.category_sale_30d) + "</dd></div>" +
        "</dl></article>";
    }).join("");
  }

  function renderConcepts() {
    const query = byId("concept-search").value.trim().toLowerCase();
    const pool = byId("concept-pool").value;
    const sort = byId("concept-sort").value;

    const concepts = report.concepts
      .filter((concept) => !pool || concept.pool_key === pool)
      .filter((concept) => !query || [
        concept.product_concept,
        concept.markets,
        concept.conclusion,
      ].some((value) => String(value || "").toLowerCase().includes(query)))
      .sort((a, b) => asNumber(b[sort]) - asNumber(a[sort]));

    byId("concept-count").textContent = "显示 " + fmt(concepts.length) + " / " + fmt(report.concepts.length) + " 个概念";
    byId("concept-table").innerHTML = concepts.length ? concepts.map((concept) => (
      '<tr data-concept="' + escapeHtml(concept.product_concept) + '" title="点击查看该概念的商品">' +
      "<td><strong>" + text(concept.product_concept) + "</strong></td>" +
      '<td><span class="pool-pill">' + text(poolLabel(concept.pool_key, concept.pool_name)) + "</span></td>" +
      "<td>" + fmt(concept.listing_count) + "</td>" +
      "<td>" + fmt(concept.market_count) + " · " + text(concept.markets) + "</td>" +
      "<td><strong>" + fmt(concept.sale_30d) + "</strong></td>" +
      "<td>" + fmt(concept.total_sale) + "</td>" +
      "<td>" + fmt(concept.creators) + "</td>" +
      "<td>" + fmt(concept.videos) + "</td>" +
      "<td>" + fmt(concept.lives) + "</td>" +
      "<td>" + fmt(concept.reviews) + "</td>" +
      "<td>" + decisionBadge(concept.conclusion) + "</td>" +
      "</tr>"
    )).join("") : '<tr class="empty-row"><td colspan="11">没有符合条件的产品概念</td></tr>';
  }

  function renderProducts() {
    const query = byId("product-search").value.trim().toLowerCase();
    const market = byId("product-market").value;
    const pool = byId("product-pool").value;
    const conclusion = byId("product-conclusion").value;
    const sort = byId("product-sort").value;

    const products = report.products
      .filter((product) => !market || product.source_region === market)
      .filter((product) => !pool || product.pool_key === pool)
      .filter((product) => !conclusion || product.conclusion === conclusion)
      .filter((product) => !query || [
        product.product_concept,
        product.product_name_original,
        product.product_id,
        product.seller_id,
      ].some((value) => String(value || "").toLowerCase().includes(query)))
      .sort((a, b) => asNumber(b[sort]) - asNumber(a[sort]));

    byId("product-count").textContent = "显示 " + fmt(products.length) + " / " + fmt(report.products.length) + " 个商品";
    byId("product-table").innerHTML = products.length ? products.map((product, index) => (
      '<tr data-action="detail" data-product-id="' + text(product.product_id) + '" tabindex="0" title="点击查看完整真实数据">' +
      "<td>" + fmt(index + 1) + "</td>" +
      '<td><span class="region-pill">' + text(product.source_region) + "</span></td>" +
      "<td>" + text(product.product_concept) + "</td>" +
      '<td><span class="original-title" title="' + text(product.product_name_original) + '">' + text(product.product_name_original) + "</span></td>" +
      "<td>" + fmt(product.total_sale_7d_cnt) + "</td>" +
      "<td>" + fmt(product.total_sale_15d_cnt) + "</td>" +
      "<td><strong>" + fmt(product.total_sale_30d_cnt) + "</strong></td>" +
      "<td>" + fmt(product.total_sale_cnt) + "</td>" +
      "<td>" + fmtDecimal(product.total_sale_gmv_30d_amt) + "</td>" +
      "<td>" + fmt(product.total_ifl_cnt) + "</td>" +
      "<td>" + fmt(product.total_video_cnt) + "</td>" +
      "<td>" + fmt(product.total_live_cnt) + "</td>" +
      "<td>" + fmt(product.review_count) + "</td>" +
      "<td>" + fmt(product.concept_listing_count) + "</td>" +
      "<td>" + fmt(product.concept_market_count) + "</td>" +
      "<td>" + decisionBadge(product.conclusion) + "</td>" +
      "</tr>"
    )).join("") : '<tr class="empty-row"><td colspan="16">没有符合条件的商品</td></tr>';
  }

  function metricSection(title, items) {
    return '<section class="dialog-section"><h3>' + escapeHtml(title) + '</h3><dl class="detail-metrics">' +
      items.map((item) => (
        "<div><dt>" + escapeHtml(item[0]) + "</dt><dd>" + (item[1] === null || item[1] === undefined || item[1] === "" ? "—" : item[1]) + "</dd></div>"
      )).join("") +
      "</dl></section>";
  }

  function renderBrazilMatches(matches) {
    if (!Array.isArray(matches) || !matches.length) return "";
    return '<section class="dialog-section"><h3>巴西近似供给 Top ' + matches.length + '</h3><ul class="match-list">' +
      matches.map((match) => (
        "<li><strong>" + text(match.product_name) + "</strong>" +
        "<span>30天销量 " + fmt(match.total_sale_30d_cnt) + "</span>" +
        "<span>累计销量 " + fmt(match.total_sale_cnt) + "</span>" +
        "<span>达人 " + fmt(match.total_ifl_cnt) + "</span>" +
        "<span>视频 " + fmt(match.total_video_cnt) + "</span>" +
        "<span>价格 " + fmtDecimal(match.spu_avg_price) + "</span></li>"
      )).join("") +
      "</ul></section>";
  }

  function showProduct(productId) {
    const product = report.products.find((item) => String(item.product_id) === String(productId));
    if (!product) return;

    byId("dialog-content").innerHTML =
      '<header class="dialog-header">' +
      '<span class="region-pill">' + text(product.source_region) + " · " + text(poolLabel(product.pool_key, product.pool_name)) + "</span>" +
      '<h2 id="dialog-title">' + text(product.product_concept) + "</h2>" +
      '<p class="dialog-original-title">' + text(product.product_name_original) + "</p>" +
      "</header>" +
      '<div class="dialog-decision">' +
      decisionBadge(product.conclusion) +
      "<p><strong>竞争证据：</strong>" + text(product.competition_evidence) + "</p>" +
      "<p><strong>建议动作：</strong>" + text(product.recommended_action) + "</p>" +
      "</div>" +
      metricSection("商品身份", [
        ["商品 ID", text(product.product_id)],
        ["卖家 ID", text(product.seller_id)],
        ["来源排名", fmt(product.source_rank)],
        ["产品概念", text(product.product_concept)],
        ["L1 类目 ID", text(product.category_id)],
        ["L2 类目 ID", text(product.category_l2_id)],
        ["L3 类目 ID", text(product.category_l3_id)],
        ["市场", text(product.source_region)],
      ]) +
      metricSection("销量、GMV 与口碑", [
        ["7天销量", fmt(product.total_sale_7d_cnt)],
        ["15天销量", fmt(product.total_sale_15d_cnt)],
        ["30天销量", fmt(product.total_sale_30d_cnt)],
        ["累计销量", fmt(product.total_sale_cnt)],
        ["7天GMV（市场币种）", fmtDecimal(product.total_sale_gmv_7d_amt)],
        ["30天GMV（市场币种）", fmtDecimal(product.total_sale_gmv_30d_amt)],
        ["累计GMV（市场币种）", fmtDecimal(product.total_sale_gmv_amt)],
        ["评价数", fmt(product.review_count)],
        ["商品评分", fmtDecimal(product.product_rating)],
        ["最低价（市场币种）", fmtDecimal(product.min_price)],
        ["最高价（市场币种）", fmtDecimal(product.max_price)],
        ["平均价（市场币种）", fmtDecimal(product.spu_avg_price)],
      ]) +
      metricSection("趋势与内容分发", [
        ["最近7天趋势销量", fmt(product.trend_sale_last_7d_cnt)],
        ["此前7天趋势销量", fmt(product.trend_sale_previous_7d_cnt)],
        ["趋势增长率", fmtPercent(product.trend_sale_growth_rate)],
        ["关联达人总数", fmt(product.total_ifl_cnt)],
        ["关联视频总数", fmt(product.total_video_cnt)],
        ["关联直播总数", fmt(product.total_live_cnt)],
        ["内容标签", text(product.content_tag)],
        ["分发类型", text(product.distribution_type)],
      ]) +
      metricSection("达人样本", [
        ["达人样本数", fmt(product.ifl_sample_count)],
        ["样本粉丝合计", fmt(product.ifl_followers_in_sample)],
        ["样本观看合计", fmt(product.ifl_views_in_sample)],
        ["样本带货销量", fmt(product.influencer_sale_in_sample)],
        ["样本带货GMV", fmtDecimal(product.influencer_gmv_in_sample)],
        ["头部达人", text(product.top_influencer_name)],
        ["头部达人商品销量", fmt(product.top_influencer_product_sales)],
        ["样本最高粉丝", fmt(product.association_stats?.top_ifl_followers)],
      ]) +
      metricSection("视频与直播样本", [
        ["视频样本数", fmt(product.video_sample_count)],
        ["视频观看合计", fmt(product.video_views_in_sample)],
        ["视频点赞合计", fmt(product.video_likes_in_sample)],
        ["视频评论合计", fmt(product.video_comments_in_sample)],
        ["视频带货销量", fmt(product.video_sale_in_sample)],
        ["单条最高观看", fmt(product.top_video_views)],
        ["平均视频观看", fmt(product.avg_video_views)],
        ["Top 视频 ID", text(product.top_video_id)],
        ["直播样本数", fmt(product.live_sample_count)],
        ["单场最高观看", fmt(product.top_live_views)],
      ]) +
      metricSection("同产品概念竞争", [
        ["同概念商品数", fmt(product.concept_listing_count)],
        ["覆盖市场数", fmt(product.concept_market_count)],
        ["覆盖市场", text(product.concept_markets)],
        ["概念30天销量", fmt(product.concept_total_sale_30d_cnt)],
        ["概念累计销量", fmt(product.concept_total_sale_cnt)],
        ["概念达人", fmt(product.concept_total_ifl_cnt)],
        ["概念视频", fmt(product.concept_total_video_cnt)],
        ["概念直播", fmt(product.concept_total_live_cnt)],
        ["概念评价", fmt(product.concept_total_review_count)],
        ["单商品最高30天销量", fmt(product.concept_max_total_sale_30d_cnt)],
      ]) +
      metricSection("巴西供给验证", [
        ["巴西搜索词", text(product.br_search_keyword)],
        ["供给已验证", boolText(product.br_supply_verified)],
        ["原始搜索结果", fmt(product.br_raw_search_result_count)],
        ["匹配供给数", fmt(product.br_matched_supply_count)],
        ["其中有销量", fmt(product.br_supply_with_sales)],
        ["匹配30天销量", fmt(product.br_matched_total_sale_30d_cnt)],
        ["匹配累计销量", fmt(product.br_matched_total_sale_cnt)],
        ["匹配达人", fmt(product.br_matched_total_ifl_cnt)],
        ["匹配视频", fmt(product.br_matched_total_video_cnt)],
        ["匹配直播", fmt(product.br_matched_total_live_cnt)],
        ["匹配评价", fmt(product.br_matched_total_review_count)],
        ["结果触及上限", boolText(product.br_result_cap_reached)],
        ["巴西赛道30天销量", fmt(product.pool_br_sale_30d)],
        ["巴西赛道商品数", fmt(product.pool_br_product_count)],
        ["巴西赛道达人", fmt(product.pool_br_creator_count)],
      ]) +
      renderBrazilMatches(product.brazil_top_matches);

    const dialog = byId("product-dialog");
    if (typeof dialog.showModal === "function") dialog.showModal();
  }

  function bindEvents() {
    ["concept-search", "concept-pool", "concept-sort"].forEach((id) => {
      byId(id).addEventListener(id === "concept-search" ? "input" : "change", renderConcepts);
    });
    ["product-search", "product-market", "product-pool", "product-conclusion", "product-sort"].forEach((id) => {
      byId(id).addEventListener(id === "product-search" ? "input" : "change", renderProducts);
    });
    byId("heatmap-metric").addEventListener("change", renderHeatmap);

    byId("concept-table").addEventListener("click", (event) => {
      const row = event.target.closest("tr[data-concept]");
      if (!row) return;
      byId("product-search").value = row.dataset.concept;
      renderProducts();
      byId("products-title").scrollIntoView({ behavior: "smooth", block: "start" });
    });

    const openFromRow = (event) => {
      const row = event.target.closest('tr[data-action="detail"]');
      if (!row) return;
      if (event.type === "keydown" && event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      showProduct(row.dataset.productId);
    };
    byId("product-table").addEventListener("click", openFromRow);
    byId("product-table").addEventListener("keydown", openFromRow);

    byId("dialog-close").addEventListener("click", () => byId("product-dialog").close());
    byId("product-dialog").addEventListener("click", (event) => {
      if (event.target === byId("product-dialog")) byId("product-dialog").close();
    });
  }

  function initializeFilters() {
    const markets = report.market_coverage.map((market) => market.region);
    const pools = [...new Set(report.products.map((product) => product.pool_key))].sort();
    const conclusions = [...new Set(report.products.map((product) => product.conclusion).filter(Boolean))].sort();

    fillSelect(byId("product-market"), markets);
    fillSelect(byId("product-pool"), pools, (pool) => poolLabel(pool));
    fillSelect(byId("concept-pool"), pools, (pool) => poolLabel(pool));
    fillSelect(byId("product-conclusion"), conclusions);
  }

  async function loadReport() {
    try {
      const response = await fetch("/data/product-analysis.json", { cache: "no-store" });
      if (!response.ok) throw new Error("HTTP " + response.status);
      report = await response.json();

      const generatedAt = report.meta.generated_at
        ? new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(report.meta.generated_at))
        : "未知时间";
      const pendingMarkets = report.market_coverage
        .filter((market) => market.status === "pending")
        .map((market) => market.region);
      byId("data-status").querySelector("p").textContent =
        "数据生成于 " + generatedAt + " · EchoTik API 快照 · " +
        fmt(report.meta.product_count) + " 个合规商品 · " + fmt(report.meta.concept_count) + " 个产品概念" +
        (pendingMarkets.length ? " · " + pendingMarkets.join(" / ") + " 当前待采集" : "");

      initializeFilters();
      renderSummary();
      renderUmbrellaProof();
      renderCoverage();
      renderVisualizations();
      renderConcepts();
      renderProducts();
      bindEvents();
    } catch (error) {
      byId("data-status").classList.add("error");
      byId("data-status").querySelector("p").textContent =
        "真实数据文件加载失败，页面未显示任何估算数据。请重新同步报表后再试。";
      console.error(error);
    }
  }

  loadReport();
})();
