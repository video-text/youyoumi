"use strict";

(() => {
  const money = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 2,
  });
  const number = new Intl.NumberFormat("zh-CN");
  const colors = ["#0f9e95", "#4d78e6", "#e6a329", "#e65d6c", "#835ad8", "#25d4c6", "#91a2ad", "#163247"];
  const charts = {};
  let data = null;
  let shopIndex = 0;
  let compareMode = false;
  let rawKind = "products";
  let search = "";

  const byId = (id) => document.getElementById(id);
  const escapeHtml = (value) => String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

  const destroyChart = (key) => {
    if (charts[key]) {
      charts[key].destroy();
      delete charts[key];
    }
  };

  const makeChart = (key, canvasId, config) => {
    destroyChart(key);
    const el = byId(canvasId);
    if (!el || typeof Chart === "undefined") return;
    charts[key] = new Chart(el, config);
  };

  const currentShop = () => (data?.shops || [])[shopIndex] || null;

  const renderKpis = () => {
    const grid = byId("kpi-grid");
    if (!grid) return;
    if (compareMode) {
      const c = data.comparison;
      grid.innerHTML = [
        ["商品数", c.products.map(number.format).join(" / "), c.labels.join(" · ")],
        ["订单数", c.orders.map(number.format).join(" / "), "双店对比"],
        ["GMV", c.gmv.map((v) => money.format(v)).join(" / "), "BRL"],
        ["库存总量", c.inventory.map(number.format).join(" / "), "件"],
        ["客单价", c.aov.map((v) => money.format(v)).join(" / "), "AOV"],
      ].map(([label, value, sub]) => `
        <article class="kpi-card">
          <div class="label">${escapeHtml(label)}</div>
          <div class="value">${escapeHtml(value)}</div>
          <div class="sub">${escapeHtml(sub)}</div>
        </article>
      `).join("");
      return;
    }
    const shop = currentShop();
    if (!shop) return;
    const s = shop.summary;
    grid.innerHTML = [
      ["商品数", number.format(s.product_count), shop.shop_code],
      ["订单数", number.format(s.order_count), shop.seller_name],
      ["GMV", money.format(s.gmv), s.currency],
      ["库存总量", number.format(s.inventory_total), `均价 ${money.format(s.avg_price)}`],
      ["客单价", money.format(s.avg_order_value), `${shop.region} · ${shop.seller_type}`],
    ].map(([label, value, sub]) => `
      <article class="kpi-card">
        <div class="label">${escapeHtml(label)}</div>
        <div class="value">${escapeHtml(value)}</div>
        <div class="sub">${escapeHtml(sub)}</div>
      </article>
    `).join("");
  };

  const statusMap = (obj) => {
    const labels = Object.keys(obj || {});
    const values = labels.map((k) => obj[k]);
    return { labels, values };
  };

  const renderCharts = () => {
    const compareBlock = byId("compare-charts");
    if (compareMode) {
      compareBlock.hidden = false;
      const c = data.comparison;
      makeChart("compare", "chart-compare", {
        type: "bar",
        data: {
          labels: ["商品", "订单", "GMV", "库存", "客单价"],
          datasets: [
            {
              label: c.labels[0],
              data: [c.products[0], c.orders[0], c.gmv[0], c.inventory[0], c.aov[0]],
              backgroundColor: colors[0],
            },
            {
              label: c.labels[1],
              data: [c.products[1], c.orders[1], c.gmv[1], c.inventory[1], c.aov[1]],
              backgroundColor: colors[1],
            },
          ],
        },
        options: {
          responsive: true,
          plugins: { legend: { position: "bottom" } },
          scales: { y: { beginAtZero: true } },
        },
      });
      ["daily", "orderStatus", "productStatus", "inventory", "top"].forEach(destroyChart);
      ["chart-daily", "chart-order-status", "chart-product-status", "chart-inventory", "chart-top-products"]
        .forEach((id) => {
          const canvas = byId(id);
          if (canvas) {
            const ctx = canvas.getContext("2d");
            ctx.clearRect(0, 0, canvas.width, canvas.height);
          }
        });
      return;
    }

    compareBlock.hidden = true;
    destroyChart("compare");
    const shop = currentShop();
    if (!shop) return;
    const ch = shop.charts;
    const daily = ch.daily_gmv || [];

    makeChart("daily", "chart-daily", {
      type: "line",
      data: {
        labels: daily.map((d) => d.date),
        datasets: [
          {
            label: "GMV",
            data: daily.map((d) => d.gmv),
            borderColor: colors[0],
            backgroundColor: "rgba(15,158,149,0.15)",
            tension: 0.3,
            fill: true,
            yAxisID: "y",
          },
          {
            label: "订单数",
            data: daily.map((d) => d.orders),
            borderColor: colors[1],
            backgroundColor: "rgba(77,120,230,0.12)",
            tension: 0.3,
            fill: false,
            yAxisID: "y1",
          },
        ],
      },
      options: {
        responsive: true,
        interaction: { mode: "index", intersect: false },
        plugins: { legend: { position: "bottom" } },
        scales: {
          y: { beginAtZero: true, position: "left" },
          y1: { beginAtZero: true, position: "right", grid: { drawOnChartArea: false } },
        },
      },
    });

    const os = statusMap(ch.order_status);
    makeChart("orderStatus", "chart-order-status", {
      type: "doughnut",
      data: {
        labels: os.labels,
        datasets: [{ data: os.values, backgroundColor: colors }],
      },
      options: { responsive: true, plugins: { legend: { position: "bottom" } } },
    });

    const ps = statusMap(ch.product_status);
    makeChart("productStatus", "chart-product-status", {
      type: "pie",
      data: {
        labels: ps.labels,
        datasets: [{ data: ps.values, backgroundColor: colors }],
      },
      options: { responsive: true, plugins: { legend: { position: "bottom" } } },
    });

    const inv = statusMap(ch.inventory_buckets);
    makeChart("inventory", "chart-inventory", {
      type: "bar",
      data: {
        labels: inv.labels,
        datasets: [{ label: "商品数", data: inv.values, backgroundColor: colors[0] }],
      },
      options: {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
      },
    });

    const top = ch.top_products || [];
    makeChart("top", "chart-top-products", {
      type: "bar",
      data: {
        labels: top.map((x) => x.name),
        datasets: [{ label: "销量件数", data: top.map((x) => x.qty), backgroundColor: colors[4] }],
      },
      options: {
        indexAxis: "y",
        responsive: true,
        plugins: { legend: { display: false } },
        scales: { x: { beginAtZero: true, ticks: { precision: 0 } } },
      },
    });
  };

  const renderRaw = () => {
    const shop = currentShop();
    const thead = byId("raw-thead");
    const tbody = byId("raw-tbody");
    const count = byId("raw-count");
    if (!shop || !thead || !tbody) return;

    if (compareMode) {
      thead.innerHTML = "<tr><th>指标</th><th>三店 QUEJO</th><th>二店 MIOU</th></tr>";
      const c = data.comparison;
      tbody.innerHTML = [
        ["商品数", ...c.products],
        ["订单数", ...c.orders],
        ["GMV", ...c.gmv.map((v) => money.format(v))],
        ["库存", ...c.inventory],
        ["客单价", ...c.aov.map((v) => money.format(v))],
      ].map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`).join("");
      count.textContent = "对比摘要 5 行";
      return;
    }

    const q = search.trim().toLowerCase();
    if (rawKind === "orders") {
      let rows = shop.orders || [];
      if (q) {
        rows = rows.filter((r) =>
          [r.id, r.status, r.product, r.sku].join(" ").toLowerCase().includes(q)
        );
      }
      thead.innerHTML = "<tr><th>订单号</th><th>状态</th><th>金额</th><th>创建日</th><th>商品</th><th>SKU</th></tr>";
      tbody.innerHTML = rows.map((r) => `
        <tr>
          <td>${escapeHtml(r.id)}</td>
          <td>${escapeHtml(r.status)}</td>
          <td>${escapeHtml(money.format(r.amount || 0))}</td>
          <td>${escapeHtml(r.create_time || "—")}</td>
          <td class="title-cell">${escapeHtml(r.product || "—")}</td>
          <td>${escapeHtml(r.sku || "—")}</td>
        </tr>
      `).join("") || `<tr><td colspan="6">无数据</td></tr>`;
      count.textContent = `共 ${rows.length} 条订单`;
      return;
    }

    let rows = shop.products || [];
    if (q) {
      rows = rows.filter((r) =>
        [r.id, r.title, r.status, r.seller_sku].join(" ").toLowerCase().includes(q)
      );
    }
    thead.innerHTML = "<tr><th>商品ID</th><th>标题</th><th>状态</th><th>SKU</th><th>价格</th><th>库存</th><th>更新</th></tr>";
    tbody.innerHTML = rows.map((r) => `
      <tr>
        <td>${escapeHtml(r.id)}</td>
        <td class="title-cell">${escapeHtml(r.title || "—")}</td>
        <td>${escapeHtml(r.status)}</td>
        <td>${escapeHtml(r.seller_sku || "—")}</td>
        <td>${escapeHtml(money.format(r.price || 0))}</td>
        <td>${escapeHtml(number.format(r.inventory || 0))}</td>
        <td>${escapeHtml(r.updated_at || "—")}</td>
      </tr>
    `).join("") || `<tr><td colspan="7">无数据</td></tr>`;
    count.textContent = `共 ${rows.length} 条商品`;
  };

  const refresh = () => {
    renderKpis();
    renderCharts();
    renderRaw();
  };

  const bind = () => {
    document.querySelectorAll(".shop-tab").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".shop-tab").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        const key = btn.dataset.shop;
        compareMode = key === "compare";
        if (!compareMode) shopIndex = Number(key);
        refresh();
      });
    });

    document.querySelectorAll(".panel-tab").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".panel-tab").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        document.querySelectorAll(".panel-body").forEach((p) => p.classList.remove("active"));
        byId(`panel-${btn.dataset.panel}`)?.classList.add("active");
        if (btn.dataset.panel === "charts") renderCharts();
      });
    });

    byId("raw-table-select")?.addEventListener("change", (e) => {
      rawKind = e.target.value;
      renderRaw();
    });
    byId("raw-search")?.addEventListener("input", (e) => {
      search = e.target.value || "";
      renderRaw();
    });
  };

  const boot = async () => {
    bind();
    try {
      const res = await fetch("/data/tiktok-shops-dashboard.json", { cache: "no-store" });
      if (!res.ok) throw new Error("load failed");
      data = await res.json();
      byId("updated-at").textContent = `数据更新：${data.updated_at}`;
      refresh();
    } catch (err) {
      byId("updated-at").textContent = "数据加载失败，请稍后重试";
      console.error(err);
    }
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
