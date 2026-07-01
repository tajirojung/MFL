const storageKey = "moneyforlife.demo.th.v2";

const seedData = {
  user: {
    name: "ผู้ใช้ทดลอง",
    email: "demo@moneyforlife.app",
  },
  budgets: [
    { category: "อาหาร", limit: 9000 },
    { category: "บ้าน", limit: 18000 },
    { category: "เดินทาง", limit: 6500 },
    { category: "สัตว์เลี้ยง", limit: 4500 },
    { category: "สุขภาพ", limit: 3000 },
    { category: "ช้อปปิ้ง", limit: 5000 },
  ],
  goals: [
    { title: "เงินสำรองฉุกเฉิน", target: 120000, saved: 47500, note: "เงินสำรองประมาณ 4 เดือน" },
    { title: "กันชนค่าผ่อนบ้าน", target: 50000, saved: 17800, note: "กันยอดผ่อนบ้านเดือนหนัก" },
    { title: "กองทุนสัตว์เลี้ยง", target: 24000, saved: 9200, note: "วัคซีน อาหาร ค่ารักษา" },
  ],
  transactions: [
    { id: "t1", type: "income", title: "เงินเดือน", category: "รายรับ", amount: 33000, date: "2026-07-01" },
    { id: "t2", type: "expense", title: "ค่าผ่อนบ้าน", category: "บ้าน", amount: 16700, date: "2026-07-02" },
    { id: "t3", type: "expense", title: "ของกินเข้าบ้าน", category: "อาหาร", amount: 1850, date: "2026-07-03" },
    { id: "t4", type: "expense", title: "ชาร์จรถ EV", category: "เดินทาง", amount: 1240, date: "2026-07-04" },
    { id: "t5", type: "expense", title: "อาหารนับเงิน", category: "สัตว์เลี้ยง", amount: 890, date: "2026-07-05" },
    { id: "t6", type: "expense", title: "คลินิก", category: "สุขภาพ", amount: 650, date: "2026-07-08" },
    { id: "t7", type: "expense", title: "กาแฟ", category: "อาหาร", amount: 85, date: "2026-07-09" },
    { id: "t8", type: "expense", title: "ของใช้ในบ้าน", category: "บ้าน", amount: 1220, date: "2026-07-11" },
    { id: "t9", type: "income", title: "งานเสริม", category: "รายรับ", amount: 4200, date: "2026-07-14" },
    { id: "t10", type: "expense", title: "ฟุตซอล", category: "สุขภาพ", amount: 300, date: "2026-07-15" },
  ],
};

let state = loadState();

const formatter = new Intl.NumberFormat("th-TH", {
  style: "currency",
  currency: "THB",
  maximumFractionDigits: 0,
});

function loadState() {
  const raw = localStorage.getItem(storageKey);
  if (!raw) return structuredClone(seedData);
  try {
    return JSON.parse(raw);
  } catch {
    return structuredClone(seedData);
  }
}

function saveState() {
  localStorage.setItem(storageKey, JSON.stringify(state));
}

function money(value) {
  return formatter.format(value);
}

function totals() {
  const income = state.transactions
    .filter((item) => item.type === "income")
    .reduce((sum, item) => sum + Number(item.amount), 0);
  const expense = state.transactions
    .filter((item) => item.type === "expense")
    .reduce((sum, item) => sum + Number(item.amount), 0);
  const balance = income - expense;
  const savingRate = income > 0 ? Math.max(0, Math.round((balance / income) * 100)) : 0;
  return { income, expense, balance, savingRate };
}

function expenseByCategory() {
  return state.transactions
    .filter((item) => item.type === "expense")
    .reduce((map, item) => {
      map[item.category] = (map[item.category] || 0) + Number(item.amount);
      return map;
    }, {});
}

function render() {
  renderMetrics();
  renderChart();
  renderCategories();
  renderTransactions();
  renderBudgets();
  renderGoals();
  renderInsights();
}

function renderMetrics() {
  const summary = totals();
  document.querySelector("#incomeMetric").textContent = money(summary.income);
  document.querySelector("#expenseMetric").textContent = money(summary.expense);
  document.querySelector("#balanceMetric").textContent = money(summary.balance);
  document.querySelector("#savingMetric").textContent = `${summary.savingRate}%`;

  const score = Math.min(98, Math.max(35, 50 + summary.savingRate + Math.round(summary.balance / 2000)));
  document.querySelector("#lifeScore").textContent = score;
}

function renderChart() {
  const chart = document.querySelector("#cashflowChart");
  chart.innerHTML = "";

  const days = Array.from({ length: 14 }, (_, index) => index + 1);
  const max = Math.max(...state.transactions.map((item) => Number(item.amount)), 1);

  days.forEach((day) => {
    const daily = state.transactions.filter((item) => Number(item.date.slice(-2)) === day);
    const income = daily.filter((item) => item.type === "income").reduce((sum, item) => sum + Number(item.amount), 0);
    const expense = daily.filter((item) => item.type === "expense").reduce((sum, item) => sum + Number(item.amount), 0);

    const group = document.createElement("div");
    group.className = "bar-group";
    group.title = `วันที่ ${day}: รายรับ ${money(income)}, รายจ่าย ${money(expense)}`;

    const incomeBar = document.createElement("span");
    incomeBar.className = "bar income";
    incomeBar.style.height = `${Math.max(3, (income / max) * 200)}px`;

    const expenseBar = document.createElement("span");
    expenseBar.className = "bar expense";
    expenseBar.style.height = `${Math.max(3, (expense / max) * 200)}px`;

    group.append(incomeBar, expenseBar);
    chart.append(group);
  });
}

function renderCategories() {
  const list = document.querySelector("#categoryList");
  const categoryTotals = expenseByCategory();
  const max = Math.max(...Object.values(categoryTotals), 1);

  const items = Object.entries(categoryTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  list.innerHTML = items
    .map(
      ([category, amount]) => `
        <article class="category-item">
          <div class="category-row">
            <strong>${category}</strong>
            <span>${money(amount)}</span>
          </div>
          <div class="progress"><span style="width: ${(amount / max) * 100}%"></span></div>
        </article>
      `,
    )
    .join("");
}

function renderTransactions() {
  const list = document.querySelector("#transactionList");
  const transactions = [...state.transactions].sort((a, b) => b.date.localeCompare(a.date));

  list.innerHTML = transactions
    .map(
      (item) => `
        <article class="transaction-item">
          <div class="transaction-row">
            <div>
              <strong>${item.title}</strong>
              <small>${item.category} · ${item.date}</small>
            </div>
            <div class="${item.type === "income" ? "amount-income" : "amount-expense"}">
              ${item.type === "income" ? "+" : "-"}${money(item.amount)}
            </div>
          </div>
          <div class="transaction-row" style="margin-top: 10px">
            <small>${item.type === "income" ? "รายรับ" : "รายจ่าย"}</small>
            <button class="delete-button" data-delete="${item.id}">ลบ</button>
          </div>
        </article>
      `,
    )
    .join("");

  document.querySelectorAll("[data-delete]").forEach((button) => {
    button.addEventListener("click", () => {
      state.transactions = state.transactions.filter((item) => item.id !== button.dataset.delete);
      saveState();
      render();
      toast("ลบรายการแล้ว");
    });
  });
}

function renderBudgets() {
  const grid = document.querySelector("#budgetGrid");
  const categoryTotals = expenseByCategory();

  grid.innerHTML = state.budgets
    .map((budget) => {
      const used = categoryTotals[budget.category] || 0;
      const percent = Math.min(100, Math.round((used / budget.limit) * 100));
      const status = percent > 90 ? "ใกล้เต็มแล้ว" : percent > 65 ? "เริ่มสูง" : "ยังคุมได้";
      return `
        <article class="budget-card">
          <strong>${budget.category}</strong>
          <p class="muted">${money(used)} / ${money(budget.limit)}</p>
          <div class="progress"><span style="width: ${percent}%"></span></div>
          <p class="muted" style="margin: 12px 0 0">${percent}% · ${status}</p>
        </article>
      `;
    })
    .join("");
}

function renderGoals() {
  const grid = document.querySelector("#goalGrid");
  grid.innerHTML = state.goals
    .map((goal) => {
      const percent = Math.min(100, Math.round((goal.saved / goal.target) * 100));
      return `
        <article class="goal-card">
          <strong>${goal.title}</strong>
          <p class="muted">${goal.note}</p>
          <div class="progress"><span style="width: ${percent}%"></span></div>
          <p class="muted" style="margin: 12px 0 0">${money(goal.saved)} / ${money(goal.target)} · ${percent}%</p>
        </article>
      `;
    })
    .join("");
}

function renderInsights() {
  const { income, expense, balance, savingRate } = totals();
  const categoryTotals = expenseByCategory();
  const topCategory = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0];
  const headline = balance >= 0 ? "เดือนนี้ยังเหลือเงิน แต่ต้องคุมหมวดใหญ่" : "เดือนนี้ติดลบ ต้องลดรายจ่ายด่วน";
  const text = topCategory
    ? `หมวด ${topCategory[0]} ใช้สูงสุดที่ ${money(topCategory[1])} จากรายจ่ายรวม ${money(expense)} อัตราเก็บเงินตอนนี้ ${savingRate}%`
    : "ยังไม่มีรายจ่ายพอให้วิเคราะห์ ลองเพิ่มรายการใหม่ในหน้า รายการเงิน";

  document.querySelector("#insightHeadline").textContent = headline;
  document.querySelector("#insightText").textContent = text;

  const alerts = [
    income === 0 ? "ยังไม่มีรายรับในเดือนนี้" : `รายรับรวม ${money(income)} แล้ว`,
    balance < 5000 ? "ยอดคงเหลือต่ำกว่า 5,000 ควรชะลอรายจ่ายไม่จำเป็น" : "ยอดคงเหลือยังมี buffer ดี",
    topCategory ? `หมวดที่ควรดูเป็นพิเศษ: ${topCategory[0]}` : "เพิ่ม transaction เพื่อเริ่ม insight",
  ];

  document.querySelector("#alertList").innerHTML = alerts
    .map(
      (alert) => `
        <article class="alert-item">
          <strong>${alert}</strong>
          <p style="margin: 6px 0 0">ระบบ demo คำนวณจากข้อมูลใน localStorage</p>
        </article>
      `,
    )
    .join("");
}

function toast(message) {
  const element = document.querySelector("#toast");
  element.textContent = message;
  element.classList.add("show");
  window.setTimeout(() => element.classList.remove("show"), 2400);
}

document.querySelectorAll(".nav-item").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".nav-item").forEach((item) => item.classList.remove("active"));
    document.querySelectorAll(".view").forEach((view) => view.classList.remove("active"));
    button.classList.add("active");
    document.querySelector(`#${button.dataset.view}`).classList.add("active");
    document.querySelector("#viewTitle").textContent = button.textContent;
  });
});

document.querySelector("#dateInput").valueAsDate = new Date();

document.querySelector("#transactionForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const amount = Number(document.querySelector("#amountInput").value);
  if (!Number.isFinite(amount) || amount <= 0) return;

  state.transactions.push({
    id: crypto.randomUUID(),
    type: document.querySelector("#typeInput").value,
    amount,
    title: document.querySelector("#titleInput").value.trim(),
    category: document.querySelector("#categoryInput").value,
    date: document.querySelector("#dateInput").value,
  });

  event.target.reset();
  document.querySelector("#dateInput").valueAsDate = new Date();
  saveState();
  render();
  toast("เพิ่มรายการเรียบร้อย");
});

document.querySelector("#seedButton").addEventListener("click", () => {
  state = structuredClone(seedData);
  saveState();
  render();
  toast("รีเซ็ตข้อมูล demo แล้ว");
});

document.querySelector("#loginButton").addEventListener("click", () => {
  toast("โหมดทดลอง: เมื่อต่อ Supabase Auth แล้ว ปุ่มนี้จะเข้าสู่ระบบ Google ได้จริง");
});

render();
