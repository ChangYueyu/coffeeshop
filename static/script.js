(() => {
  if (window.__studynest_loaded__) return;
  window.__studynest_loaded__ = true;

  const LS_CART = "coffee_cart";
  const LS_POINTS_MAP = "coffee_points_map";
  const LS_DISCOUNT_MAP = "coffee_discount_map";
  const LS_REDEMPTIONS = "coffee_redemptions";
  const LS_STUDY = "coffee_study_state";

  const $ = (id) => document.getElementById(id);

  function loadJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  function saveJSON(key, val) {
    localStorage.setItem(key, JSON.stringify(val));
  }

  function money(n) {
    return Number(n || 0).toFixed(2);
  }

  function nowText() {
    return new Date().toLocaleString();
  }

  function todayKey() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  function slugify(s) {
    return String(s).toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  }

  function safeOn(id, evt, fn) {
    const el = $(id);
    if (el) el.addEventListener(evt, fn);
  }

  function userKey() {
    return "guest";
  }

  function getPointsMap() {
    return loadJSON(LS_POINTS_MAP, {});
  }

  function setPointsMap(m) {
    saveJSON(LS_POINTS_MAP, m);
  }

  function getDiscountMap() {
    return loadJSON(LS_DISCOUNT_MAP, {});
  }

  function setDiscountMap(m) {
    saveJSON(LS_DISCOUNT_MAP, m);
  }

  function getPoints() {
    const m = getPointsMap();
    return Number(m[userKey()] || 0);
  }

  function setPoints(v) {
    const m = getPointsMap();
    m[userKey()] = Math.max(0, Number(v) || 0);
    setPointsMap(m);
    syncPointsUI();
  }

  function addPoints(delta) {
    setPoints(getPoints() + (Number(delta) || 0));
  }

  function getDiscount() {
    const m = getDiscountMap();
    return Number(m[userKey()] || 0);
  }

  function setDiscount(v) {
    const m = getDiscountMap();
    m[userKey()] = Math.max(0, Number(v) || 0);
    setDiscountMap(m);
    syncPointsUI();
  }

  let cart = loadJSON(LS_CART, []);

  function persistCart() {
    saveJSON(LS_CART, cart);
  }

  function addToCartItem(name, price) {
    const p = Number(price);
    const id = slugify(name) + "-" + Math.random().toString(16).slice(2, 8);

    const existing = cart.find(x => x.name === name && Number(x.price) === p);
    if (existing) existing.qty += 1;
    else cart.push({ id, name, price: p, qty: 1 });

    persistCart();
    renderCart();
    updateTotalsAndSidebar();
  }

  function changeQty(id, delta) {
    const it = cart.find(x => x.id === id);
    if (!it) return;
    it.qty = Math.max(1, it.qty + delta);
    persistCart();
    renderCart();
    updateTotalsAndSidebar();
  }

  function removeItem(id) {
    cart = cart.filter(x => x.id !== id);
    persistCart();
    renderCart();
    updateTotalsAndSidebar();
  }

  function clearCart() {
    cart = [];
    persistCart();
  }

  function calcSubtotal() {
    return cart.reduce((sum, i) => sum + Number(i.price) * Number(i.qty), 0);
  }

  function syncPointsUI() {
    if ($("pointsBalance")) $("pointsBalance").textContent = String(getPoints());
    if ($("pointsAvailableDisplay")) $("pointsAvailableDisplay").textContent = String(getPoints());
    if ($("activeDiscountDisplay")) $("activeDiscountDisplay").textContent = money(getDiscount());
    if ($("pointsRedeemedDisplay")) $("pointsRedeemedDisplay").textContent = String(Math.round(getDiscount() * 100));
    if ($("activeDiscountSide")) $("activeDiscountSide").textContent = money(getDiscount());
    if ($("userPointsText")) $("userPointsText").textContent = String(getPoints());
  }

  function updateTotalsAndSidebar() {
    const subtotal = calcSubtotal();
    const discount = Math.min(getDiscount(), subtotal);
    const total = Math.max(0, subtotal - discount);

    if ($("subtotal")) $("subtotal").textContent = `£${money(subtotal)}`;
    if ($("discount")) $("discount").textContent = `-£${money(discount)}`;
    if ($("total")) $("total").textContent = `£${money(total)}`;

    syncPointsUI();
    return { subtotal, discount, total };
  }

  function renderCart() {
    const body = $("cartBody");
    if (!body) return;

    body.innerHTML = "";

    if (!cart.length) {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td colspan="5" style="padding:14px;opacity:.75;">Your cart is empty. Go to Menu and add something ☕️</td>`;
      body.appendChild(tr);
      updateTotalsAndSidebar();
      return;
    }

    cart.forEach(item => {
      const tr = document.createElement("tr");
      const line = item.price * item.qty;
      tr.innerHTML = `
        <td>${item.name}</td>
        <td style="text-align:center;">
          <button class="qty-btn" data-action="minus" data-id="${item.id}" type="button">-</button>
          <span style="display:inline-block;min-width:22px;">${item.qty}</span>
          <button class="qty-btn" data-action="plus" data-id="${item.id}" type="button">+</button>
        </td>
        <td style="text-align:right;">£${money(item.price)}</td>
        <td style="text-align:right;">£${money(line)}</td>
        <td style="text-align:center;">
          <button class="qty-btn" data-action="remove" data-id="${item.id}" type="button">x</button>
        </td>
      `;
      body.appendChild(tr);
    });

    body.querySelectorAll("button").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.dataset.id;
        const action = btn.dataset.action;
        if (!id || !action) return;
        if (action === "plus") changeQty(id, 1);
        if (action === "minus") changeQty(id, -1);
        if (action === "remove") removeItem(id);
      });
    });

    updateTotalsAndSidebar();
  }

  function showView(viewId) {
    document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
    const el = document.getElementById(viewId);
    if (el) el.classList.add("active");

    document.querySelectorAll(".nav-link").forEach(a => a.classList.remove("active"));
    const nav = document.querySelector(`.nav-link[data-view="${viewId}"]`);
    if (nav) nav.classList.add("active");

    if (viewId === "orderView") {
      renderCart();
      renderOrderOptionHint();
      updateTotalsAndSidebar();
      toggleCardFields();
    }
    if (viewId === "pointsView") renderRewards();
    if (viewId === "studyView") renderStudy();
    if (viewId === "menuView") applyMenuFilters();
  }

  function bindNav() {
    document.querySelectorAll(".nav-link").forEach(link => {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        const viewId = link.dataset.view;
        if (viewId) showView(viewId);
      });
    });
  }

  let currentCategory = "all";
  let studyPicksOnly = false;

  function bindCategoryTabs() {
    const tabs = document.querySelectorAll(".tab-btn");
    if (!tabs.length) return;

    tabs.forEach(tab => {
      tab.addEventListener("click", () => {
        tabs.forEach(t => t.classList.remove("active"));
        tab.classList.add("active");
        currentCategory = tab.dataset.category || "all";
        applyMenuFilters();
      });
    });
  }

  function applyMenuFilters() {
    const q = ($("menuSearch")?.value || "").trim().toLowerCase();
    const sort = $("menuSort")?.value || "featured";

    const grid = $("menuGrid");
    if (!grid) return;

    const cards = Array.from(grid.querySelectorAll(".menu-item"));

    cards.forEach(card => {
      const cat = card.dataset.category || "";
      const name = (card.querySelector("h3")?.textContent || "").toLowerCase();
      const desc = (card.querySelector(".menu-desc")?.textContent || "").toLowerCase();
      const featured = card.dataset.featured === "1";

      const matchCategory = currentCategory === "all" || cat === currentCategory;
      const matchText = !q || name.includes(q) || desc.includes(q);
      const matchStudy = !studyPicksOnly || featured;

      card.style.display = matchCategory && matchText && matchStudy ? "" : "none";
    });

    const visible = cards.filter(c => c.style.display !== "none");
    const getPrice = c => Number(c.querySelector(".open-customize")?.dataset.price || 0);
    const getName = c => (c.querySelector("h3")?.textContent || "").toLowerCase();

    let sorted = visible.slice();

    if (sort === "price-asc") sorted.sort((a, b) => getPrice(a) - getPrice(b));
    if (sort === "price-desc") sorted.sort((a, b) => getPrice(b) - getPrice(a));
    if (sort === "name-asc") sorted.sort((a, b) => getName(a).localeCompare(getName(b)));

    if (sort === "featured") {
      sorted.sort((a, b) => {
        const af = a.dataset.featured === "1" ? 1 : 0;
        const bf = b.dataset.featured === "1" ? 1 : 0;
        if (bf !== af) return bf - af;
        return getName(a).localeCompare(getName(b));
      });
    }

    sorted.forEach(node => grid.appendChild(node));
  }

  function bindMenuControls() {
    safeOn("menuSearch", "input", applyMenuFilters);
    safeOn("menuSort", "change", applyMenuFilters);

    safeOn("btnStudyPicks", "click", () => {
      studyPicksOnly = !studyPicksOnly;
      $("btnStudyPicks")?.classList.toggle("btn-primary", studyPicksOnly);
      $("btnStudyPicks")?.classList.toggle("btn-outline", !studyPicksOnly);
      applyMenuFilters();
    });

    safeOn("btnClearFilters", "click", () => {
      studyPicksOnly = false;
      currentCategory = "all";
      if ($("menuSearch")) $("menuSearch").value = "";
      if ($("menuSort")) $("menuSort").value = "featured";

      document.querySelectorAll(".tab-btn").forEach(t => t.classList.remove("active"));
      document.querySelector('.tab-btn[data-category="all"]')?.classList.add("active");

      $("btnStudyPicks")?.classList.remove("btn-primary");
      $("btnStudyPicks")?.classList.add("btn-outline");

      applyMenuFilters();
    });
  }

  const backdrop = () => $("customizeBackdrop");
  let currentBaseName = "";
  let currentBasePrice = 0;

  function openModal() {
    const bd = backdrop();
    if (!bd) return;
    bd.style.display = "flex";
    bd.setAttribute("aria-hidden", "false");
  }

  function closeModal() {
    const bd = backdrop();
    if (!bd) return;
    bd.style.display = "none";
    bd.setAttribute("aria-hidden", "true");
    if ($("customizeHint")) $("customizeHint").textContent = "";
  }

  function calcCustomPrice() {
    const size = $("optSize")?.value || "Regular";
    const milk = $("optMilk")?.value || "Default";
    const extras = $("optExtras")?.value || "None";

    let p = Number(currentBasePrice);
    if (size === "Large") p += 0.40;
    if (milk === "Oat" || milk === "Soy") p += 0.30;
    if (extras === "Extra shot") p += 0.50;
    if (extras === "Vanilla syrup" || extras === "Caramel syrup") p += 0.40;
    return p;
  }

  function buildCustomName() {
    const size = $("optSize")?.value || "Regular";
    const milk = $("optMilk")?.value || "Default";
    const sugar = $("optSugar")?.value || "0";
    const extras = $("optExtras")?.value || "None";

    const parts = [];
    if (size !== "Regular") parts.push(size);
    if (milk !== "Default") parts.push(milk);
    if (String(sugar) !== "0") parts.push(`${sugar} sugar`);
    if (extras !== "None") parts.push(extras);

    return parts.length ? `${currentBaseName} (${parts.join(", ")})` : currentBaseName;
  }

  function refreshModalPrice() {
    if ($("customizePrice")) $("customizePrice").textContent = money(calcCustomPrice());
  }

  function bindCustomizeButtons() {
    document.querySelectorAll(".open-customize").forEach(btn => {
      btn.addEventListener("click", () => {
        currentBaseName = btn.dataset.name || "Item";
        currentBasePrice = Number(btn.dataset.price || 0);

        if ($("customizeItemLine")) {
          $("customizeItemLine").textContent = `${currentBaseName} · Base £${money(currentBasePrice)}`;
        }

        if ($("optSize")) $("optSize").value = "Regular";
        if ($("optMilk")) $("optMilk").value = "Default";
        if ($("optSugar")) $("optSugar").value = "0";
        if ($("optExtras")) $("optExtras").value = "None";

        refreshModalPrice();
        openModal();
      });
    });

    ["optSize", "optMilk", "optSugar", "optExtras"].forEach(id => {
      safeOn(id, "change", refreshModalPrice);
    });

    safeOn("customizeCloseBtn", "click", closeModal);
    safeOn("customizeCancelBtn", "click", closeModal);

    const bd = backdrop();
    if (bd) {
      bd.addEventListener("click", (e) => {
        if (e.target === bd) closeModal();
      });
    }

    safeOn("customizeAddBtn", "click", () => {
      const finalName = buildCustomName();
      const finalPrice = calcCustomPrice();

      addToCartItem(finalName, finalPrice);

      if ($("customizeHint")) $("customizeHint").textContent = "Added ✅ You can review it on Place Order.";
      setTimeout(closeModal, 450);
    });
  }

  function renderOrderOptionHint() {
    const type = $("orderTypeSelect")?.value || "dine-in";
    const pickup = $("pickupTimeSelect")?.value || "ASAP";
    const hint = $("orderOptionHint");
    if (!hint) return;

    if (type === "takeaway") hint.textContent = `Takeaway selected. Pickup: ${pickup}.`;
    else hint.textContent = "Dine-in selected. Enjoy your stay 🙂";
  }

  function toggleCardFields() {
    const isCard = $("paymentMethodCard")?.checked;
    const box = $("cardPaymentFields");
    if (box) box.style.display = isCard ? "block" : "none";

    const btn = $("placeOrderBtn");
    if (btn) btn.textContent = isCard ? "Pay & Place Order" : "Place Order";
  }

  function getSelectedPaymentMethod() {
    if ($("paymentMethodCard")?.checked) return "card";
    return "cash";
  }

  function validateCardFields() {
    const name = $("cardNameInput")?.value?.trim() || "";
    const number = $("cardNumberInput")?.value?.trim() || "";
    const expiry = $("cardExpiryInput")?.value?.trim() || "";
    const cvv = $("cardCvvInput")?.value?.trim() || "";

    if (!name || !number || !expiry || !cvv) {
      return "Please complete all card payment fields.";
    }

    const cleanedNumber = number.replace(/\s+/g, "");
    if (!/^\d{12,19}$/.test(cleanedNumber)) {
      return "Please enter a valid card number.";
    }

    if (!/^\d{2}\/\d{2}$/.test(expiry)) {
      return "Expiry must be in MM/YY format.";
    }

    if (!/^\d{3,4}$/.test(cvv)) {
      return "Please enter a valid CVV.";
    }

    return "";
  }

  safeOn("orderTypeSelect", "change", renderOrderOptionHint);
  safeOn("pickupTimeSelect", "change", renderOrderOptionHint);
  safeOn("btnGoRewards", "click", () => showView("pointsView"));
  safeOn("paymentMethodCash", "change", toggleCardFields);
  safeOn("paymentMethodCard", "change", toggleCardFields);

  function getRedemptionsAll() {
    return loadJSON(LS_REDEMPTIONS, {});
  }

  function setRedemptionsAll(m) {
    saveJSON(LS_REDEMPTIONS, m);
  }

  function addRedemptionRecord(pounds, pointsSpent, status) {
    const all = getRedemptionsAll();
    const key = userKey();
    if (!Array.isArray(all[key])) all[key] = [];
    all[key].unshift({ time: nowText(), pounds, points: pointsSpent, status });
    setRedemptionsAll(all);
  }

  function renderRedemptionHistory() {
    const list = $("pointsHistoryList");
    const hint = $("pointsHistoryHint");
    if (!list || !hint) return;

    list.innerHTML = "";
    hint.textContent = "";

    const all = getRedemptionsAll();
    const arr = all[userKey()] || [];

    if (!arr.length) {
      hint.textContent = "No redemptions yet.";
      return;
    }

    arr.slice(0, 12).forEach(r => {
      const div = document.createElement("div");
      div.className = "history-item";
      div.innerHTML = `
        <div class="top">
          <div>
            <strong>£${money(r.pounds)}</strong> <span style="opacity:.7;">· ${r.time}</span>
            <div style="opacity:.75;">Cost: ${r.points} pts · Status: ${r.status || "Applied"}</div>
          </div>
        </div>
      `;
      list.appendChild(div);
    });
  }

  function renderRewards(message = "") {
    syncPointsUI();

    const pts = getPoints();
    const disc = getDiscount();

    if ($("redeemMessage")) {
      $("redeemMessage").textContent =
        message || (pts < 100 ? `You need ${100 - pts} more points to redeem £1.` : "Ready to redeem 🎁");
    }

    if ($("redeem1Btn")) $("redeem1Btn").disabled = pts < 100;
    if ($("redeem2Btn")) $("redeem2Btn").disabled = pts < 200;
    if ($("redeem5Btn")) $("redeem5Btn").disabled = pts < 500;
    if ($("clearDiscountBtn")) $("clearDiscountBtn").disabled = disc <= 0;

    renderRedemptionHistory();
    updateTotalsAndSidebar();
  }

  function redeem(pounds) {
    const needPts = Math.round(pounds * 100);
    const pts = getPoints();
    if (pts < needPts) {
      renderRewards("Not enough points yet.");
      return;
    }
    setPoints(pts - needPts);
    setDiscount(getDiscount() + pounds);
    addRedemptionRecord(pounds, needPts, "Applied");
    renderRewards(`Redeemed ✅ £${money(pounds)} discount will apply at checkout.`);
  }

  safeOn("redeem1Btn", "click", () => redeem(1));
  safeOn("redeem2Btn", "click", () => redeem(2));
  safeOn("redeem5Btn", "click", () => redeem(5));
  safeOn("clearDiscountBtn", "click", () => {
    if (getDiscount() <= 0) return renderRewards("No active discount.");
    addRedemptionRecord(getDiscount(), Math.round(getDiscount() * 100), "Cancelled");
    setDiscount(0);
    renderRewards("Active discount cancelled.");
  });

  safeOn("placeOrderBtn", "click", async () => {
    try {
      if (!cart || !cart.length) {
        alert("Your cart is empty. Add items from the Menu ☕️");
        return;
      }

      const paymentMethod = getSelectedPaymentMethod();
      if (paymentMethod === "card") {
        const validationMessage = validateCardFields();
        if (validationMessage) {
          alert(validationMessage);
          return;
        }
      }

      const { subtotal, discount, total } = updateTotalsAndSidebar();
      const orderType = $("orderTypeSelect")?.value || "dine-in";
      const pickupTime = $("pickupTimeSelect")?.value || "ASAP";
      const note = $("orderNoteInput")?.value?.trim() || "";

      const payload = {
        items: cart.map(i => ({
          name: i.name,
          price: Number(i.price),
          qty: Number(i.qty),
          product_id: 1,
          customisation: {}
        })),
        subtotal: subtotal,
        discount: discount,
        total: total,
        payment_method: paymentMethod,
        order_type: orderType,
        pickup_time: pickupTime,
        note: note
      };

      const res = await fetch("/create-order", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || "Failed to create order.");
        return;
      }

      const order = {
        id: "DB-" + data.order_id,
        time: nowText(),
        userEmail: "logged-in-user",
        items: cart.map(i => ({
          name: i.name,
          price: Number(i.price),
          qty: Number(i.qty)
        })),
        subtotal,
        discount,
        total,
        pointsEarned: 0,
        paymentMethod: data.payment_method,
        paymentStatus: data.payment_status
      };

      clearCart();
      renderCart();
      updateTotalsAndSidebar();
      renderConfirm(order);
      showView("confirmView");
    } catch (err) {
      console.error("PLACE ORDER ERROR:", err);
      alert("Something went wrong while creating the order.");
    }
  });

  function renderConfirm(order) {
    if ($("confirmOrderId")) $("confirmOrderId").textContent = order.id;
    if ($("confirmTime")) $("confirmTime").textContent = order.time;
    if ($("confirmAccount")) $("confirmAccount").textContent = order.userEmail || "Guest";
    if ($("confirmType")) $("confirmType").textContent = $("orderTypeSelect")?.value || "dine-in";
    if ($("confirmPickup")) $("confirmPickup").textContent = $("pickupTimeSelect")?.value || "ASAP";
    if ($("confirmNote")) $("confirmNote").textContent = $("orderNoteInput")?.value?.trim() || "—";

    const tbody = $("confirmItems");
    if (tbody) {
      tbody.innerHTML = "";
      order.items.forEach(i => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${i.name}</td>
          <td align="center">${i.qty}</td>
          <td align="right">£${money(i.price)}</td>
          <td align="right">£${money(i.price * i.qty)}</td>
        `;
        tbody.appendChild(tr);
      });
    }

    if ($("confirmSubtotal")) $("confirmSubtotal").textContent = money(order.subtotal);
    if ($("confirmDiscount")) $("confirmDiscount").textContent = money(order.discount);
    if ($("confirmTotal")) $("confirmTotal").textContent = money(order.total);

    if ($("confirmHint")) {
      const methodText = order.paymentMethod === "card" ? "Card payment successful (simulated)." : "Cash on collection selected.";
      $("confirmHint").textContent = `${methodText} Payment status: ${order.paymentStatus}.`;
    }
  }

  safeOn("btnConfirmBackMenu", "click", () => showView("menuView"));
  safeOn("btnConfirmGoAccount", "click", () => showView("accountView"));

  function getStudyAll() {
    return loadJSON(LS_STUDY, {});
  }

  function setStudyAll(m) {
    saveJSON(LS_STUDY, m);
  }

  function getStudyState() {
    const all = getStudyAll();
    const k = userKey();
    if (!all[k]) {
      all[k] = {
        lastCheckIn: "",
        streak: 0,
        lastDay: "",
        sessionsToday: 0,
        minutesToday: 0,
        pointsToday: 0
      };
      setStudyAll(all);
    }
    return all[k];
  }

  function setStudyState(next) {
    const all = getStudyAll();
    all[userKey()] = next;
    setStudyAll(all);
  }

  function ensureStudyReset(st) {
    const t = todayKey();
    if (st.lastDay !== t) {
      st.lastDay = t;
      st.sessionsToday = 0;
      st.minutesToday = 0;
      st.pointsToday = 0;
      setStudyState(st);
    }
    return st;
  }

  let studyTimer = {
    totalSec: 25 * 60,
    leftSec: 25 * 60,
    running: false,
    interval: null
  };

  function formatMMSS(sec) {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  function updateStudyTimerUI() {
    if ($("studyTimerText")) $("studyTimerText").textContent = formatMMSS(studyTimer.leftSec);
  }

  function stopStudyTimer() {
    studyTimer.running = false;
    if (studyTimer.interval) {
      clearInterval(studyTimer.interval);
      studyTimer.interval = null;
    }
  }

  function renderStudy() {
    const st = ensureStudyReset(getStudyState());
    const t = todayKey();

    if ($("studyStreakDays")) $("studyStreakDays").textContent = String(st.streak);
    if ($("studySessionsToday")) $("studySessionsToday").textContent = String(st.sessionsToday);
    if ($("studyMinutesToday")) $("studyMinutesToday").textContent = String(st.minutesToday);
    if ($("studyPointsToday")) $("studyPointsToday").textContent = String(st.pointsToday);

    const checked = st.lastCheckIn === t;
    if ($("studyCheckinBtn")) $("studyCheckinBtn").disabled = checked;

    if ($("studyCheckinHint")) {
      $("studyCheckinHint").textContent = checked
        ? "You already checked in today ✅ Come back tomorrow for streak bonus."
        : "Check in to earn +10 pts (plus a small streak bonus).";
    }

    updateStudyTimerUI();
  }

  safeOn("studyCheckinBtn", "click", () => {
    const st = ensureStudyReset(getStudyState());
    const t = todayKey();

    if (st.lastCheckIn === t) return renderStudy();

    const y = new Date();
    y.setDate(y.getDate() - 1);
    const yKey = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, "0")}-${String(y.getDate()).padStart(2, "0")}`;

    if (st.lastCheckIn === yKey) st.streak += 1;
    else st.streak = 1;

    st.lastCheckIn = t;

    const bonus = Math.min(20, Math.max(0, (st.streak - 1) * 2));
    const gained = 10 + bonus;

    st.pointsToday += gained;
    setStudyState(st);
    addPoints(gained);

    if ($("studyCheckinHint")) {
      $("studyCheckinHint").textContent = `Checked in ✅ +${gained} pts (streak bonus: +${bonus}).`;
    }

    renderStudy();
    renderRewards();
    updateTotalsAndSidebar();
  });

  safeOn("studyStartBtn", "click", () => {
    if (studyTimer.running) return;
    studyTimer.running = true;
    if ($("studyTimerHint")) $("studyTimerHint").textContent = "Stay focused… you’ve got this ✨";

    studyTimer.interval = setInterval(() => {
      studyTimer.leftSec -= 1;

      if (studyTimer.leftSec <= 0) {
        studyTimer.leftSec = 0;
        updateStudyTimerUI();
        stopStudyTimer();
        onStudySessionCompleted();
        return;
      }
      updateStudyTimerUI();
    }, 1000);
  });

  safeOn("studyPauseBtn", "click", () => {
    if (!studyTimer.running) return;
    stopStudyTimer();
    if ($("studyTimerHint")) $("studyTimerHint").textContent = "Paused. Resume when ready 🙂";
  });

  safeOn("studyResetBtn", "click", () => {
    stopStudyTimer();
    studyTimer.leftSec = studyTimer.totalSec;
    updateStudyTimerUI();
    if ($("studyTimerHint")) $("studyTimerHint").textContent = "Complete a session to earn +50 pts.";
  });

  function onStudySessionCompleted() {
    const st = ensureStudyReset(getStudyState());
    st.sessionsToday += 1;
    st.minutesToday += 25;
    st.pointsToday += 50;
    setStudyState(st);

    addPoints(50);

    studyTimer.leftSec = studyTimer.totalSec;
    updateStudyTimerUI();

    if ($("studyTimerHint")) $("studyTimerHint").textContent = "Session completed ✅ +50 pts added!";

    renderStudy();
    renderRewards();
    updateTotalsAndSidebar();
  }

  function init() {
    bindNav();
    bindCategoryTabs();
    bindMenuControls();
    bindCustomizeButtons();

    renderCart();
    updateTotalsAndSidebar();
    renderRewards();
    renderStudy();
    applyMenuFilters();
    renderOrderOptionHint();
    toggleCardFields();

    const active = document.querySelector(".view.active")?.id;
    if (active) showView(active);
  }

  document.addEventListener("DOMContentLoaded", init);
})();