/**
 * Studi Kasus Praktikum 3 — PABWE
 * Fitur:
 * 1. Tab Switcher + localStorage
 * 2. Catatan Pengeluaran Harian (Expense Tracker CRUD + Ringkasan Saldo)
 * 3. Bookmark / Link Manager (Validasi URL + Filter & Sort)
 * 4. Kuis Interaktif (Pilihan Ganda, Skor & High Score)
 */

/* ==========================================================================
   0. HELPER & UTILITAS GLOBAL
   ========================================================================== */

const $ = (selector) => {
  const el = document.querySelector(selector);
  if (!el) throw new Error(`Elemen dengan selektor "${selector}" tidak ditemukan.`);
  return el;
};

const $all = (selector) => document.querySelectorAll(selector);

/** Format angka ke format mata uang Rupiah */
function formatRupiah(number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(number);
}

/** Tampilkan / Sembunyikan Modal */
function openModal(modalEl) {
  modalEl.classList.remove("hidden");
  modalEl.classList.add("flex");
  document.body.classList.add("overflow-hidden");
}

function closeModal(modalEl) {
  modalEl.classList.add("hidden");
  modalEl.classList.remove("flex");
  document.body.classList.remove("overflow-hidden");
}

// Tutup semua modal lewat tombol close atau klik backdrop
$all(".btn-close-modal").forEach((btn) => {
  btn.addEventListener("click", (e) => {
    const modal = e.target.closest('[role="dialog"]');
    if (modal) closeModal(modal);
  });
});

$all(".modal-backdrop").forEach((backdrop) => {
  backdrop.addEventListener("click", (e) => {
    const modal = e.target.closest('[role="dialog"]');
    if (modal) closeModal(modal);
  });
});

// Escape key listener untuk menutup modal
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    $all('[role="dialog"]').forEach((modal) => {
      if (!modal.classList.contains("hidden")) closeModal(modal);
    });
  }
});


/* ==========================================================================
   1. TAB SWITCHER (PERSISTEN)
   ========================================================================== */

const TAB_STORAGE_KEY = "pabwe-p3-current-tab";
const tabButtons = $all(".tab-btn");
const panels = {
  expense: $("#panel-expense"),
  bookmark: $("#panel-bookmark"),
  quiz: $("#panel-quiz"),
};

function switchTab(name) {
  if (!panels[name]) name = "expense";

  Object.entries(panels).forEach(([key, panel]) => {
    panel.classList.toggle("hidden", key !== name);
  });

  tabButtons.forEach((btn) => {
    const active = btn.dataset.tab === name;
    btn.setAttribute("aria-selected", String(active));
    btn.classList.toggle("bg-slate-900", active);
    btn.classList.toggle("text-white", active);
    btn.classList.toggle("shadow-md", active);
    btn.classList.toggle("text-slate-600", !active);
    btn.classList.toggle("hover:bg-slate-100", !active);
  });

  localStorage.setItem(TAB_STORAGE_KEY, name);
}

tabButtons.forEach((btn) => {
  btn.addEventListener("click", () => switchTab(btn.dataset.tab));
});

// Load tab terakhir dari localStorage
const savedTab = localStorage.getItem(TAB_STORAGE_KEY) || "expense";
switchTab(savedTab);


/* ==========================================================================
   2. CATATAN PENGELUARAN HARIAN (EXPENSE TRACKER)
   ========================================================================== */

const EXPENSE_STORAGE_KEY = "pabwe-p3-expense-data";
let expenses = loadExpenses();
let editingExpenseId = null;

// DOM Elements Expense
const expForm = $("#exp-form");
const expTitle = $("#exp-title");
const expAmount = $("#exp-amount");
const expType = $("#exp-type");
const expCategory = $("#exp-category");
const expDate = $("#exp-date");
const expSearch = $("#exp-search");
const expFilterType = $("#exp-filter-type");
const expSort = $("#exp-sort");
const expList = $("#exp-list");
const expEmpty = $("#exp-empty");
const expTotalIncome = $("#exp-total-income");
const expTotalExpense = $("#exp-total-expense");
const expBalance = $("#exp-balance");

// Modal Elements Expense
const modalEditExp = $("#modal-edit-exp");
const expEditForm = $("#exp-edit-form");
const expEditTitle = $("#exp-edit-title");
const expEditAmount = $("#exp-edit-amount");
const expEditType = $("#exp-edit-type");
const expEditCategory = $("#exp-edit-category");
const expEditDate = $("#exp-edit-date");

// Inisialisasi default tanggal hari ini pada form tambah
expDate.valueAsDate = new Date();

function loadExpenses() {
  try {
    const raw = localStorage.getItem(EXPENSE_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveExpenses() {
  localStorage.setItem(EXPENSE_STORAGE_KEY, JSON.stringify(expenses));
}

function updateExpenseSummary() {
  let income = 0;
  let expense = 0;

  expenses.forEach((item) => {
    if (item.type === "income") income += item.amount;
    else expense += item.amount;
  });

  const balance = income - expense;
  expTotalIncome.textContent = formatRupiah(income);
  expTotalExpense.textContent = formatRupiah(expense);
  expBalance.textContent = formatRupiah(balance);

  expBalance.className = `font-display text-2xl font-bold ${
    balance < 0 ? "text-rose-600" : "text-slate-900"
  }`;
}

function renderExpenses() {
  const query = expSearch.value.trim().toLowerCase();
  const filterType = expFilterType.value;
  const sort = expSort.value;

  // Filter
  let items = expenses.filter((item) => {
    const matchQuery = item.title.toLowerCase().includes(query) || item.category.toLowerCase().includes(query);
    const matchType = filterType === "all" || item.type === filterType;
    return matchQuery && matchType;
  });

  // Sort
  items.sort((a, b) => {
    switch (sort) {
      case "oldest":
        return new Date(a.date) - new Date(b.date);
      case "amount-desc":
        return b.amount - a.amount;
      case "amount-asc":
        return a.amount - b.amount;
      case "newest":
      default:
        return new Date(b.date) - new Date(a.date);
    }
  });

  // Empty state handling
  const noData = expenses.length === 0;
  expEmpty.classList.toggle("hidden", !noData);
  expList.classList.toggle("hidden", noData);

  expList.innerHTML = "";

  if (!noData && items.length === 0) {
    expList.innerHTML = `
      <li class="p-4 text-center text-sm text-slate-500 bg-slate-50 rounded-xl border border-slate-200">
        Tidak ada transaksi yang cocok dengan filter.
      </li>`;
    return;
  }

  items.forEach((item) => {
    const isIncome = item.type === "income";
    const li = document.createElement("li");
    li.className = "flex items-center justify-between p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition shadow-sm";

    li.innerHTML = `
      <div class="flex items-center gap-3.5 min-w-0">
        <div class="w-10 h-10 shrink-0 rounded-xl flex items-center justify-center ${
          isIncome ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
        }">
          <i class="ti ${isIncome ? "ti-arrow-down-left" : "ti-arrow-up-right"} text-xl"></i>
        </div>
        <div class="min-w-0">
          <p class="font-medium text-slate-900 truncate text-sm sm:text-base">${item.title}</p>
          <div class="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
            <span class="px-2 py-0.5 rounded bg-slate-100 font-medium text-slate-600">${item.category}</span>
            <span>•</span>
            <span>${item.date}</span>
          </div>
        </div>
      </div>
      <div class="flex items-center gap-3 shrink-0">
        <span class="font-display font-bold text-sm sm:text-base ${
          isIncome ? "text-emerald-600" : "text-rose-600"
        }">
          ${isIncome ? "+" : "-"} ${formatRupiah(item.amount)}
        </span>
        <div class="flex items-center gap-1">
          <button type="button" class="btn-edit-exp p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100" title="Ubah">
            <i class="ti ti-pencil"></i>
          </button>
          <button type="button" class="btn-delete-exp p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50" title="Hapus">
            <i class="ti ti-trash"></i>
          </button>
        </div>
      </div>
    `;

    // Event Edit
    li.querySelector(".btn-edit-exp").addEventListener("click", () => {
      editingExpenseId = item.id;
      expEditTitle.value = item.title;
      expEditAmount.value = item.amount;
      expEditType.value = item.type;
      expEditCategory.value = item.category;
      expEditDate.value = item.date;
      openModal(modalEditExp);
    });

    // Event Delete
    li.querySelector(".btn-delete-exp").addEventListener("click", () => {
      openDeleteModal(item.title, () => {
        expenses = expenses.filter((t) => t.id !== item.id);
        saveExpenses();
        updateExpenseSummary();
        renderExpenses();
      });
    });

    expList.appendChild(li);
  });

  updateExpenseSummary();
}

// Submit Form Tambah
expForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const amount = Number(expAmount.value);
  if (amount <= 0) return;

  expenses.push({
    id: crypto.randomUUID(),
    title: expTitle.value.trim(),
    amount,
    type: expType.value,
    category: expCategory.value,
    date: expDate.value,
    createdAt: Date.now(),
  });

  saveExpenses();
  expForm.reset();
  expDate.valueAsDate = new Date();
  renderExpenses();
});

// Submit Form Edit
expEditForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const item = expenses.find((t) => t.id === editingExpenseId);
  if (item) {
    item.title = expEditTitle.value.trim();
    item.amount = Number(expEditAmount.value);
    item.type = expEditType.value;
    item.category = expEditCategory.value;
    item.date = expEditDate.value;

    saveExpenses();
    renderExpenses();
    closeModal(modalEditExp);
  }
});

expSearch.addEventListener("input", renderExpenses);
expFilterType.addEventListener("change", renderExpenses);
expSort.addEventListener("change", renderExpenses);


/* ==========================================================================
   3. BOOKMARK / LINK MANAGER
   ========================================================================== */

const BM_STORAGE_KEY = "pabwe-p3-bookmarks";
let bookmarks = loadBookmarks();
let editingBmId = null;

// DOM Elements Bookmark
const bmForm = $("#bm-form");
const bmTitle = $("#bm-title");
const bmUrl = $("#bm-url");
const bmCategory = $("#bm-category");
const bmNotes = $("#bm-notes");
const bmSearch = $("#bm-search");
const bmSort = $("#bm-sort");
const bmList = $("#bm-list");
const bmEmpty = $("#bm-empty");

// Modal Elements Bookmark
const modalEditBm = $("#modal-edit-bm");
const bmEditForm = $("#bm-edit-form");
const bmEditTitle = $("#bm-edit-title");
const bmEditUrl = $("#bm-edit-url");
const bmEditCategory = $("#bm-edit-category");
const bmEditNotes = $("#bm-edit-notes");

function loadBookmarks() {
  try {
    const raw = localStorage.getItem(BM_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveBookmarks() {
  localStorage.setItem(BM_STORAGE_KEY, JSON.stringify(bookmarks));
}

function isValidURL(str) {
  try {
    const url = new URL(str);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function renderBookmarks() {
  const query = bmSearch.value.trim().toLowerCase();
  const sort = bmSort.value;

  let items = bookmarks.filter((bm) => {
    return (
      bm.title.toLowerCase().includes(query) ||
      bm.url.toLowerCase().includes(query) ||
      bm.category.toLowerCase().includes(query)
    );
  });

  items.sort((a, b) => {
    switch (sort) {
      case "oldest":
        return a.createdAt - b.createdAt;
      case "title-asc":
        return a.title.localeCompare(b.title, "id");
      case "title-desc":
        return b.title.localeCompare(a.title, "id");
      case "newest":
      default:
        return b.createdAt - a.createdAt;
    }
  });

  const noData = bookmarks.length === 0;
  bmEmpty.classList.toggle("hidden", !noData);
  bmList.classList.toggle("hidden", noData);

  bmList.innerHTML = "";

  if (!noData && items.length === 0) {
    bmList.innerHTML = `
      <div class="sm:col-span-2 p-6 text-center text-sm text-slate-500 bg-slate-50 rounded-xl border border-slate-200">
        Tidak ada bookmark yang sesuai dengan kueri pencarian.
      </div>`;
    return;
  }

  items.forEach((bm) => {
    const card = document.createElement("div");
    card.className = "flex flex-col justify-between p-4 rounded-xl border border-slate-200 bg-white hover:shadow-sm transition";

    card.innerHTML = `
      <div>
        <div class="flex items-start justify-between gap-2 mb-2">
          <span class="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-xs font-semibold">
            ${bm.category}
          </span>
          <div class="flex items-center gap-1">
            <button type="button" class="btn-edit-bm p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-700" title="Ubah">
              <i class="ti ti-pencil text-sm"></i>
            </button>
            <button type="button" class="btn-delete-bm p-1 rounded hover:bg-rose-50 text-slate-400 hover:text-rose-600" title="Hapus">
              <i class="ti ti-trash text-sm"></i>
            </button>
          </div>
        </div>
        <a href="${bm.url}" target="_blank" rel="noopener noreferrer" class="font-display font-bold text-slate-900 hover:text-indigo-600 transition flex items-center gap-1 group">
          <span class="truncate">${bm.title}</span>
          <i class="ti ti-external-link text-xs opacity-0 group-hover:opacity-100 transition-opacity"></i>
        </a>
        <p class="text-xs text-slate-400 truncate mt-0.5">${bm.url}</p>
        ${bm.notes ? `<p class="text-xs text-slate-600 mt-2 line-clamp-2 bg-slate-50 p-2 rounded-lg">${bm.notes}</p>` : ""}
      </div>
      <div class="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
        <span>Ditambahkan: ${new Date(bm.createdAt).toLocaleDateString("id-ID")}</span>
      </div>
    `;

    // Event Ubah Bookmark
    card.querySelector(".btn-edit-bm").addEventListener("click", () => {
      editingBmId = bm.id;
      bmEditTitle.value = bm.title;
      bmEditUrl.value = bm.url;
      bmEditCategory.value = bm.category;
      bmEditNotes.value = bm.notes || "";
      openModal(modalEditBm);
    });

    // Event Hapus Bookmark
    card.querySelector(".btn-delete-bm").addEventListener("click", () => {
      openDeleteModal(bm.title, () => {
        bookmarks = bookmarks.filter((b) => b.id !== bm.id);
        saveBookmarks();
        renderBookmarks();
      });
    });

    bmList.appendChild(card);
  });
}

// Submit Tambah Bookmark
bmForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const url = bmUrl.value.trim();

  if (!isValidURL(url)) {
    alert("Mohon masukkan format URL yang valid (diawali http:// atau https://)");
    bmUrl.focus();
    return;
  }

  bookmarks.push({
    id: crypto.randomUUID(),
    title: bmTitle.value.trim(),
    url,
    category: bmCategory.value.trim(),
    notes: bmNotes.value.trim(),
    createdAt: Date.now(),
  });

  saveBookmarks();
  bmForm.reset();
  renderBookmarks();
});

// Submit Edit Bookmark
bmEditForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const url = bmEditUrl.value.trim();

  if (!isValidURL(url)) {
    alert("Mohon masukkan format URL yang valid (diawali http:// atau https://)");
    bmEditUrl.focus();
    return;
  }

  const bm = bookmarks.find((b) => b.id === editingBmId);
  if (bm) {
    bm.title = bmEditTitle.value.trim();
    bm.url = url;
    bm.category = bmEditCategory.value.trim();
    bm.notes = bmEditNotes.value.trim();

    saveBookmarks();
    renderBookmarks();
    closeModal(modalEditBm);
  }
});

bmSearch.addEventListener("input", renderBookmarks);
bmSort.addEventListener("change", renderBookmarks);


/* ==========================================================================
   4. KUIS INTERAKTIF (QUIZ APP)
   ========================================================================== */

const QUIZ_STORAGE_KEY = "pabwe-p3-quiz-high-score";

const QUIZ_DATA = [
  {
    question: "Manakah method array JavaScript yang digunakan untuk membuat array baru berisi hasil pemanggilan fungsi pada setiap elemennya?",
    options: ["forEach()", "map()", "filter()", "reduce()"],
    answer: 1,
    explanation: "map() memetakan setiap item ke nilai baru dan mengembalikan array baru dengan panjang yang sama.",
  },
  {
    question: "Bagaimanakah cara menyimpan objek JavaScript ke dalam localStorage?",
    options: [
      "localStorage.setItem('key', obj)",
      "localStorage.setItem('key', JSON.stringify(obj))",
      "localStorage.setObject('key', obj)",
      "JSON.save(localStorage, obj)",
    ],
    answer: 1,
    explanation: "localStorage hanya dapat menyimpan string. Oleh karena itu, kita harus melakukan JSON.stringify(obj).",
  },
  {
    question: "Manakah atribut link yang digunakan agar tautan terbuka di tab baru secara aman?",
    options: [
      'target="_blank" rel="noopener noreferrer"',
      'target="_new" rel="secure"',
      'target="_self" rel="tab"',
      'target="_blank" rel="follow"',
    ],
    answer: 0,
    explanation: 'target="_blank" membuka jendela baru, dan rel="noopener noreferrer" mencegah eksploitasi window.opener.',
  },
  {
    question: "Keyword apa yang digunakan untuk mendeklarasikan variabel dengan scope blok yang nilainya tidak dapat di-reassign?",
    options: ["var", "let", "const", "static"],
    answer: 2,
    explanation: "const bersifat block-scoped dan referensi nilainya tidak dapat diubah kembali (immutable assignment).",
  },
  {
    question: "Event DOM apa yang dipicu saat formulir (form) diserahkan/dikirim oleh pengguna?",
    options: ["change", "input", "submit", "send"],
    answer: 2,
    explanation: "Event 'submit' aktif saat tombol submit ditekan atau Enter ditekan di dalam input form.",
  },
];

// Quiz DOM Elements
const quizViewStart = $("#quiz-view-start");
const quizViewPlay = $("#quiz-view-play");
const quizViewResult = $("#quiz-view-result");
const quizHighScoreDisplay = $("#quiz-high-score");
const quizBtnStart = $("#quiz-btn-start");
const quizBtnNext = $("#quiz-btn-next");
const quizBtnRestart = $("#quiz-btn-restart");
const quizProgressText = $("#quiz-progress-text");
const quizProgressBar = $("#quiz-progress-bar");
const quizScoreBadge = $("#quiz-score-badge");
const quizQuestion = $("#quiz-question");
const quizOptions = $("#quiz-options");
const quizFeedback = $("#quiz-feedback");
const quizResultMsg = $("#quiz-result-message");
const quizFinalScore = $("#quiz-final-score");
const quizFinalHigh = $("#quiz-final-high");

let currentQuestionIndex = 0;
let quizScore = 0;
let answered = false;

function getQuizHighScore() {
  const v = localStorage.getItem(QUIZ_STORAGE_KEY);
  return v !== null ? Number(v) : null;
}

function updateHighScoreUI() {
  const high = getQuizHighScore();
  quizHighScoreDisplay.textContent = high !== null ? `${high} / ${QUIZ_DATA.length * 20}` : "Belum ada";
}

function startQuiz() {
  currentQuestionIndex = 0;
  quizScore = 0;
  quizViewStart.classList.add("hidden");
  quizViewResult.classList.add("hidden");
  quizViewPlay.classList.remove("hidden");
  renderQuestion();
}

function renderQuestion() {
  answered = false;
  const q = QUIZ_DATA[currentQuestionIndex];

  // Update UI Progress
  const progressPercent = ((currentQuestionIndex + 1) / QUIZ_DATA.length) * 100;
  quizProgressText.textContent = `Soal ${currentQuestionIndex + 1} dari ${QUIZ_DATA.length}`;
  quizProgressBar.style.width = `${progressPercent}%`;
  quizScoreBadge.textContent = `Skor: ${quizScore}`;
  quizQuestion.textContent = q.question;

  quizFeedback.className = "hidden";
  quizFeedback.innerHTML = "";
  quizBtnNext.classList.add("hidden");
  quizOptions.innerHTML = "";

  // Render opsi
  q.options.forEach((optText, index) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className =
      "w-full text-left p-3.5 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition text-sm font-medium flex items-center justify-between";
    btn.innerHTML = `<span>${optText}</span><i class="ti ti-circle text-slate-300"></i>`;

    btn.addEventListener("click", () => handleSelectAnswer(index, btn));
    quizOptions.appendChild(btn);
  });
}

function handleSelectAnswer(selectedIndex, selectedBtn) {
  if (answered) return;
  answered = true;

  const q = QUIZ_DATA[currentQuestionIndex];
  const isCorrect = selectedIndex === q.answer;
  const optionButtons = quizOptions.querySelectorAll("button");

  // Nonaktifkan semua opsi
  optionButtons.forEach((btn) => (btn.disabled = true));

  if (isCorrect) {
    quizScore += 20;
    quizScoreBadge.textContent = `Skor: ${quizScore}`;
    selectedBtn.className =
      "w-full text-left p-3.5 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-900 text-sm font-medium flex items-center justify-between";
    selectedBtn.querySelector("i").className = "ti ti-circle-check-filled text-emerald-600 text-lg";

    quizFeedback.className = "rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 p-4 text-sm mb-4";
    quizFeedback.innerHTML = `<strong>Benar!</strong> ${q.explanation}`;
  } else {
    selectedBtn.className =
      "w-full text-left p-3.5 rounded-xl border border-rose-300 bg-rose-50 text-rose-900 text-sm font-medium flex items-center justify-between";
    selectedBtn.querySelector("i").className = "ti ti-circle-x-filled text-rose-600 text-lg";

    // Highlight jawaban yang benar
    const correctBtn = optionButtons[q.answer];
    correctBtn.className =
      "w-full text-left p-3.5 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-900 text-sm font-medium flex items-center justify-between";
    correctBtn.querySelector("i").className = "ti ti-circle-check text-emerald-600 text-lg";

    quizFeedback.className = "rounded-xl border border-rose-200 bg-rose-50 text-rose-800 p-4 text-sm mb-4";
    quizFeedback.innerHTML = `<strong>Kurang tepat.</strong> ${q.explanation}`;
  }

  quizFeedback.classList.remove("hidden");
  quizBtnNext.classList.remove("hidden");
}

quizBtnNext.addEventListener("click", () => {
  currentQuestionIndex++;
  if (currentQuestionIndex < QUIZ_DATA.length) {
    renderQuestion();
  } else {
    showQuizResult();
  }
});

function showQuizResult() {
  quizViewPlay.classList.add("hidden");
  quizViewResult.classList.remove("hidden");

  const currentHigh = getQuizHighScore();
  let isNewRecord = false;

  if (currentHigh === null || quizScore > currentHigh) {
    localStorage.setItem(QUIZ_STORAGE_KEY, String(quizScore));
    isNewRecord = true;
  }

  quizFinalScore.textContent = quizScore;
  quizFinalHigh.textContent = getQuizHighScore();

  if (isNewRecord && quizScore > 0) {
    quizResultMsg.innerHTML = "🎉 <strong>Luar biasa!</strong> Anda mencetak rekor skor tertinggi baru!";
  } else if (quizScore === 100) {
    quizResultMsg.textContent = "Sempurna! Anda memahami materi dengan sangat baik.";
  } else {
    quizResultMsg.textContent = "Kerja bagus! Terus latih pemahaman web Anda.";
  }

  updateHighScoreUI();
}

quizBtnStart.addEventListener("click", startQuiz);
quizBtnRestart.addEventListener("click", startQuiz);


/* ==========================================================================
   5. MODAL KONFIRMASI HAPUS UNIVERSAL
   ========================================================================== */

const modalDelete = $("#modal-delete");
const modalDeleteItemTitle = $("#modal-delete-item-title");
const btnConfirmDelete = $("#btn-confirm-delete");
let onConfirmDeleteCallback = null;

function openDeleteModal(itemTitle, onConfirm) {
  modalDeleteItemTitle.textContent = `"${itemTitle}"`;
  onConfirmDeleteCallback = onConfirm;
  openModal(modalDelete);
}

btnConfirmDelete.addEventListener("click", () => {
  if (typeof onConfirmDeleteCallback === "function") {
    onConfirmDeleteCallback();
  }
  closeModal(modalDelete);
});


/* ==========================================================================
   6. INISIALISASI SAAT HALAMAN DIMUAT
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
  renderExpenses();
  renderBookmarks();
  updateHighScoreUI();
});