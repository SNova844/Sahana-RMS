// Firebase database instance imported from the shared project config
import { db } from "../../js/firebase-config.js";
import {
  collection,
  doc,
  getDocs,
  setDoc,
  writeBatch
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

// Firestore collection names used by this stock module
const COLLECTIONS = {
  items: "stock_items",
  transactions: "stock_transactions",
  purchases: "stock_purchases",
  suppliers: "suppliers"
};

// Default demo data. This is only used the first time when Firestore is empty.
const defaultData = {
  items: [
    {
      id: crypto.randomUUID(),
      name: "Wheat Flour",
      category: "Raw Material",
      itemKind: "ingredient",
      unit: "kg",
      trackingMode: "bulk",
      qtyOnHand: 18,
      reorderLevel: 8,
      supplier: "Galle Grain Stores",
      unitCost: 265,
      status: "active",
      lastUpdated: new Date().toISOString(),
      notes: "Track by weekly stock check."
    },
    {
      id: crypto.randomUUID(),
      name: "Coca-Cola 500ml",
      category: "Beverage",
      itemKind: "finished",
      unit: "bottles",
      trackingMode: "counted",
      qtyOnHand: 42,
      reorderLevel: 18,
      supplier: "Ceylon Beverage Distributors",
      unitCost: 180,
      status: "active",
      lastUpdated: new Date().toISOString(),
      notes: "Finished item with exact unit counting."
    },
    {
      id: crypto.randomUUID(),
      name: "Butter",
      category: "Dairy",
      itemKind: "ingredient",
      unit: "kg",
      trackingMode: "hybrid",
      qtyOnHand: 5.5,
      reorderLevel: 3,
      supplier: "Lanka Fresh Foods",
      unitCost: 2400,
      status: "active",
      lastUpdated: new Date().toISOString(),
      notes: "Use purchases plus kitchen adjustment."
    },
    {
      id: crypto.randomUUID(),
      name: "Biscuit Packets",
      category: "Retail Snack",
      itemKind: "finished",
      unit: "packs",
      trackingMode: "counted",
      qtyOnHand: 9,
      reorderLevel: 12,
      supplier: "Daily Choice Agencies",
      unitCost: 95,
      status: "active",
      lastUpdated: new Date().toISOString(),
      notes: "Low stock sample for alerts."
    }
  ],
  transactions: [],
  purchases: []
};

// Generate a short readable ID like PO-XXXXXX or TXN-XXXXXX
function generateCode(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

// Format numbers for table display
function formatNumber(value) {
  const num = Number(value || 0);
  return num.toLocaleString(undefined, {
    minimumFractionDigits: num % 1 === 0 ? 0 : 1,
    maximumFractionDigits: 2
  });
}

// Format LKR values for UI display
function formatMoney(value) {
  return `LKR ${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

// Format stored date/time into a readable UI string
function formatDate(date) {
  return new Date(date).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

// Convert a date into YYYY-MM-DD for HTML date inputs
function formatDateForInput(date) {
  return new Date(date).toISOString().slice(0, 10);
}

function formatDateOnly(date) {
  if (!date) return "-";
  return new Date(`${date}T00:00:00`).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function getPurchaseTotal(purchase) {
  const fallback = Number(purchase.quantity || 0) * Number(purchase.unitPrice || 0);
  return Number.isFinite(Number(purchase.total)) && Number(purchase.total) > 0 ? Number(purchase.total) : fallback;
}

function getPurchasePaidAmount(purchase) {
  const total = getPurchaseTotal(purchase);
  const storedPaid = Number(purchase.paidAmount);
  if (Number.isFinite(storedPaid)) return Math.min(Math.max(storedPaid, 0), total);
  if (purchase.paymentStatus === "Paid") return total;
  if (purchase.paymentStatus === "Pending") return 0;
  return 0;
}

function getPurchasePendingAmount(purchase) {
  return Math.max(getPurchaseTotal(purchase) - getPurchasePaidAmount(purchase), 0);
}

function isPurchaseOverdue(purchase) {
  const pending = getPurchasePendingAmount(purchase);
  if (pending <= 0 || !purchase.dueDate) return false;
  return new Date(`${purchase.dueDate}T23:59:59`).getTime() < Date.now();
}

function calculatePaymentAmounts(total, status, rawPaid) {
  if (status === "Paid") return { paidAmount: total, pendingAmount: 0 };
  if (status === "Pending") return { paidAmount: 0, pendingAmount: total };
  const paidAmount = Math.min(Math.max(Number(rawPaid || 0), 0), total);
  return { paidAmount, pendingAmount: Math.max(total - paidAmount, 0) };
}

// Prevent raw user text from breaking HTML output in tables/modals
function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

// Escape text correctly before building a CSV file
function csvEscape(value) {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

// Create and download a CSV file on the client side
function downloadCsv(filename, rows) {
  const content = rows.map((row) => row.map(csvEscape).join(",")).join("\n");
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

// Create sample purchase/transaction history from the default items
function seedDerivedRecords(data) {
  if (!data.transactions.length && !data.purchases.length) {
    const flour = data.items.find((item) => item.name === "Wheat Flour");
    const coke = data.items.find((item) => item.name.includes("Coca-Cola"));
    const biscuits = data.items.find((item) => item.name.includes("Biscuit"));
    const now = new Date();

    if (flour) {
      data.purchases.push({
        id: generateCode("PO"),
        date: formatDateForInput(now),
        supplier: flour.supplier,
        itemId: flour.id,
        itemName: flour.name,
        unit: flour.unit,
        quantity: 12,
        unitPrice: 260,
        total: 3120,
        paidAmount: 3120,
        pendingAmount: 0,
        paymentStatus: "Paid",
        dueDate: "",
        invoiceNo: "BILL-FLOUR-001",
        purchasedBy: "Admin",
        note: "Weekly bakery stock refill"
      });
      data.transactions.push({
        id: generateCode("TXN"),
        date: now.toISOString(),
        itemId: flour.id,
        itemName: flour.name,
        type: "PURCHASE",
        quantity: 12,
        unit: flour.unit,
        previousQty: 6,
        newQty: flour.qtyOnHand,
        reason: "Weekly bakery stock refill",
        recordedBy: "Admin"
      });
    }

    if (coke) {
      data.purchases.push({
        id: generateCode("PO"),
        date: formatDateForInput(new Date(now.getTime() - 86400000)),
        supplier: coke.supplier,
        itemId: coke.id,
        itemName: coke.name,
        unit: coke.unit,
        quantity: 50,
        unitPrice: 175,
        total: 8750,
        paidAmount: 5000,
        pendingAmount: 3750,
        paymentStatus: "Partially Paid",
        dueDate: formatDateForInput(new Date(now.getTime() + 604800000)),
        invoiceNo: "BILL-BEV-001",
        purchasedBy: "Cashier",
        note: "Beverage refill from supplier credit account"
      });
      data.transactions.push({
        id: generateCode("TXN"),
        date: new Date(now.getTime() - 86400000).toISOString(),
        itemId: coke.id,
        itemName: coke.name,
        type: "OUT",
        quantity: -8,
        unit: coke.unit,
        previousQty: 50,
        newQty: coke.qtyOnHand,
        reason: "Counter sales and dine-in service",
        recordedBy: "Cashier"
      });
    }

    if (biscuits) {
      data.purchases.push({
        id: generateCode("PO"),
        date: formatDateForInput(new Date(now.getTime() - 172800000)),
        supplier: biscuits.supplier,
        itemId: biscuits.id,
        itemName: biscuits.name,
        unit: biscuits.unit,
        quantity: 12,
        unitPrice: 95,
        total: 1140,
        paidAmount: 0,
        pendingAmount: 1140,
        paymentStatus: "Pending",
        dueDate: formatDateForInput(new Date(now.getTime() - 86400000)),
        invoiceNo: "BILL-SNACK-001",
        purchasedBy: "Admin",
        note: "Pending supplier bill used to demonstrate owner payable summary"
      });
      data.transactions.push({
        id: generateCode("TXN"),
        date: new Date(now.getTime() - 172800000).toISOString(),
        itemId: biscuits.id,
        itemName: biscuits.name,
        type: "ADJUSTMENT",
        quantity: -3,
        unit: biscuits.unit,
        previousQty: 12,
        newQty: biscuits.qtyOnHand,
        reason: "Damaged packets removed from shelf",
        recordedBy: "Storekeeper"
      });
    }
  }
  return data;
}

// In-memory state used by the page after data is loaded from Firestore
let state = { items: [], transactions: [], purchases: [], suppliers: [] };
let currentFilter = "all";
let currentModal = null;
let currentView = "overviewView";
const pagerState = {
  overviewItems: { page: 1, size: 6 },
  overviewAlerts: { page: 1, size: 6 },
  items: { page: 1, size: 6 },
  alerts: { page: 1, size: 6 },
  supplierSummary: { page: 1, size: 6 },
  supplierLinks: { page: 1, size: 6 },
  purchases: { page: 1, size: 6 },
  transactions: { page: 1, size: 6 }
};


// Elements used only for mobile sidebar behavior
const mobileUi = {
  menuToggle: document.getElementById("menuToggle"),
  sidebar: document.getElementById("stockSidebar"),
  overlay: document.getElementById("mobileOverlay")
};

function closeMobileSidebar() {
  mobileUi.sidebar?.classList.remove("show");
  mobileUi.overlay?.classList.remove("show");
}

function toggleMobileSidebar() {
  mobileUi.sidebar?.classList.toggle("show");
  mobileUi.overlay?.classList.toggle("show");
}

// Frequently used DOM references collected in one place for easy access
const els = {
  body: document.body,
  itemForm: document.getElementById("itemForm"),
  purchaseForm: document.getElementById("purchaseForm"),
  transactionForm: document.getElementById("transactionForm"),
  itemSelectPurchase: document.getElementById("purchaseItemId"),
  itemSelectTxn: document.getElementById("txnItemId"),
  supplierDatalist: document.getElementById("supplierList"),
  overviewItemsTable: document.getElementById("overviewItemsTableBody"),
  itemsTable: document.getElementById("itemsTableBody"),
  lowStockTable: document.getElementById("lowStockTableBody"),
  lowStockTableDuplicate: document.getElementById("lowStockTableBodyDuplicate"),
  transactionTable: document.getElementById("transactionTableBody"),
  purchaseTable: document.getElementById("purchaseTableBody"),
  supplierSummaryTable: document.getElementById("supplierSummaryTableBody"),
  supplierLinksTable: document.getElementById("supplierLinksTableBody"),
  searchInput: document.getElementById("stockSearch"),
  searchInputMirror: document.getElementById("stockSearchMirror"),
  typeFilter: document.getElementById("typeFilter"),
  typeFilterMirror: document.getElementById("typeFilterMirror"),
  categoryFilter: document.getElementById("categoryFilter"),
  categoryFilterMirror: document.getElementById("categoryFilterMirror"),
  alertsSearch: document.getElementById("alertsSearch"),
  alertsStatusFilter: document.getElementById("alertsStatusFilter"),
  supplierLinkSearch: document.getElementById("supplierLinkSearch"),
  supplierLinkStatusFilter: document.getElementById("supplierLinkStatusFilter"),
  supplierSummarySearch: document.getElementById("supplierSummarySearch"),
  supplierSummaryFromDate: document.getElementById("supplierSummaryFromDate"),
  supplierSummaryToDate: document.getElementById("supplierSummaryToDate"),
  supplierSummaryPaymentFilter: document.getElementById("supplierSummaryPaymentFilter"),
  supplierSummarySourceFilter: document.getElementById("supplierSummarySourceFilter"),
  supplierSummarySort: document.getElementById("supplierSummarySort"),
  clearSupplierSummaryFilters: document.getElementById("clearSupplierSummaryFilters"),
  supplierSummaryTotalSuppliers: document.getElementById("supplierSummaryTotalSuppliers"),
  supplierSummaryTotalPurchases: document.getElementById("supplierSummaryTotalPurchases"),
  supplierSummaryTotalValue: document.getElementById("supplierSummaryTotalValue"),
  supplierSummaryPaidValue: document.getElementById("supplierSummaryPaidValue"),
  supplierSummaryPendingValue: document.getElementById("supplierSummaryPendingValue"),
  supplierSummaryOverdueCount: document.getElementById("supplierSummaryOverdueCount"),
  purchaseSearch: document.getElementById("purchaseSearch"),
  purchaseStatusFilter: document.getElementById("purchaseStatusFilter"),
  purchaseDateFilter: document.getElementById("purchaseDateFilter"),
  transactionSearch: document.getElementById("transactionSearch"),
  transactionTypeFilter: document.getElementById("transactionTypeFilter"),
  transactionDateFilter: document.getElementById("transactionDateFilter"),
  summaryTotalItems: document.getElementById("summaryTotalItems"),
  summaryLowItems: document.getElementById("summaryLowItems"),
  summaryOutItems: document.getElementById("summaryOutItems"),
  summaryTransactions: document.getElementById("summaryTransactions"),
  summaryValue: document.getElementById("summaryValue"),
  pageBreadcrumbs: document.getElementById("pageBreadcrumbs"),
  pageTitle: document.getElementById("pageTitle"),
  heroActiveItems: document.getElementById("heroActiveItems"),
  heroSupplierCount: document.getElementById("heroSupplierCount"),
  heroAttentionCount: document.getElementById("heroAttentionCount"),
  itemsHeroTotal: document.getElementById("itemsHeroTotal"),
  itemsHeroLow: document.getElementById("itemsHeroLow"),
  itemsHeroCategories: document.getElementById("itemsHeroCategories"),
  itemsHeaderActive: document.getElementById("itemsHeaderActive"),
  itemsHeaderBulk: document.getElementById("itemsHeaderBulk"),
  itemsHeaderCounted: document.getElementById("itemsHeaderCounted"),
  itemsHeaderActiveMirror: document.getElementById("itemsHeaderActiveMirror"),
  itemsHeaderBulkMirror: document.getElementById("itemsHeaderBulkMirror"),
  itemsHeaderCountedMirror: document.getElementById("itemsHeaderCountedMirror"),
  toast: document.getElementById("toast"),
  pills: Array.from(document.querySelectorAll(".pill")),
  itemNameInput: document.getElementById("itemName"),
  itemKindInput: document.getElementById("itemKind"),
  trackingModeInput: document.getElementById("trackingMode"),
  itemModal: document.getElementById("itemModal"),
  purchaseModal: document.getElementById("purchaseModal"),
  transactionModal: document.getElementById("transactionModal"),
  exportModal: document.getElementById("exportModal"),
  modalBackdrop: document.getElementById("modalBackdrop"),
  itemModalTitle: document.getElementById("itemModalTitle"),
  itemSubmitBtn: document.getElementById("itemSubmitBtn"),
  viewButtons: Array.from(document.querySelectorAll("button[data-view]")),
  views: Array.from(document.querySelectorAll(".content-view")),
  goToItemsBtn: document.getElementById("goToItemsBtn"),
  goToAlertsBtn: document.getElementById("goToAlertsBtn"),
  openPurchaseFromSupplierBtn: document.getElementById("openPurchaseModalBtnSupplier"),
  openPurchaseFromSupplierSummaryBtn: document.getElementById("openPurchaseModalBtnSupplierSummary")
};

// Add/remove a page-level loading style while async work is happening
function setLoading(isLoading) {
  els.body.classList.toggle("loading-state", isLoading);
}

// Small toast message used for success/error feedback
function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => els.toast.classList.remove("show"), 2800);
}

// Find a stock item from the current state by its ID
function getItemById(id) {
  return state.items.find((item) => item.id === id);
}

// Decide whether an item is In Stock, Low Stock, or Out of Stock
function getItemStatus(item) {
  if (Number(item.qtyOnHand) <= 0) return { label: "Out of Stock", className: "status-out-stock" };
  if (Number(item.qtyOnHand) <= Number(item.reorderLevel)) return { label: "Low Stock", className: "status-low-stock" };
  return { label: "In Stock", className: "status-in-stock" };
}

function getTypeBadge(type) {
  const map = { IN: "type-in", OUT: "type-out", ADJUSTMENT: "type-adjustment", PURCHASE: "type-purchase" };
  return map[type] || "type-adjustment";
}

function getModeLabel(mode) {
  const map = { counted: "Counted", bulk: "Bulk Ingredient", hybrid: "Hybrid" };
  return map[mode] || mode;
}

// Normalize names so supplier links from purchases, item records, and Supplier Management match reliably
function normalizeText(value) {
  return String(value || "").trim().toLowerCase().replace(/\s+/g, " ");
}

function normalizeLoose(value) {
  return normalizeText(value).replace(/[^a-z0-9]+/g, "");
}

function getSupplierDisplayName(supplier) {
  return supplier?.companyName || supplier?.name || supplier?.supplierName || supplier?.businessName || "";
}

function getSupplierContact(supplier) {
  return supplier?.phone || supplier?.contact || supplier?.contactNo || supplier?.mobile || supplier?.telephone || "";
}

function getSupplierEmail(supplier) {
  return supplier?.email || supplier?.supplierEmail || "";
}

function getSupplierStatus(supplier) {
  return supplier?.status || supplier?.supplierStatus || "Active";
}

function getRegisteredSupplierByName(name) {
  const key = normalizeText(name);
  if (!key) return null;
  return state.suppliers.find((supplier) => normalizeText(getSupplierDisplayName(supplier)) === key) || null;
}

function splitSupplierItemsText(value) {
  return String(value || "")
    .split(/[,|;/\n]+/)
    .map((part) => normalizeText(part))
    .filter(Boolean);
}

function supplierCatalogMentionsItem(supplier, item) {
  const suppliedText = supplier?.itemSupplied || supplier?.itemsSupplied || supplier?.products || supplier?.category || "";
  const suppliedValues = splitSupplierItemsText(suppliedText);
  if (!suppliedValues.length) return false;
  const itemName = normalizeText(item.name);
  const itemCategory = normalizeText(item.category);
  const itemNameLoose = normalizeLoose(item.name);
  const itemCategoryLoose = normalizeLoose(item.category);
  return suppliedValues.some((value) => {
    const loose = normalizeLoose(value);
    return value === itemName
      || value === itemCategory
      || itemName.includes(value)
      || value.includes(itemName)
      || itemCategory.includes(value)
      || value.includes(itemCategory)
      || (loose && (itemNameLoose.includes(loose) || itemCategoryLoose.includes(loose) || loose.includes(itemNameLoose) || loose.includes(itemCategoryLoose)));
  });
}

function getAllKnownSupplierNames() {
  const supplierNames = new Set();
  state.suppliers.forEach((supplier) => {
    const name = getSupplierDisplayName(supplier).trim();
    if (name) supplierNames.add(name);
  });
  state.purchases.forEach((purchase) => {
    const name = String(purchase.supplier || "").trim();
    if (name) supplierNames.add(name);
  });
  state.items.forEach((item) => {
    const name = String(item.supplier || "").trim();
    if (name) supplierNames.add(name);
  });
  return [...supplierNames].sort((a, b) => a.localeCompare(b));
}

function getItemPurchases(item) {
  const itemId = String(item.id || "");
  const itemName = normalizeText(item.name);
  return state.purchases
    .filter((purchase) => String(purchase.itemId || "") === itemId || normalizeText(purchase.itemName) === itemName)
    .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
}

function getItemSourceRecords(item) {
  const sources = new Map();
  const ensureSource = (name) => {
    const cleanName = String(name || "").trim();
    if (!cleanName) return null;
    const key = normalizeText(cleanName);
    if (!sources.has(key)) {
      const registered = getRegisteredSupplierByName(cleanName);
      sources.set(key, {
        name: cleanName,
        registered,
        contact: registered ? getSupplierContact(registered) : "",
        email: registered ? getSupplierEmail(registered) : "",
        supplierStatus: registered ? getSupplierStatus(registered) : "",
        purchaseCount: 0,
        lastDate: "",
        lastPrice: null,
        latestPurchase: null,
        sources: new Set()
      });
    }
    return sources.get(key);
  };

  getItemPurchases(item).forEach((purchase) => {
    const record = ensureSource(purchase.supplier);
    if (!record) return;
    record.sources.add("Purchase");
    record.purchaseCount += 1;
    const purchaseDate = purchase.date || "";
    if (!record.lastDate || new Date(purchaseDate) > new Date(record.lastDate)) {
      record.lastDate = purchaseDate;
      record.lastPrice = Number(purchase.unitPrice || 0);
      record.latestPurchase = purchase;
    }
  });

  state.suppliers.forEach((supplier) => {
    if (!supplierCatalogMentionsItem(supplier, item)) return;
    const name = getSupplierDisplayName(supplier);
    const record = ensureSource(name);
    if (!record) return;
    record.sources.add("Supplier Management");
    record.registered = supplier;
    record.contact = getSupplierContact(supplier);
    record.email = getSupplierEmail(supplier);
    record.supplierStatus = getSupplierStatus(supplier);
  });

  if (item.supplier) {
    const record = ensureSource(item.supplier);
    if (record) record.sources.add("Legacy Item Record");
  }

  return [...sources.values()].sort((a, b) => {
    const aDate = a.lastDate ? new Date(a.lastDate).getTime() : 0;
    const bDate = b.lastDate ? new Date(b.lastDate).getTime() : 0;
    if (bDate !== aDate) return bDate - aDate;
    if (Boolean(b.registered) !== Boolean(a.registered)) return Boolean(b.registered) - Boolean(a.registered);
    return a.name.localeCompare(b.name);
  });
}

function getPrimarySource(item) {
  const sources = getItemSourceRecords(item);
  return sources.find((source) => source.lastDate) || sources[0] || null;
}

function getSourceSummaryText(item) {
  const sources = getItemSourceRecords(item);
  if (!sources.length) return "No supplier linked yet";
  if (sources.length === 1) return "1 linked supplier";
  return `${sources.length} linked suppliers`;
}

function renderSupplierChips(sources, max = 3) {
  if (!sources.length) return `<span class="source-empty">No source link</span>`;
  const visible = sources.slice(0, max).map((source) => {
    const registeredClass = source.registered ? " registered" : "";
    const titleParts = [
      source.registered ? "Registered supplier" : "Purchase/legacy source",
      source.contact ? `Contact: ${source.contact}` : "",
      source.lastDate ? `Last: ${source.lastDate}` : ""
    ].filter(Boolean);
    return `<span class="source-chip${registeredClass}" title="${escapeHtml(titleParts.join(" • "))}">${escapeHtml(source.name)}</span>`;
  }).join("");
  const more = sources.length > max ? `<span class="source-chip more">+${sources.length - max}</span>` : "";
  return visible + more;
}

// Title + breadcrumb text for each sidebar tab
const VIEW_META = {
  overviewView: { title: "Stock Overview", crumbs: ["Home", "Management", "Stock Overview"] },
  itemsView: { title: "Stock Items", crumbs: ["Home", "Management", "Stock Items"] },
  alertsView: { title: "Low Stock", crumbs: ["Home", "Management", "Low Stock"] },
  supplierSummaryView: { title: "Supplier Summary", crumbs: ["Home", "Management", "Supplier Summary"] },
  supplierLinksView: { title: "Supplier Links", crumbs: ["Home", "Management", "Supplier Links"] },
  purchasesView: { title: "Purchases", crumbs: ["Home", "Management", "Purchases"] },
  transactionsView: { title: "Transactions", crumbs: ["Home", "Management", "Transactions"] }
};

// Update the page heading and breadcrumb when the user changes tabs
function updatePageHeader(viewId) {
  const meta = VIEW_META[viewId] || VIEW_META.overviewView;
  if (els.pageTitle) els.pageTitle.textContent = meta.title;
  if (els.pageBreadcrumbs) {
    els.pageBreadcrumbs.innerHTML = meta.crumbs.map((part, index) => index === 0 ? part : `<span>/</span> ${part}`).join(' ');
  }
}

// Fill the small summary counts shown in the page headers
function renderSectionHighlights() {
  const activeItems = state.items.filter((item) => item.status !== "inactive").length;
  const supplierCount = getAllKnownSupplierNames().length;
  const attentionCount = state.items.filter((item) => Number(item.qtyOnHand) <= Number(item.reorderLevel)).length;
  const lowCount = attentionCount;
  const categoriesCount = new Set(state.items.map((item) => (item.category || '').trim()).filter(Boolean)).size;
  const bulkCount = state.items.filter((item) => item.trackingMode === 'bulk').length;
  const countedCount = state.items.filter((item) => item.trackingMode === 'counted').length;

  if (els.heroActiveItems) els.heroActiveItems.textContent = activeItems;
  if (els.heroSupplierCount) els.heroSupplierCount.textContent = supplierCount;
  if (els.heroAttentionCount) els.heroAttentionCount.textContent = attentionCount;
  if (els.itemsHeroTotal) els.itemsHeroTotal.textContent = state.items.length;
  if (els.itemsHeroLow) els.itemsHeroLow.textContent = lowCount;
  if (els.itemsHeroCategories) els.itemsHeroCategories.textContent = categoriesCount;
  if (els.itemsHeaderActive) els.itemsHeaderActive.textContent = activeItems;
  if (els.itemsHeaderBulk) els.itemsHeaderBulk.textContent = bulkCount;
  if (els.itemsHeaderCounted) els.itemsHeaderCounted.textContent = countedCount;
  if (els.itemsHeaderActiveMirror) els.itemsHeaderActiveMirror.textContent = activeItems;
  if (els.itemsHeaderBulkMirror) els.itemsHeaderBulkMirror.textContent = bulkCount;
  if (els.itemsHeaderCountedMirror) els.itemsHeaderCountedMirror.textContent = countedCount;
}

// Read all documents from one Firestore collection
async function fetchCollection(name) {
  const snap = await getDocs(collection(db, name));
  return snap.docs.map((entry) => ({ id: entry.id, ...entry.data() }));
}

// Save a stock item document into Firestore
async function persistItem(item) {
  await setDoc(doc(db, COLLECTIONS.items, item.id), item);
}

// Save a stock transaction document into Firestore
async function persistTransaction(txn) {
  await setDoc(doc(db, COLLECTIONS.transactions, txn.id), txn);
}

// Save a stock purchase document into Firestore
async function persistPurchase(purchase) {
  await setDoc(doc(db, COLLECTIONS.purchases, purchase.id), purchase);
}

// If Firestore has no stock data yet, insert the default seed data
async function seedFirebaseIfEmpty() {
  const [items, transactions, purchases, suppliers] = await Promise.all([
    fetchCollection(COLLECTIONS.items),
    fetchCollection(COLLECTIONS.transactions),
    fetchCollection(COLLECTIONS.purchases),
    fetchCollection(COLLECTIONS.suppliers).catch((error) => { console.warn("Supplier Management collection could not be read.", error); return []; })
  ]);

  if (items.length || transactions.length || purchases.length) {
    state = { items, transactions, purchases, suppliers };
    return;
  }

  const seeded = seedDerivedRecords(structuredClone(defaultData));
  const batch = writeBatch(db);
  seeded.items.forEach((item) => batch.set(doc(db, COLLECTIONS.items, item.id), item));
  seeded.transactions.forEach((txn) => batch.set(doc(db, COLLECTIONS.transactions, txn.id), txn));
  seeded.purchases.forEach((purchase) => batch.set(doc(db, COLLECTIONS.purchases, purchase.id), purchase));
  await batch.commit();
  state = { ...seeded, suppliers };
}

// Reload fresh data from Firestore after any save/update action
async function refreshStateFromFirestore() {
  const [items, transactions, purchases, suppliers] = await Promise.all([
    fetchCollection(COLLECTIONS.items),
    fetchCollection(COLLECTIONS.transactions),
    fetchCollection(COLLECTIONS.purchases),
    fetchCollection(COLLECTIONS.suppliers).catch((error) => { console.warn("Supplier Management collection could not be read.", error); return []; })
  ]);
  state = { items, transactions, purchases, suppliers };
}

// Keep overview filters and full table filters synchronized
function syncFilters(source = "overview") {
  if (source === "overview") {
    els.searchInputMirror.value = els.searchInput.value;
    els.typeFilterMirror.value = els.typeFilter.value;
    els.categoryFilterMirror.value = els.categoryFilter.value;
  } else {
    els.searchInput.value = els.searchInputMirror.value;
    els.typeFilter.value = els.typeFilterMirror.value;
    els.categoryFilter.value = els.categoryFilterMirror.value;
  }
}

// Rebuild dropdown options when item/category/supplier data changes
function renderSelectOptions() {
  const options = state.items
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((item) => `<option value="${item.id}">${escapeHtml(item.name)} (${escapeHtml(item.unit)})</option>`)
    .join("");

  els.itemSelectPurchase.innerHTML = `<option value="">Select item</option>${options}`;
  els.itemSelectTxn.innerHTML = `<option value="">Select item</option>${options}`;

  const suppliers = getAllKnownSupplierNames();
  els.supplierDatalist.innerHTML = suppliers.map((name) => `<option value="${escapeHtml(name)}"></option>`).join("");

  const categories = [...new Set(state.items.map((item) => item.category).filter(Boolean))].sort();
  const categoryOptions = `<option value="all">All categories</option>${categories.map((category) => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`).join("")}`;
  els.categoryFilter.innerHTML = categoryOptions;
  els.categoryFilterMirror.innerHTML = categoryOptions;
  syncFilters(currentView === "itemsView" ? "items" : "overview");
}

// Fill the summary cards on the overview page
function renderSummary() {
  const totalItems = state.items.length;
  const lowItems = state.items.filter((item) => Number(item.qtyOnHand) > 0 && Number(item.qtyOnHand) <= Number(item.reorderLevel)).length;
  const outItems = state.items.filter((item) => Number(item.qtyOnHand) <= 0).length;
  const stockValue = state.items.reduce((sum, item) => sum + Number(item.qtyOnHand) * Number(item.unitCost || 0), 0);

  els.summaryTotalItems.textContent = totalItems;
  els.summaryLowItems.textContent = lowItems;
  els.summaryOutItems.textContent = outItems;
  els.summaryTransactions.textContent = state.transactions.length;
  els.summaryValue.textContent = formatMoney(stockValue);
}

// Return stock items after applying search, dropdown, and pill filters
function getFilteredItems() {
  const search = els.searchInput.value.trim().toLowerCase();
  const typeFilter = els.typeFilter.value;
  const categoryFilter = els.categoryFilter.value;

  return state.items.filter((item) => {
    const sourceNames = getItemSourceRecords(item).map((source) => source.name).join(" ");
    const matchesSearch = !search || [item.name, item.category, item.unit, sourceNames].some((value) => String(value || "").toLowerCase().includes(search));
    const matchesType = typeFilter === "all" || item.itemKind === typeFilter;
    const matchesCategory = categoryFilter === "all" || item.category === categoryFilter;
    const status = getItemStatus(item);
    const matchesPill = currentFilter === "all"
      || (currentFilter === "low" && status.label === "Low Stock")
      || (currentFilter === "out" && status.label === "Out of Stock")
      || (currentFilter === "bulk" && item.trackingMode === "bulk")
      || (currentFilter === "counted" && item.trackingMode === "counted");

    return matchesSearch && matchesType && matchesCategory && matchesPill;
  }).sort((a, b) => a.name.localeCompare(b.name));
}

// Slice large datasets into pages so tables stay compact
function paginateRows(rows, pagerKey) {
  const pager = pagerState[pagerKey];
  const total = rows.length;
  const pages = Math.max(Math.ceil(total / pager.size), 1);
  if (pager.page > pages) pager.page = pages;
  const start = (pager.page - 1) * pager.size;
  const pagedRows = rows.slice(start, start + pager.size);
  return { rows: pagedRows, total, start, end: Math.min(start + pager.size, total), pages, page: pager.page };
}

// Update footer text and previous/next buttons for a paged table
function updatePagerUI(prefix, meta) {
  const metaEl = document.getElementById(`${prefix}Meta`);
  const indicatorEl = document.getElementById(`${prefix}PageIndicator`);
  const prevBtn = document.getElementById(`${prefix}PrevBtn`);
  const nextBtn = document.getElementById(`${prefix}NextBtn`);
  if (metaEl) metaEl.textContent = meta.total ? `Showing ${meta.start + 1} to ${meta.end} of ${meta.total} entries` : `Showing 0 to 0 of 0 entries`;
  if (indicatorEl) indicatorEl.textContent = `${meta.page} / ${meta.pages}`;
  if (prevBtn) prevBtn.disabled = meta.page <= 1;
  if (nextBtn) nextBtn.disabled = meta.page >= meta.pages;
}

// Build one HTML row for the stock item tables
function itemRowMarkup(item) {
  const status = getItemStatus(item);
  const sourceCount = getItemSourceRecords(item).length;
  return `
    <tr>
      <td>
        <strong class="item-name">${escapeHtml(item.name)}</strong>
        <div class="note">${escapeHtml(sourceCount ? getSourceSummaryText(item) : "No supplier link yet")} <button class="inline-link-btn" type="button" onclick="showSupplierSources('${item.id}')">view</button></div>
      </td>
      <td>${escapeHtml(item.category)}</td>
      <td><span class="mode-badge mode-${escapeHtml(item.trackingMode)}">${escapeHtml(getModeLabel(item.trackingMode))}</span></td>
      <td>${escapeHtml(item.itemKind === "ingredient" ? "Raw material" : "Finished item")}</td>
      <td><strong>${formatNumber(item.qtyOnHand)}</strong> ${escapeHtml(item.unit)}</td>
      <td>${formatNumber(item.reorderLevel)} ${escapeHtml(item.unit)}</td>
      <td><span class="status-badge ${status.className}">${status.label}</span></td>
      <td>${formatDate(item.lastUpdated)}</td>
      <td>
        <div class="table-actions">
          <button class="icon-btn" type="button" onclick="editItem('${item.id}')" title="Edit"><i class="fa-solid fa-pen"></i></button>
          <button class="icon-btn" type="button" onclick="prefillPurchase('${item.id}')" title="Purchase"><i class="fa-solid fa-plus"></i></button>
          <button class="icon-btn" type="button" onclick="prefillTransaction('${item.id}')" title="Transaction"><i class="fa-solid fa-minus"></i></button>
        </div>
      </td>
    </tr>`;
}

// Build one HTML row for low stock alert tables
function lowStockRowMarkup(item) {
  const status = getItemStatus(item);
  const suggested = Math.max(Number(item.reorderLevel) * 2 - Number(item.qtyOnHand), 0);
  return `
    <tr>
      <td><strong>${escapeHtml(item.name)}</strong><div class="note">${escapeHtml(getSourceSummaryText(item))}</div></td>
      <td>${formatNumber(item.qtyOnHand)} ${escapeHtml(item.unit)}</td>
      <td>${formatNumber(item.reorderLevel)} ${escapeHtml(item.unit)}</td>
      <td>${formatNumber(suggested)} ${escapeHtml(item.unit)}</td>
      <td><span class="status-badge ${status.className}">${status.label}</span></td>
      <td><button class="secondary-btn" type="button" onclick="prefillPurchase('${item.id}')">Reorder</button></td>
    </tr>`;
}

// Render both the overview stock table and the full stock items table
function renderItems() {
  const filtered = getFilteredItems();
  const overviewPage = paginateRows(filtered, "overviewItems");
  const itemsPage = paginateRows(filtered, "items");

  els.overviewItemsTable.innerHTML = overviewPage.total
    ? overviewPage.rows.map(itemRowMarkup).join("")
    : `<tr><td colspan="9" class="empty-state">No stock items found for the current filters.</td></tr>`;

  els.itemsTable.innerHTML = itemsPage.total
    ? itemsPage.rows.map(itemRowMarkup).join("")
    : `<tr><td colspan="9" class="empty-state">No stock items found for the current filters.</td></tr>`;

  updatePagerUI("overviewItems", overviewPage);
  updatePagerUI("items", itemsPage);
}

// Render both low-stock tables (overview + full alert tab)
function getFilteredLowStockItems() {
  const search = (els.alertsSearch?.value || "").trim().toLowerCase();
  const statusFilter = els.alertsStatusFilter?.value || "all";
  return state.items
    .filter((item) => {
      const status = getItemStatus(item);
      const matchesStatus = statusFilter === "all" || (statusFilter === "low" && status.label === "Low Stock") || (statusFilter === "out" && status.label === "Out of Stock");
      const sourceNames = getItemSourceRecords(item).map((source) => source.name).join(" ");
      const matchesSearch = !search || [item.name, item.category, item.unit, sourceNames].some((value) => String(value || "").toLowerCase().includes(search));
      return Number(item.qtyOnHand) <= Number(item.reorderLevel) && matchesStatus && matchesSearch;
    })
    .sort((a, b) => Number(a.qtyOnHand) - Number(b.qtyOnHand));
}

function renderLowStock() {
  const lowItems = getFilteredLowStockItems();

  const overviewPage = paginateRows(lowItems, "overviewAlerts");
  const alertsPage = paginateRows(lowItems, "alerts");

  els.lowStockTable.innerHTML = overviewPage.total
    ? overviewPage.rows.map(lowStockRowMarkup).join("")
    : `<tr><td colspan="6" class="empty-state">No low stock alerts right now.</td></tr>`;

  els.lowStockTableDuplicate.innerHTML = alertsPage.total
    ? alertsPage.rows.map(lowStockRowMarkup).join("")
    : `<tr><td colspan="6" class="empty-state">No low stock alerts right now.</td></tr>`;

  updatePagerUI("overviewAlerts", overviewPage);
  updatePagerUI("alerts", alertsPage);
}



// Build owner-focused supplier performance rows from purchase history and Supplier Management
function getSupplierSummaryRowsRaw() {
  const rows = new Map();
  const ensureRow = (name) => {
    const supplierName = String(name || "Unknown supplier").trim() || "Unknown supplier";
    const key = normalizeText(supplierName) || supplierName.toLowerCase();
    if (!rows.has(key)) {
      const registered = getRegisteredSupplierByName(supplierName);
      rows.set(key, {
        key,
        name: supplierName,
        registered,
        contact: registered ? getSupplierContact(registered) : "",
        email: registered ? getSupplierEmail(registered) : "",
        supplierStatus: registered ? getSupplierStatus(registered) : "Purchase-only",
        purchaseCount: 0,
        totalValue: 0,
        paidValue: 0,
        pendingValue: 0,
        overdueCount: 0,
        pendingBills: 0,
        partialBills: 0,
        paidBills: 0,
        items: new Set(),
        invoiceNos: new Set(),
        purchases: [],
        lastPurchaseDate: ""
      });
    }
    return rows.get(key);
  };

  state.purchases.forEach((purchase) => {
    const row = ensureRow(purchase.supplier);
    const total = getPurchaseTotal(purchase);
    const paid = getPurchasePaidAmount(purchase);
    const pending = getPurchasePendingAmount(purchase);
    row.purchaseCount += 1;
    row.totalValue += total;
    row.paidValue += paid;
    row.pendingValue += pending;
    row.pendingBills += pending > 0 ? 1 : 0;
    row.partialBills += purchase.paymentStatus === "Partially Paid" ? 1 : 0;
    row.paidBills += pending <= 0 ? 1 : 0;
    row.overdueCount += isPurchaseOverdue(purchase) ? 1 : 0;
    row.items.add(purchase.itemName || getItemById(purchase.itemId)?.name || "Unknown item");
    if (purchase.invoiceNo) row.invoiceNos.add(purchase.invoiceNo);
    row.purchases.push(purchase);
    if (!row.lastPurchaseDate || new Date(purchase.date || 0) > new Date(row.lastPurchaseDate || 0)) row.lastPurchaseDate = purchase.date || "";
  });

  state.suppliers.forEach((supplier) => {
    const name = getSupplierDisplayName(supplier);
    if (!name) return;
    const row = ensureRow(name);
    row.registered = supplier;
    row.contact = getSupplierContact(supplier);
    row.email = getSupplierEmail(supplier);
    row.supplierStatus = getSupplierStatus(supplier);
  });

  return [...rows.values()];
}

function getFilteredSupplierSummaryRows() {
  const search = (els.supplierSummarySearch?.value || "").trim().toLowerCase();
  const fromDate = els.supplierSummaryFromDate?.value || "";
  const toDate = els.supplierSummaryToDate?.value || "";
  const paymentFilter = els.supplierSummaryPaymentFilter?.value || "all";
  const sourceFilter = els.supplierSummarySourceFilter?.value || "all";
  const sortMode = els.supplierSummarySort?.value || "pendingDesc";
  const filteredPurchaseRows = new Map();

  const ensureFilteredRow = (base) => {
    if (!filteredPurchaseRows.has(base.key)) {
      filteredPurchaseRows.set(base.key, {
        ...base,
        purchaseCount: 0,
        totalValue: 0,
        paidValue: 0,
        pendingValue: 0,
        overdueCount: 0,
        pendingBills: 0,
        partialBills: 0,
        paidBills: 0,
        items: new Set(),
        invoiceNos: new Set(),
        purchases: [],
        lastPurchaseDate: ""
      });
    }
    return filteredPurchaseRows.get(base.key);
  };

  getSupplierSummaryRowsRaw().forEach((base) => {
    const matchingPurchases = base.purchases.filter((purchase) => {
      const purchaseDate = purchase.date || "";
      const matchesFrom = !fromDate || purchaseDate >= fromDate;
      const matchesTo = !toDate || purchaseDate <= toDate;
      return matchesFrom && matchesTo;
    });

    if (!matchingPurchases.length && (fromDate || toDate)) return;
    const row = ensureFilteredRow(base);
    matchingPurchases.forEach((purchase) => {
      const total = getPurchaseTotal(purchase);
      const paid = getPurchasePaidAmount(purchase);
      const pending = getPurchasePendingAmount(purchase);
      row.purchaseCount += 1;
      row.totalValue += total;
      row.paidValue += paid;
      row.pendingValue += pending;
      row.pendingBills += pending > 0 ? 1 : 0;
      row.partialBills += purchase.paymentStatus === "Partially Paid" ? 1 : 0;
      row.paidBills += pending <= 0 ? 1 : 0;
      row.overdueCount += isPurchaseOverdue(purchase) ? 1 : 0;
      row.items.add(purchase.itemName || getItemById(purchase.itemId)?.name || "Unknown item");
      if (purchase.invoiceNo) row.invoiceNos.add(purchase.invoiceNo);
      row.purchases.push(purchase);
      if (!row.lastPurchaseDate || new Date(purchase.date || 0) > new Date(row.lastPurchaseDate || 0)) row.lastPurchaseDate = purchase.date || "";
    });
  });

  let rows = [...filteredPurchaseRows.values()].filter((row) => {
    const searchText = [
      row.name,
      row.contact,
      row.email,
      row.supplierStatus,
      [...row.items].join(" "),
      [...row.invoiceNos].join(" "),
      row.purchases.map((purchase) => `${purchase.id} ${purchase.paymentStatus} ${purchase.note || ""}`).join(" ")
    ].join(" ").toLowerCase();
    const matchesSearch = !search || searchText.includes(search);
    const matchesSource = sourceFilter === "all"
      || (sourceFilter === "registered" && row.registered)
      || (sourceFilter === "purchaseOnly" && !row.registered);
    const matchesPayment = paymentFilter === "all"
      || (paymentFilter === "unpaid" && row.pendingValue > 0)
      || (paymentFilter === "paidOnly" && row.purchaseCount > 0 && row.pendingValue <= 0)
      || (paymentFilter === "Partially Paid" && row.partialBills > 0)
      || (paymentFilter === "Pending" && row.purchases.some((purchase) => purchase.paymentStatus === "Pending"))
      || (paymentFilter === "overdue" && row.overdueCount > 0);
    return matchesSearch && matchesSource && matchesPayment;
  });

  rows.sort((a, b) => {
    if (sortMode === "spendDesc") return b.totalValue - a.totalValue;
    if (sortMode === "recentDesc") return new Date(b.lastPurchaseDate || 0) - new Date(a.lastPurchaseDate || 0);
    if (sortMode === "purchaseDesc") return b.purchaseCount - a.purchaseCount;
    if (sortMode === "nameAsc") return a.name.localeCompare(b.name);
    return b.pendingValue - a.pendingValue || b.totalValue - a.totalValue;
  });
  return rows;
}

function supplierSummaryRowMarkup(row) {
  const itemNames = [...row.items];
  const visibleItems = itemNames.slice(0, 3).map((name) => `<span class="source-chip">${escapeHtml(name)}</span>`).join("");
  const more = itemNames.length > 3 ? `<span class="source-chip more">+${itemNames.length - 3}</span>` : "";
  const supplierBadge = row.registered ? `<span class="source-badge good">Registered</span>` : `<span class="source-badge neutral">Purchase-only</span>`;
  const overdueBadge = row.overdueCount > 0 ? `<span class="badge badge-danger">${row.overdueCount} overdue</span>` : `<span class="badge badge-success">Clear</span>`;
  return `
    <tr>
      <td>
        <strong class="item-name">${escapeHtml(row.name)}</strong>
        <div class="note">${supplierBadge} ${escapeHtml(row.contact || row.email || "No contact linked")}</div>
      </td>
      <td><strong>${row.purchaseCount}</strong><div class="note">${row.pendingBills} unpaid bill${row.pendingBills === 1 ? "" : "s"}</div></td>
      <td><div class="source-chip-wrap">${visibleItems || `<span class="source-empty">No purchase items</span>`}${more}</div></td>
      <td>${formatMoney(row.totalValue)}</td>
      <td>${formatMoney(row.paidValue)}</td>
      <td><strong>${formatMoney(row.pendingValue)}</strong></td>
      <td>${overdueBadge}</td>
      <td>${row.lastPurchaseDate ? escapeHtml(formatDateOnly(row.lastPurchaseDate)) : "-"}</td>
      <td>
        <div class="table-actions">
          <button class="icon-btn" type="button" onclick="showSupplierSummaryDetails('${encodeURIComponent(row.key)}')" title="View supplier purchase details"><i class="fa-solid fa-eye"></i></button>
          <button class="icon-btn" type="button" onclick="prefillPurchaseForSupplier('${encodeURIComponent(row.name)}')" title="Record purchase for this supplier"><i class="fa-solid fa-cart-plus"></i></button>
        </div>
      </td>
    </tr>`;
}

function renderSupplierSummary() {
  if (!els.supplierSummaryTable) return;
  const rows = getFilteredSupplierSummaryRows();
  const page = paginateRows(rows, "supplierSummary");
  const totals = rows.reduce((acc, row) => {
    acc.suppliers += 1;
    acc.purchases += row.purchaseCount;
    acc.total += row.totalValue;
    acc.paid += row.paidValue;
    acc.pending += row.pendingValue;
    acc.overdue += row.overdueCount;
    return acc;
  }, { suppliers: 0, purchases: 0, total: 0, paid: 0, pending: 0, overdue: 0 });

  if (els.supplierSummaryTotalSuppliers) els.supplierSummaryTotalSuppliers.textContent = totals.suppliers;
  if (els.supplierSummaryTotalPurchases) els.supplierSummaryTotalPurchases.textContent = totals.purchases;
  if (els.supplierSummaryTotalValue) els.supplierSummaryTotalValue.textContent = formatMoney(totals.total);
  if (els.supplierSummaryPaidValue) els.supplierSummaryPaidValue.textContent = formatMoney(totals.paid);
  if (els.supplierSummaryPendingValue) els.supplierSummaryPendingValue.textContent = formatMoney(totals.pending);
  if (els.supplierSummaryOverdueCount) els.supplierSummaryOverdueCount.textContent = totals.overdue;

  els.supplierSummaryTable.innerHTML = page.total
    ? page.rows.map(supplierSummaryRowMarkup).join("")
    : `<tr><td colspan="9" class="empty-state">No supplier purchase summary matches the current filters.</td></tr>`;
  updatePagerUI("supplierSummary", page);
}

function clearSupplierSummaryFilters() {
  if (els.supplierSummarySearch) els.supplierSummarySearch.value = "";
  if (els.supplierSummaryFromDate) els.supplierSummaryFromDate.value = "";
  if (els.supplierSummaryToDate) els.supplierSummaryToDate.value = "";
  if (els.supplierSummaryPaymentFilter) els.supplierSummaryPaymentFilter.value = "all";
  if (els.supplierSummarySourceFilter) els.supplierSummarySourceFilter.value = "all";
  if (els.supplierSummarySort) els.supplierSummarySort.value = "pendingDesc";
  pagerState.supplierSummary.page = 1;
  renderSupplierSummary();
}

// Render the supplier-item relationship table. This is derived from purchase history + Supplier Management.
function getSupplierLinkRows() {
  const search = (els.supplierLinkSearch?.value || "").trim().toLowerCase();
  const filter = els.supplierLinkStatusFilter?.value || "all";

  return state.items
    .map((item) => {
      const sources = getItemSourceRecords(item);
      const latest = sources.find((source) => source.lastDate) || null;
      const sourceText = sources.map((source) => [
        source.name,
        source.contact,
        source.email,
        source.supplierStatus,
        [...source.sources].join(" ")
      ].join(" ")).join(" ");

      return { item, sources, latest, searchText: [item.name, item.category, item.unit, sourceText].join(" ").toLowerCase() };
    })
    .filter((row) => {
      const matchesSearch = !search || row.searchText.includes(search);
      const matchesFilter = filter === "all"
        || (filter === "linked" && row.sources.length > 0)
        || (filter === "unlinked" && row.sources.length === 0)
        || (filter === "registered" && row.sources.some((source) => source.registered))
        || (filter === "purchase" && row.sources.some((source) => source.purchaseCount > 0));
      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => {
      const aDate = a.latest?.lastDate ? new Date(a.latest.lastDate).getTime() : 0;
      const bDate = b.latest?.lastDate ? new Date(b.latest.lastDate).getTime() : 0;
      if (bDate !== aDate) return bDate - aDate;
      return a.item.name.localeCompare(b.item.name);
    });
}

function supplierLinkRowMarkup(row) {
  const { item, sources, latest } = row;
  const latestText = latest
    ? `<strong>${escapeHtml(latest.name)}</strong><div class="note">${latest.lastDate ? `Purchased ${escapeHtml(formatDate(latest.lastDate))}` : "Supplier record link"}</div>`
    : `<span class="source-empty">No purchases recorded</span>`;
  const priceText = latest?.lastPrice !== null && latest?.lastPrice !== undefined ? formatMoney(latest.lastPrice) : "-";

  return `
    <tr>
      <td><strong class="item-name">${escapeHtml(item.name)}</strong><div class="note">${formatNumber(item.qtyOnHand)} ${escapeHtml(item.unit)} on hand</div></td>
      <td>${escapeHtml(item.category)}</td>
      <td><div class="source-chip-wrap">${renderSupplierChips(sources)}</div></td>
      <td>${latestText}</td>
      <td>${priceText}</td>
      <td>
        <div class="table-actions">
          <button class="icon-btn" type="button" onclick="showSupplierSources('${item.id}')" title="View suppliers"><i class="fa-solid fa-eye"></i></button>
          <button class="icon-btn" type="button" onclick="prefillPurchase('${item.id}')" title="Record purchase"><i class="fa-solid fa-cart-plus"></i></button>
        </div>
      </td>
    </tr>`;
}

function renderSupplierLinks() {
  if (!els.supplierLinksTable) return;
  const rows = getSupplierLinkRows();
  const page = paginateRows(rows, "supplierLinks");
  els.supplierLinksTable.innerHTML = page.total
    ? page.rows.map(supplierLinkRowMarkup).join("")
    : `<tr><td colspan="6" class="empty-state">No supplier links match the current filters.</td></tr>`;
  updatePagerUI("supplierLinks", page);
}

// Choose the badge color class for purchase payment status
function getPurchaseStatusBadge(status) {
  if (status === "Paid") return "badge-success";
  if (status === "Partially Paid") return "badge-info";
  return "badge-warning";
}

// Render the purchases history table
function getFilteredPurchases() {
  const search = (els.purchaseSearch?.value || "").trim().toLowerCase();
  const status = els.purchaseStatusFilter?.value || "all";
  const date = els.purchaseDateFilter?.value || "";
  return state.purchases
    .filter((purchase) => {
      const itemName = purchase.itemName || getItemById(purchase.itemId)?.name || "";
      const matchesSearch = !search || [purchase.id, itemName, purchase.supplier, purchase.paymentStatus, purchase.purchasedBy, purchase.note, purchase.invoiceNo, purchase.dueDate].some((value) => String(value || "").toLowerCase().includes(search));
      const matchesStatus = status === "all" || (status === "overdue" ? isPurchaseOverdue(purchase) : purchase.paymentStatus === status);
      const matchesDate = !date || purchase.date === date;
      return matchesSearch && matchesStatus && matchesDate;
    })
    .sort((a, b) => new Date(b.date) - new Date(a.date));
}

function renderPurchases() {
  const rows = getFilteredPurchases();
  const page = paginateRows(rows, "purchases");
  els.purchaseTable.innerHTML = page.total
    ? page.rows.map((purchase) => {
        const hasNote = Boolean((purchase.note || "").trim());
        const total = getPurchaseTotal(purchase);
        const paid = getPurchasePaidAmount(purchase);
        const pending = getPurchasePendingAmount(purchase);
        const overdue = isPurchaseOverdue(purchase);
        return `
        <tr>
          <td><strong>${escapeHtml(purchase.id)}</strong><div class="note">${escapeHtml(purchase.invoiceNo || "No bill no")}</div></td>
          <td>${escapeHtml(purchase.itemName || getItemById(purchase.itemId)?.name || "-")}</td>
          <td>${escapeHtml(purchase.supplier)}</td>
          <td>${formatNumber(purchase.quantity)} ${escapeHtml(purchase.unit || getItemById(purchase.itemId)?.unit || "")}</td>
          <td>${formatMoney(purchase.unitPrice)}</td>
          <td>${formatMoney(total)}</td>
          <td><strong>${formatMoney(paid)}</strong><div class="note">Pending: ${formatMoney(pending)}</div></td>
          <td><span class="badge ${getPurchaseStatusBadge(purchase.paymentStatus)}">${escapeHtml(purchase.paymentStatus)}</span></td>
          <td>${purchase.dueDate ? `${escapeHtml(formatDateOnly(purchase.dueDate))} ${overdue ? `<span class="badge badge-danger">Overdue</span>` : ""}` : "-"}</td>
          <td>${escapeHtml(purchase.purchasedBy || "Admin")}</td>
          <td>
            <div class="table-actions">
              <button class="icon-btn" type="button" onclick="editPurchase('${purchase.id}')" title="Edit purchase payment">
                <i class="fa-solid fa-pen"></i>
              </button>
              ${hasNote ? `<button class="icon-btn" type="button" onclick="viewNote('Purchase Note','${escapeHtml(purchase.id)}','${escapeHtml(purchase.note)}')" title="View note"><i class="fa-solid fa-note-sticky"></i></button>` : ""}
            </div>
          </td>
        </tr>`;
      }).join("")
    : `<tr><td colspan="11" class="empty-state">No purchase records yet.</td></tr>`;
  updatePagerUI("purchases", page);
}

// Render the stock movement / transaction history table
function getFilteredTransactions() {
  const search = (els.transactionSearch?.value || "").trim().toLowerCase();
  const type = els.transactionTypeFilter?.value || "all";
  const date = els.transactionDateFilter?.value || "";
  return state.transactions
    .filter((txn) => {
      const itemName = txn.itemName || getItemById(txn.itemId)?.name || "";
      const matchesSearch = !search || [txn.id, itemName, txn.type, txn.reason, txn.recordedBy].some((value) => String(value || "").toLowerCase().includes(search));
      const matchesType = type === "all" || txn.type === type;
      const txnDate = txn.date ? formatDateForInput(txn.date) : "";
      const matchesDate = !date || txnDate === date;
      return matchesSearch && matchesType && matchesDate;
    })
    .sort((a, b) => new Date(b.date) - new Date(a.date));
}

function renderTransactions() {
  const rows = getFilteredTransactions();
  const page = paginateRows(rows, "transactions");
  els.transactionTable.innerHTML = page.total
    ? page.rows.map((txn) => `
        <tr>
          <td><strong>${escapeHtml(txn.id)}</strong></td>
          <td>${escapeHtml(txn.itemName || getItemById(txn.itemId)?.name || "-")}</td>
          <td><span class="type-badge ${getTypeBadge(txn.type)}">${escapeHtml(txn.type)}</span></td>
          <td>${txn.quantity > 0 ? "+" : ""}${formatNumber(txn.quantity)} ${escapeHtml(txn.unit || "")}</td>
          <td>${formatNumber(txn.previousQty)} → ${formatNumber(txn.newQty)} ${escapeHtml(txn.unit || "")}</td>
          <td>${escapeHtml(txn.reason || "-")}</td>
          <td>${escapeHtml(txn.recordedBy || "Admin")}</td>
          <td>${formatDate(txn.date)}</td>
        </tr>`).join("")
    : `<tr><td colspan="8" class="empty-state">No transaction history yet.</td></tr>`;
  updatePagerUI("transactions", page);
}

// One helper to redraw everything after data changes
function renderAll() {
  renderSelectOptions();
  renderSummary();
  renderSectionHighlights();
  renderItems();
  renderLowStock();
  renderSupplierSummary();
  renderSupplierLinks();
  renderPurchases();
  renderTransactions();
}

// Show an in-page modal window
function openModal(modalId) {
  if (currentModal && currentModal !== modalId) closeModal();
  const modal = document.getElementById(modalId);
  if (!modal) return;
  currentModal = modalId;
  els.modalBackdrop.classList.add("show");
  modal.classList.add("show");
  modal.setAttribute("aria-hidden", "false");
}

// Hide whichever modal is currently open
function closeModal() {
  if (!currentModal) return;
  const modal = document.getElementById(currentModal);
  if (modal) {
    modal.classList.remove("show");
    modal.setAttribute("aria-hidden", "true");
  }
  els.modalBackdrop.classList.remove("show");
  currentModal = null;
}

// Switch between sidebar tabs without leaving the page
function switchView(viewId) {
  closeMobileSidebar();
  currentView = viewId;
  updatePageHeader(viewId);
  els.views.forEach((view) => view.classList.toggle("active", view.id === viewId));
  els.viewButtons.forEach((button) => button.classList.toggle("active", button.dataset.view === viewId));
  window.scrollTo(0, 0);
}
// Clear item form fields before opening Add Item mode
function resetItemForm() {
  clearValidation(els.itemForm);
  els.itemForm.reset();
  document.getElementById("itemId").value = "";
  els.itemModalTitle.textContent = "Add New Stock Item";
  els.itemSubmitBtn.textContent = "Save Item";
}

// Clear purchase form fields before new purchase/edit purchase mode

function syncPaymentFields() {
  const statusField = document.getElementById("paymentStatus");
  const paidField = document.getElementById("purchasePaidAmount");
  const qtyField = document.getElementById("purchaseQuantity");
  const priceField = document.getElementById("purchaseUnitPrice");
  if (!statusField || !paidField) return;
  const total = Number(qtyField?.value || 0) * Number(priceField?.value || 0);
  if (statusField.value === "Paid") {
    paidField.value = total ? total.toFixed(2).replace(/\.00$/, "") : "";
    paidField.readOnly = true;
  } else if (statusField.value === "Pending") {
    paidField.value = "0";
    paidField.readOnly = true;
  } else {
    paidField.readOnly = false;
    if (Number(paidField.value || 0) >= total && total > 0) paidField.value = "";
  }
}

function resetPurchaseForm() {
  clearValidation(els.purchaseForm);
  els.purchaseForm.reset();
  document.getElementById("purchaseId").value = "";
  document.getElementById("purchaseModalTitle").textContent = "Record Purchase";
  document.getElementById("purchaseSubmitBtn").textContent = "Save Purchase";
  document.getElementById("purchaseDate").value = formatDateForInput(new Date());
  document.getElementById("paymentStatus").value = "Paid";
  document.getElementById("purchasePaidAmount").value = "";
  document.getElementById("purchaseDueDate").value = "";
  document.getElementById("purchaseInvoiceNo").value = "";
  syncPaymentFields();
}

// Suggest a practical default reason for a stock transaction
function defaultReasonForItem(item, type) {
  if (type === "OUT" && item.trackingMode === "bulk") return "Kitchen bulk usage adjustment";
  if (type === "OUT") return "Counter sale / service usage";
  if (type === "IN") return "Manual stock in";
  return "Stock correction";
}

// Clear previous field-level validation messages for one form
function clearValidation(form) {
  form.querySelectorAll(".field-error").forEach((node) => node.remove());
  form.querySelectorAll(".is-invalid").forEach((field) => field.classList.remove("is-invalid"));
}
function setFieldError(field, message) {
  if (!field) return;
  field.classList.add("is-invalid");
  const wrapper = field.closest(".field") || field.parentElement;
  const error = document.createElement("small");
  error.className = "field-error";
  error.textContent = message;
  wrapper.appendChild(error);
}
function isValidEmail(value) { return !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value); }
function isValidPhone(value) { return !value || /^\d{10}$/.test(value); }
function isPositiveNumber(value) { const n = Number(value); return Number.isFinite(n) && n > 0; }
function isZeroOrPositiveNumber(value) { const n = Number(value); return Number.isFinite(n) && n >= 0; }
function validateItemForm(formData) {
  clearValidation(els.itemForm);
  const errors = [];
  const name = formData.get("name").trim();
  const category = formData.get("category").trim();
  if (name.length < 2) errors.push(["itemName", "Item name must have at least 2 characters."]);
  if (category.length < 2) errors.push(["itemCategory", "Category must have at least 2 characters."]);
  if (!isZeroOrPositiveNumber(formData.get("qtyOnHand"))) errors.push(["qtyOnHand", "Quantity cannot be empty or negative."]);
  if (!isZeroOrPositiveNumber(formData.get("reorderLevel"))) errors.push(["reorderLevel", "Reorder level cannot be empty or negative."]);
  if (!isZeroOrPositiveNumber(formData.get("unitCost"))) errors.push(["unitCost", "Unit cost cannot be empty or negative."]);

  errors.forEach(([id, msg]) => setFieldError(document.getElementById(id), msg));
  return errors.length === 0;
}
function validatePurchaseForm(formData, isEditing) {
  clearValidation(els.purchaseForm);
  const errors = [];
  if (!formData.get("itemId")) errors.push(["purchaseItemId", "Please select a stock item."]);
  if ((formData.get("supplier") || "").trim().length < 2) errors.push(["purchaseSupplier", "Supplier name must have at least 2 characters."]);
  if (!isPositiveNumber(formData.get("quantity"))) errors.push(["purchaseQuantity", "Quantity must be greater than zero."]);
  if (!isZeroOrPositiveNumber(formData.get("unitPrice"))) errors.push(["purchaseUnitPrice", "Unit price cannot be negative."]);
  const total = Number(formData.get("quantity") || 0) * Number(formData.get("unitPrice") || 0);
  const status = formData.get("paymentStatus");
  const paidValue = Number(formData.get("paidAmount") || 0);
  if (status === "Partially Paid" && (!Number.isFinite(paidValue) || paidValue <= 0 || paidValue >= total)) errors.push(["purchasePaidAmount", "For partial payment, enter an amount greater than 0 and less than the total."]);
  if (!formData.get("date")) errors.push(["purchaseDate", "Please select a purchase date."]);
  if (isEditing) ["purchaseItemId", "purchaseSupplier", "purchaseQuantity", "purchaseUnitPrice", "purchaseDate"].forEach((id) => document.getElementById(id).disabled = false);
  errors.forEach(([id, msg]) => setFieldError(document.getElementById(id), msg));
  return errors.length === 0;
}
function validateTransactionForm(formData) {
  clearValidation(els.transactionForm);
  const errors = [];
  if (!formData.get("itemId")) errors.push(["txnItemId", "Please select a stock item."]);
  if (!isPositiveNumber(formData.get("quantity"))) errors.push(["txnQuantity", "Quantity must be greater than zero."]);
  errors.forEach(([id, msg]) => setFieldError(document.getElementById(id), msg));
  return errors.length === 0;
}

// Handle add/update stock item form submission
async function handleItemSubmit(event) {
  event.preventDefault();
  const formData = new FormData(els.itemForm);
  const itemId = formData.get("itemId") || crypto.randomUUID();

  if (!validateItemForm(formData)) return showToast("Please correct the highlighted item fields.");

  const existingItem = getItemById(itemId) || {};
  const payload = {
    ...existingItem,
    id: itemId,
    name: formData.get("name").trim(),
    category: formData.get("category").trim(),
    itemKind: formData.get("itemKind"),
    unit: formData.get("unit"),
    trackingMode: formData.get("trackingMode"),
    qtyOnHand: Number(formData.get("qtyOnHand")),
    reorderLevel: Number(formData.get("reorderLevel")),
    unitCost: Number(formData.get("unitCost")),
    status: formData.get("status"),
    notes: formData.get("notes").trim(),
    lastUpdated: new Date().toISOString()
  };

  setLoading(true);
  try {
    await persistItem(payload);
    await refreshStateFromFirestore();
    renderAll();
    resetItemForm();
    closeModal();
    switchView("itemsView");
    showToast(formData.get("itemId") ? "Stock item updated." : "New stock item added.");
  } catch (error) {
    console.error(error);
    showToast("Could not save item to Firebase.");
  } finally {
    setLoading(false);
  }
}

// Handle purchase form submission and update stock quantity if needed
async function handlePurchaseSubmit(event) {
  event.preventDefault();
  const formData = new FormData(els.purchaseForm);
  const purchaseId = formData.get("purchaseId");
  if (!validatePurchaseForm(formData, Boolean(purchaseId))) return showToast("Please correct the highlighted purchase fields.");
  const item = getItemById(formData.get("itemId"));
  if (!item) return showToast("Select a valid item for the purchase.");

  const quantity = Number(formData.get("quantity"));
  const unitPrice = Number(formData.get("unitPrice"));
  const total = quantity * unitPrice;
  const paymentAmounts = calculatePaymentAmounts(total, formData.get("paymentStatus"), formData.get("paidAmount"));

  const purchase = {
    id: purchaseId || generateCode("PO"),
    date: formData.get("date"),
    supplier: formData.get("supplier").trim() || "Unknown supplier",
    itemId: item.id,
    itemName: item.name,
    unit: item.unit,
    quantity,
    unitPrice,
    total,
    paidAmount: paymentAmounts.paidAmount,
    pendingAmount: paymentAmounts.pendingAmount,
    paymentStatus: formData.get("paymentStatus"),
    dueDate: formData.get("dueDate") || "",
    invoiceNo: formData.get("invoiceNo").trim(),
    purchasedBy: formData.get("purchasedBy").trim() || "Admin",
    note: formData.get("note").trim()
  };

  setLoading(true);
  try {
    if (purchaseId) {
      const existingPurchase = state.purchases.find((entry) => entry.id === purchaseId);
      const updatedPurchase = {
        ...existingPurchase,
        paymentStatus: purchase.paymentStatus,
        paidAmount: purchase.paidAmount,
        pendingAmount: purchase.pendingAmount,
        dueDate: purchase.dueDate,
        invoiceNo: purchase.invoiceNo,
        purchasedBy: purchase.purchasedBy,
        note: purchase.note
      };
      await persistPurchase(updatedPurchase);
      await refreshStateFromFirestore();
      renderAll();
      resetPurchaseForm();
      closeModal();
      switchView("purchasesView");
      showToast("Purchase status updated.");
      return;
    }

    const updatedItem = {
      ...item,
      qtyOnHand: Number(item.qtyOnHand) + quantity,
      unitCost: unitPrice,
      lastUpdated: new Date().toISOString()
    };

    const txn = {
      id: generateCode("TXN"),
      date: new Date(`${purchase.date}T09:00:00`).toISOString(),
      itemId: item.id,
      itemName: item.name,
      type: "PURCHASE",
      quantity,
      unit: item.unit,
      previousQty: Number(item.qtyOnHand),
      newQty: updatedItem.qtyOnHand,
      reason: purchase.note || `Purchase from ${purchase.supplier}`,
      recordedBy: purchase.purchasedBy
    };

    await Promise.all([persistItem(updatedItem), persistPurchase(purchase), persistTransaction(txn)]);
    await refreshStateFromFirestore();
    renderAll();
    resetPurchaseForm();
    closeModal();
    switchView("purchasesView");
    showToast("Purchase recorded in Firebase and stock updated.");
  } catch (error) {
    console.error(error);
    showToast("Could not save purchase to Firebase.");
  } finally {
    setLoading(false);
  }
}

// Handle manual IN / OUT / ADJUSTMENT transactions
async function handleTransactionSubmit(event) {
  event.preventDefault();
  const formData = new FormData(els.transactionForm);
  if (!validateTransactionForm(formData)) return showToast("Please correct the highlighted transaction fields.");
  const item = getItemById(formData.get("itemId"));
  if (!item) return showToast("Select a valid item for the transaction.");

  const type = formData.get("type");
  const quantity = Number(formData.get("quantity"));

  let delta = quantity;
  if (type === "OUT") delta = -quantity;
  if (type === "ADJUSTMENT") delta = Number(formData.get("adjustmentDirection")) * quantity;

  const previousQty = Number(item.qtyOnHand);
  const nextQty = previousQty + delta;
  if (nextQty < 0) return showToast("This transaction would make stock negative.");

  const updatedItem = { ...item, qtyOnHand: nextQty, lastUpdated: new Date().toISOString() };
  const txn = {
    id: generateCode("TXN"),
    date: new Date().toISOString(),
    itemId: item.id,
    itemName: item.name,
    type,
    quantity: delta,
    unit: item.unit,
    previousQty,
    newQty: nextQty,
    reason: formData.get("reason").trim() || defaultReasonForItem(item, type),
    recordedBy: formData.get("recordedBy").trim() || "Admin"
  };

  setLoading(true);
  try {
    await Promise.all([persistItem(updatedItem), persistTransaction(txn)]);
    await refreshStateFromFirestore();
    renderAll();
    els.transactionForm.reset();
    closeModal();
    switchView("transactionsView");
    showToast("Transaction recorded in Firebase.");
  } catch (error) {
    console.error(error);
    showToast("Could not save transaction to Firebase.");
  } finally {
    setLoading(false);
  }
}

// Export one dataset (items, purchases, or transactions) as CSV
function exportDataset(kind) {
  if (kind === "items") {
    downloadCsv("sahana-stock-items.csv", [
      ["Item Name", "Category", "Type", "Tracking Mode", "Qty On Hand", "Unit", "Reorder Level", "Linked Supplier Count", "Unit Cost", "Status", "Last Updated", "Notes"],
      ...state.items.map((item) => [item.name, item.category, item.itemKind, item.trackingMode, item.qtyOnHand, item.unit, item.reorderLevel, getItemSourceRecords(item).length, item.unitCost, item.status, item.lastUpdated, item.notes])
    ]);
  }
  if (kind === "purchases") {
    downloadCsv("sahana-stock-purchases.csv", [
      ["Purchase ID", "Date", "Item", "Supplier", "Quantity", "Unit", "Unit Price", "Total", "Paid Amount", "Pending Amount", "Payment Status", "Due Date", "Invoice No", "Purchased By", "Note"],
      ...state.purchases.map((purchase) => [purchase.id, purchase.date, purchase.itemName || getItemById(purchase.itemId)?.name || "", purchase.supplier, purchase.quantity, purchase.unit || getItemById(purchase.itemId)?.unit || "", purchase.unitPrice, getPurchaseTotal(purchase), getPurchasePaidAmount(purchase), getPurchasePendingAmount(purchase), purchase.paymentStatus, purchase.dueDate || "", purchase.invoiceNo || "", purchase.purchasedBy, purchase.note])
    ]);
  }
  if (kind === "supplierLinks") {
    downloadCsv("sahana-supplier-links.csv", [
      ["Item Name", "Category", "Qty On Hand", "Unit", "Linked Suppliers", "Latest Supplier", "Latest Purchase Date", "Last Price", "Registered Supplier Count"],
      ...state.items.map((item) => {
        const sources = getItemSourceRecords(item);
        const latest = sources.find((source) => source.lastDate) || sources[0] || {};
        return [
          item.name,
          item.category,
          item.qtyOnHand,
          item.unit,
          sources.map((source) => source.name).join(" | "),
          latest.name || "",
          latest.lastDate || "",
          latest.lastPrice ?? "",
          sources.filter((source) => source.registered).length
        ];
      })
    ]);
  }
  if (kind === "supplierSummary") {
    downloadCsv("sahana-supplier-summary.csv", [
      ["Supplier", "Registered In Supplier Management", "Contact", "Email", "Purchases", "Items Supplied", "Total Purchased", "Paid", "Pending", "Pending Bills", "Partial Bills", "Overdue Bills", "Last Purchase"],
      ...getFilteredSupplierSummaryRows().map((row) => [
        row.name,
        row.registered ? "Yes" : "No",
        row.contact,
        row.email,
        row.purchaseCount,
        [...row.items].join(" | "),
        row.totalValue,
        row.paidValue,
        row.pendingValue,
        row.pendingBills,
        row.partialBills,
        row.overdueCount,
        row.lastPurchaseDate || ""
      ])
    ]);
  }
  if (kind === "transactions") {
    downloadCsv("sahana-stock-transactions.csv", [
      ["Txn ID", "Date", "Item", "Type", "Quantity Change", "Unit", "Previous Qty", "New Qty", "Reason", "Recorded By"],
      ...state.transactions.map((txn) => [txn.id, txn.date, txn.itemName, txn.type, txn.quantity, txn.unit, txn.previousQty, txn.newQty, txn.reason, txn.recordedBy])
    ]);
  }
  closeModal();
  showToast("CSV export downloaded.");
}

// Show a hint when the chosen tracking style is impractical
function syncTrackingRecommendation() {
  const itemKind = els.itemKindInput.value;
  const trackingMode = els.trackingModeInput.value;
  if (itemKind === "ingredient" && trackingMode === "counted") showToast("For raw materials, bulk or hybrid tracking is usually more practical.");
}

// Auto-suggest raw-material settings for common kitchen items
function suggestPracticalSetup() {
  const value = els.itemNameInput.value.trim().toLowerCase();
  if (["flour", "rice", "oil", "sugar", "salt", "butter"].some((term) => value.includes(term))) {
    document.getElementById("itemKind").value = "ingredient";
    document.getElementById("trackingMode").value = "bulk";
  }
}

// Open the item modal in edit mode for the selected item
window.editItem = function editItem(itemId) {
  const item = getItemById(itemId);
  if (!item) return;
  document.getElementById("itemId").value = item.id;
  document.getElementById("itemName").value = item.name;
  document.getElementById("itemCategory").value = item.category;
  document.getElementById("itemKind").value = item.itemKind;
  document.getElementById("itemUnit").value = item.unit;
  document.getElementById("trackingMode").value = item.trackingMode;
  document.getElementById("qtyOnHand").value = item.qtyOnHand;
  document.getElementById("reorderLevel").value = item.reorderLevel;
  document.getElementById("unitCost").value = item.unitCost || 0;
  document.getElementById("itemStatus").value = item.status;
  document.getElementById("itemNotes").value = item.notes || "";
  els.itemModalTitle.textContent = `Edit ${item.name}`;
  els.itemSubmitBtn.textContent = "Update Item";
  openModal("itemModal");
};

// Open the purchase modal and preselect one item
window.prefillPurchase = function prefillPurchase(itemId) {
  const item = getItemById(itemId);
  resetPurchaseForm();
  els.itemSelectPurchase.value = itemId;
  const primarySource = item ? getPrimarySource(item) : null;
  document.getElementById("purchaseSupplier").value = primarySource?.name || "";
  openModal("purchaseModal");
  setTimeout(() => document.getElementById("purchaseQuantity").focus(), 50);
};


// Open the purchase modal with only the supplier prefilled from the owner summary
window.prefillPurchaseForSupplier = function prefillPurchaseForSupplier(encodedName) {
  const supplierName = decodeURIComponent(encodedName || "");
  resetPurchaseForm();
  document.getElementById("purchaseSupplier").value = supplierName;
  openModal("purchaseModal");
  setTimeout(() => document.getElementById("purchaseItemId").focus(), 50);
};

// Show the filtered bill history for one supplier from the supplier summary table
window.showSupplierSummaryDetails = function showSupplierSummaryDetails(encodedKey) {
  const key = decodeURIComponent(encodedKey || "");
  const row = getFilteredSupplierSummaryRows().find((entry) => entry.key === key) || getSupplierSummaryRowsRaw().find((entry) => entry.key === key);
  if (!row) return;
  const registeredBadge = row.registered ? `<span class="source-badge good">Registered Supplier</span>` : `<span class="source-badge neutral">Purchase-only Supplier</span>`;
  const billRows = row.purchases.length
    ? row.purchases
        .slice()
        .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0))
        .map((purchase) => {
          const total = getPurchaseTotal(purchase);
          const paid = getPurchasePaidAmount(purchase);
          const pending = getPurchasePendingAmount(purchase);
          const overdue = isPurchaseOverdue(purchase);
          return `
            <tr>
              <td><strong>${escapeHtml(purchase.id)}</strong><div class="note">${escapeHtml(purchase.invoiceNo || "No invoice")}</div></td>
              <td>${escapeHtml(purchase.itemName || getItemById(purchase.itemId)?.name || "-")}</td>
              <td>${escapeHtml(formatDateOnly(purchase.date))}</td>
              <td>${formatMoney(total)}</td>
              <td>${formatMoney(paid)}</td>
              <td>${formatMoney(pending)}</td>
              <td><span class="badge ${overdue ? "badge-danger" : getPurchaseStatusBadge(purchase.paymentStatus)}">${overdue ? "Overdue" : escapeHtml(purchase.paymentStatus)}</span></td>
            </tr>`;
        }).join("")
    : `<tr><td colspan="7" class="empty-state">No purchases are available for the selected filter period.</td></tr>`;

  const content = `
    <div class="supplier-detail-summary">
      <div class="supplier-detail-title">
        <strong>${escapeHtml(row.name)}</strong>
        <span>${registeredBadge}</span>
      </div>
      <div class="supplier-detail-grid stats-like">
        <span>Contact</span><strong>${escapeHtml(row.contact || row.email || "Not linked")}</strong>
        <span>Total purchased</span><strong>${formatMoney(row.totalValue)}</strong>
        <span>Paid</span><strong>${formatMoney(row.paidValue)}</strong>
        <span>Pending</span><strong>${formatMoney(row.pendingValue)}</strong>
        <span>Purchases</span><strong>${row.purchaseCount}</strong>
        <span>Overdue bills</span><strong>${row.overdueCount}</strong>
      </div>
    </div>
    <div class="table-wrap supplier-detail-table-wrap">
      <table class="table supplier-detail-table">
        <thead><tr><th>Bill</th><th>Item</th><th>Date</th><th>Total</th><th>Paid</th><th>Pending</th><th>Status</th></tr></thead>
        <tbody>${billRows}</tbody>
      </table>
    </div>`;

  document.getElementById("noteModalTitle").textContent = `Supplier Summary - ${row.name}`;
  document.getElementById("noteModalContent").innerHTML = content;
  openModal("noteModal");
};

// Open the purchase modal in edit mode for an existing purchase
window.editPurchase = function editPurchase(purchaseId) {
  const purchase = state.purchases.find((entry) => entry.id === purchaseId);
  if (!purchase) return;
  resetPurchaseForm();
  document.getElementById("purchaseId").value = purchase.id;
  document.getElementById("purchaseModalTitle").textContent = `Edit ${purchase.id}`;
  document.getElementById("purchaseSubmitBtn").textContent = "Update Purchase";
  document.getElementById("purchaseItemId").value = purchase.itemId;
  document.getElementById("purchaseSupplier").value = purchase.supplier || "";
  document.getElementById("purchaseQuantity").value = purchase.quantity;
  document.getElementById("purchaseUnitPrice").value = purchase.unitPrice;
  document.getElementById("purchaseDate").value = purchase.date;
  document.getElementById("paymentStatus").value = purchase.paymentStatus || "Pending";
  document.getElementById("purchasePaidAmount").value = getPurchasePaidAmount(purchase) || "";
  document.getElementById("purchaseDueDate").value = purchase.dueDate || "";
  document.getElementById("purchaseInvoiceNo").value = purchase.invoiceNo || "";
  document.getElementById("purchasedBy").value = purchase.purchasedBy || "";
  document.getElementById("purchaseNote").value = purchase.note || "";
  syncPaymentFields();
  openModal("purchaseModal");
};


// Show every supplier source for one stock item without leaving the stock management section
window.showSupplierSources = function showSupplierSources(itemId) {
  const item = getItemById(itemId);
  if (!item) return;
  const sources = getItemSourceRecords(item);
  const content = sources.length
    ? `<div class="source-detail-list">
        ${sources.map((source) => {
          const badges = [
            source.registered ? `<span class="source-badge good">Registered</span>` : `<span class="source-badge neutral">Purchase / Legacy</span>`,
            source.supplierStatus ? `<span class="source-badge">${escapeHtml(source.supplierStatus)}</span>` : "",
            source.purchaseCount ? `<span class="source-badge">${source.purchaseCount} purchase${source.purchaseCount > 1 ? "s" : ""}</span>` : "",
            ...[...source.sources].map((label) => `<span class="source-badge">${escapeHtml(label)}</span>`)
          ].filter(Boolean).join("");
          return `
            <div class="source-detail-card">
              <div class="source-detail-head">
                <strong>${escapeHtml(source.name)}</strong>
                <div class="source-detail-badges">${badges}</div>
              </div>
              <div class="source-detail-grid">
                <span>Last purchase</span><strong>${source.lastDate ? escapeHtml(formatDate(source.lastDate)) : "Not recorded"}</strong>
                <span>Last price</span><strong>${source.lastPrice !== null && source.lastPrice !== undefined ? formatMoney(source.lastPrice) : "-"}</strong>
                <span>Phone</span><strong>${escapeHtml(source.contact || "-")}</strong>
                <span>Email</span><strong>${escapeHtml(source.email || "-")}</strong>
              </div>
            </div>`;
        }).join("")}
      </div>`
    : `<p class="empty-copy">No supplier source is linked to this item yet. Record a purchase with the real supplier, or add this item/category under Supplier Management.</p>`;

  document.getElementById("noteModalTitle").textContent = `Sources for ${item.name}`;
  document.getElementById("noteModalContent").innerHTML = content;
  openModal("noteModal");
};

// Open a simple note-reading modal from table note icons
window.viewNote = function viewNote(title, ref, note) {
  document.getElementById("noteModalTitle").textContent = title;
  document.getElementById("noteModalContent").innerHTML = `<div class="note-ref">${escapeHtml(ref)}</div><div class="note-copy">${escapeHtml(note || "No note available.")}</div>`;
  openModal("noteModal");
};

// Open the transaction modal and preselect one item
window.prefillTransaction = function prefillTransaction(itemId) {
  els.itemSelectTxn.value = itemId;
  openModal("transactionModal");
  setTimeout(() => document.getElementById("txnQuantity").focus(), 50);
};

// Set today as the default date in the purchase form
function setTodayDefaults() {
  document.getElementById("purchaseDate").value = formatDateForInput(new Date());
}

// Reset both stock item tables back to page 1 after filters change
function resetItemPagers() {
  pagerState.overviewItems.page = 1;
  pagerState.items.page = 1;
}

// Reset both low stock tables back to page 1
function resetAlertPagers() {
  pagerState.overviewAlerts.page = 1;
  pagerState.alerts.page = 1;
}

// Sync filters, reset paging, and re-render the stock item tables
function updateFilterAndRender(source) {
  syncFilters(source);
  resetItemPagers();
  renderItems();
}

// Apply the top pill filter (All / Low / Out / Bulk / Counted)
function setPillFilter(filter) {
  currentFilter = filter;
  document.querySelectorAll(".pill").forEach((pill) => pill.classList.toggle("active", pill.dataset.filter === filter));
  resetItemPagers();
  renderItems();
}

// Attach page size + next/previous events for a table footer
function attachPager(prefix, key, renderFn) {
  const sizeEl = document.getElementById(`${prefix}PageSize`);
  const prevBtn = document.getElementById(`${prefix}PrevBtn`);
  const nextBtn = document.getElementById(`${prefix}NextBtn`);
  sizeEl?.addEventListener("change", () => {
    pagerState[key].size = Number(sizeEl.value);
    pagerState[key].page = 1;
    renderFn();
  });
  prevBtn?.addEventListener("click", () => {
    if (pagerState[key].page > 1) {
      pagerState[key].page -= 1;
      renderFn();
    }
  });
  nextBtn?.addEventListener("click", () => {
    pagerState[key].page += 1;
    renderFn();
  });
}

// Connect all form submits, button clicks, sidebar tabs, and filter events
function attachEvents() {
  els.itemForm.addEventListener("submit", handleItemSubmit);
  els.purchaseForm.addEventListener("submit", handlePurchaseSubmit);
  els.transactionForm.addEventListener("submit", handleTransactionSubmit);
  els.searchInput.addEventListener("input", () => updateFilterAndRender("overview"));
  els.searchInputMirror.addEventListener("input", () => updateFilterAndRender("items"));
  els.typeFilter.addEventListener("change", () => updateFilterAndRender("overview"));
  els.typeFilterMirror.addEventListener("change", () => updateFilterAndRender("items"));
  els.categoryFilter.addEventListener("change", () => updateFilterAndRender("overview"));
  els.categoryFilterMirror.addEventListener("change", () => updateFilterAndRender("items"));
  els.alertsSearch?.addEventListener("input", () => { resetAlertPagers(); renderLowStock(); });
  els.alertsStatusFilter?.addEventListener("change", () => { resetAlertPagers(); renderLowStock(); });
  els.supplierLinkSearch?.addEventListener("input", () => { pagerState.supplierLinks.page = 1; renderSupplierLinks(); });
  els.supplierLinkStatusFilter?.addEventListener("change", () => { pagerState.supplierLinks.page = 1; renderSupplierLinks(); });
  [els.supplierSummarySearch, els.supplierSummaryFromDate, els.supplierSummaryToDate, els.supplierSummaryPaymentFilter, els.supplierSummarySourceFilter, els.supplierSummarySort].forEach((field) => {
    field?.addEventListener(field.tagName === "INPUT" ? "input" : "change", () => { pagerState.supplierSummary.page = 1; renderSupplierSummary(); });
  });
  els.clearSupplierSummaryFilters?.addEventListener("click", clearSupplierSummaryFilters);
  els.purchaseSearch?.addEventListener("input", () => { pagerState.purchases.page = 1; renderPurchases(); });
  els.purchaseStatusFilter?.addEventListener("change", () => { pagerState.purchases.page = 1; renderPurchases(); });
  els.purchaseDateFilter?.addEventListener("change", () => { pagerState.purchases.page = 1; renderPurchases(); });
  els.transactionSearch?.addEventListener("input", () => { pagerState.transactions.page = 1; renderTransactions(); });
  els.transactionTypeFilter?.addEventListener("change", () => { pagerState.transactions.page = 1; renderTransactions(); });
  els.transactionDateFilter?.addEventListener("change", () => { pagerState.transactions.page = 1; renderTransactions(); });
  document.getElementById("clearItemFilters")?.addEventListener("click", () => {
    els.searchInput.value = "";
    els.typeFilter.value = "all";
    els.categoryFilter.value = "all";
    syncFilters("overview");
    setPillFilter("all");
  });
  document.getElementById("clearItemFiltersMirror")?.addEventListener("click", () => {
    els.searchInputMirror.value = "";
    els.typeFilterMirror.value = "all";
    els.categoryFilterMirror.value = "all";
    syncFilters("items");
    setPillFilter("all");
  });
  document.getElementById("clearAlertsFilters")?.addEventListener("click", () => { els.alertsSearch.value = ""; els.alertsStatusFilter.value = "all"; resetAlertPagers(); renderLowStock(); });
  document.getElementById("clearSupplierLinkFilters")?.addEventListener("click", () => { els.supplierLinkSearch.value = ""; els.supplierLinkStatusFilter.value = "all"; pagerState.supplierLinks.page = 1; renderSupplierLinks(); });
  document.getElementById("clearPurchaseFilters")?.addEventListener("click", () => { els.purchaseSearch.value = ""; els.purchaseStatusFilter.value = "all"; els.purchaseDateFilter.value = ""; pagerState.purchases.page = 1; renderPurchases(); });
  document.getElementById("clearTransactionFilters")?.addEventListener("click", () => { els.transactionSearch.value = ""; els.transactionTypeFilter.value = "all"; if (els.transactionDateFilter) els.transactionDateFilter.value = ""; pagerState.transactions.page = 1; renderTransactions(); });
  els.itemKindInput.addEventListener("change", syncTrackingRecommendation);
  els.trackingModeInput.addEventListener("change", syncTrackingRecommendation);
  els.itemNameInput.addEventListener("blur", suggestPracticalSetup);
  document.getElementById("supplierContact")?.addEventListener("input", (event) => { event.target.value = event.target.value.replace(/\D/g, "").slice(0, 10); });
  ["qtyOnHand", "reorderLevel", "unitCost", "purchaseQuantity", "purchaseUnitPrice", "txnQuantity"].forEach((id) => {
    document.getElementById(id)?.addEventListener("input", (event) => {
      if (Number(event.target.value) < 0) event.target.value = "";
      if (["purchaseQuantity", "purchaseUnitPrice"].includes(id)) syncPaymentFields();
    });
  });
  document.getElementById("paymentStatus")?.addEventListener("change", syncPaymentFields);
  document.getElementById("purchasePaidAmount")?.addEventListener("input", (event) => { if (Number(event.target.value) < 0) event.target.value = ""; });

  ["openItemModalBtn", "openItemModalBtn2"].forEach((id) => document.getElementById(id)?.addEventListener("click", () => {
    resetItemForm();
    openModal("itemModal");
  }));

  ["openPurchaseModalBtn", "openPurchaseModalBtn2", "openPurchaseModalBtn4", "openPurchaseModalBtnSupplier", "openPurchaseModalBtnSupplierSummary"].forEach((id) => {
    document.getElementById(id)?.addEventListener("click", () => { resetPurchaseForm(); openModal("purchaseModal"); });
  });

  ["openTransactionModalBtn", "openTransactionModalBtn2", "openTransactionModalBtn4"].forEach((id) => {
    document.getElementById(id)?.addEventListener("click", () => openModal("transactionModal"));
  });

  ["exportBtn"].forEach((id) => document.getElementById(id)?.addEventListener("click", () => openModal("exportModal")));

  document.getElementById("openLowStockBtn")?.addEventListener("click", () => switchView("alertsView"));
  document.getElementById("goToAlertsBtn")?.addEventListener("click", () => switchView("alertsView"));
  document.getElementById("goToItemsBtn")?.addEventListener("click", () => switchView("itemsView"));

  els.viewButtons.forEach((button) => button.addEventListener("click", () => switchView(button.dataset.view)));
  document.querySelectorAll("[data-close-modal]").forEach((button) => button.addEventListener("click", closeModal));
  ["cancelItemBtn", "cancelPurchaseBtn", "cancelTransactionBtn"].forEach((id) => document.getElementById(id).addEventListener("click", closeModal));
  els.modalBackdrop.addEventListener("click", closeModal);
  document.addEventListener("keydown", (event) => { if (event.key === "Escape") { closeModal(); closeMobileSidebar(); } });
  document.querySelectorAll(".export-card").forEach((card) => card.addEventListener("click", () => exportDataset(card.dataset.export)));

  mobileUi.menuToggle?.addEventListener("click", toggleMobileSidebar);
  mobileUi.overlay?.addEventListener("click", closeMobileSidebar);
  window.addEventListener("resize", () => {
    if (window.innerWidth > 768) closeMobileSidebar();
  });

  els.pills.forEach((pill) => {
    pill.addEventListener("click", () => setPillFilter(pill.dataset.filter));
  });

  attachPager("overviewItems", "overviewItems", renderItems);
  attachPager("items", "items", renderItems);
  attachPager("overviewAlerts", "overviewAlerts", renderLowStock);
  attachPager("alerts", "alerts", renderLowStock);
  attachPager("supplierSummary", "supplierSummary", renderSupplierSummary);
  attachPager("supplierLinks", "supplierLinks", renderSupplierLinks);
  attachPager("purchases", "purchases", renderPurchases);
  attachPager("transactions", "transactions", renderTransactions);
}

// Main startup flow for the stock page
async function init() {
  setLoading(true);
  try {
    await seedFirebaseIfEmpty();
    renderAll();
    setTodayDefaults();
    attachEvents();
    switchView(currentView);
    showToast("Stock module loaded from Firebase.");
  } catch (error) {
    console.error(error);
    showToast("Could not load stock data from Firebase. Check your Firestore rules and connection.");
  } finally {
    setLoading(false);
  }
}

// Start the stock module when the page loads
init();