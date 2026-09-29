/**
 * Studi Kasus Praktikum 3 — PABWE
 * Penulis: [Isi Nama / NIM Anda]
 * 
 * Modul:
 * 1. Utilitas & Modal Manager
 * 2. Integrasi Navigasi Tab (3.4)
 * 3. Catatan Pengeluaran Harian / Expense Tracker (3.1)
 * 4. Bookmark / Link Manager (3.2)
 * 5. Kuis Interaktif / Quiz App (3.3)
 */

/* ==========================================================================
   1. UTILITAS & MODAL MANAGER
   ========================================================================== */

const $ = (selector) => {
  const el = document.querySelector(selector);
  if (!el) throw new Error(`Elemen "${selector}" tidak ditemukan.`);
  return el;
};

const $all = (selector) => document.querySelectorAll(selector);

/** Format bilangan ke Rupiah (IDR) */
function formatRupiah(amount) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Tampilkan Modal */
function openModal(modal) {
  modal.classList.remove("hidden");
  modal.classList.add("flex");
  document.body.classList.add("overflow-hidden");
}

/** Tutup Modal */
function closeModal(modal) {
  modal.classList.add("hidden");
  modal.classList.remove("flex");
  document.body.classList.remove("overflow-hidden");
}

// Tutup modal lewat tombol close atau klik latar belakang (backdrop)
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

// Listener tombol Escape keyboard
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    $all('[role="dialog"]').forEach((modal) => {
      if (!modal.classList.contains("hidden")) closeModal(modal);
    });
  }
});

// Modal Hapus Universal
const modalDelete = $("#modal-delete");
const modalDeleteItemTitle = $("#modal-delete-item-title");
const btnConfirmDelete = $("#btn-confirm-delete");
let deleteActionCallback = null;

function openDeleteModal(title, onConfirm) {
  modalDeleteItemTitle.textContent = `"${title}"`;
  deleteActionCallback = onConfirm;
  openModal(modalDelete);
}

btnConfirmDelete.addEventListener("click", () => {
  if (typeof deleteActionCallback === "function") {
    deleteActionCallback();
  }
  closeModal(modalDelete);
});


/* ==========================================================================
   2. INTEGRASI TAB DENGAN PERSISTENSI (3.4)
   ========================================================================== */

const TAB_STORAGE_KEY = "pabwe-sk-active-tab";
const tabButtons = $all(".tab-btn");
const panels = {
  expense: $("#panel-expense"),
  bookmark: $("#panel-bookmark"),
  quiz: $("#panel-quiz"),
};

function switchTab(targetTab) {
  if (!panels[targetTab]) targetTab = "expense";

  // Tampilkan hanya panel yang aktif
  Object.entries(panels).forEach(([key, panel]) => {
    panel.classList.toggle("hidden", key !== targetTab);
  });

  // Highlight tombol tab aktif
  tabButtons.forEach((btn) => {
    const isActive = btn.dataset.tab === targetTab;
    btn.setAttribute("aria-selected", String(isActive));
    btn.classList.toggle("bg-slate-900", isActive);
    btn.classList.toggle("text-white", isActive);
    btn.classList.toggle("shadow-md", isActive);
    btn.classList.toggle("text-slate-600", !isActive);
    btn.classList.toggle("hover:bg-slate-100", !isActive);
  });

  localStorage.setItem(TAB_STORAGE_KEY, targetTab);
}

tabButtons.forEach((btn) => {
  btn.addEventListener("click", () => switchTab(btn.dataset.tab));
});

// Pulihkan tab terakhir yang dikunjungi pengguna
const savedTab = localStorage.getItem(TAB_STORAGE_KEY) || "expense";
switchTab(savedTab);


/* ==========================================================================
   3. CATATAN PENGELUARAN HARIAN (EXPENSE TRACKER - 3.1)
   ========================================================================== */

const EXPENSE_STORAGE_KEY = "pabwe-sk-expenses";
let expenses = loadExpenses();
let editingExpenseId = null;

// Elemen DOM Expense
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

// Elemen Modal Edit Expense
const modalEditExp = $("#modal-edit-exp");
const expEditForm = $("#exp-edit-form");
const expEditTitle = $("#exp-edit-title");
const expEditAmount = $("#exp-edit-amount");
const expEditType = $("#exp-edit-type");
const expEditCategory = $("#exp-edit-category");
const expEditDate = $("#exp-edit-date");

// Inisialisasi default input tanggal ke hari ini
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
    if (item.type === "income") {
      income += item.amount;
    } else {
      expense += item.amount;
    }
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

  // Filter pencarian & tipe
  let items = expenses.filter((item) => {
    const matchQuery =
      item.title.toLowerCase().includes(query) ||
      item.category.toLowerCase().includes(query);
    const matchType = filterType === "all" || item.type === filterType;
    return matchQuery && matchType;
  });

  // Sorting
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

  const noData = expenses.length === 0;
  expEmpty.classList.toggle("hidden", !noData);
  expList.classList.toggle("hidden", noData);

  expList.innerHTML = "";

  if (!noData && items.length === 0) {
    expList.innerHTML = `
      <li class="p-4 text-center text-sm text-slate-500 bg-slate-50 rounded-xl border border-slate-200">
        Tidak ada transaksi yang cocok dengan kriteria pencarian/filter.
      </li>`;
    return;
  }

  items.forEach((item) => {
    const isIncome = item.type === "income";
    const li = document.createElement("li");
    li.className =
      "flex items-center justify-between p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition shadow-sm";

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

    // Event tombol edit
    li.querySelector(".btn-edit-exp").addEventListener("click", () => {
      editingExpenseId = item.id;
      expEditTitle.value = item.title;
      expEditAmount.value = item.amount;
      expEditType.value = item.type;
      expEditCategory.value = item.category;
      expEditDate.value = item.date;
      openModal(modalEditExp);
    });

    // Event tombol hapus
    li.querySelector(".btn-delete-exp").addEventListener("click", () => {
      openDeleteModal(item.title, () => {
        expenses = expenses.filter((t) => t.id !== item.id);
        saveExpenses();
        renderExpenses();
      });
    });

    expList.appendChild(li);
  });

  updateExpenseSummary();
}

// Form Submit Tambah Transaksi
expForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const amount = Number(expAmount.value);
  if (amount <= 0) {
    alert("Jumlah nominal harus lebih dari 0.");
    return;
  }

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

// Form Submit Edit Transaksi
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
   4. BOOKMARK / LINK MANAGER (3.2)
   ========================================================================== */

const BM_STORAGE_KEY = "pabwe-sk-bookmarks";
let bookmarks = loadBookmarks();
let editingBmId = null;

// Elemen DOM Bookmark
const bmForm = $("#bm-form");
const bmTitle = $("#bm-title");
const bmUrl = $("#bm-url");
const bmCategory = $("#bm-category");
const bmNotes = $("#bm-notes");
const bmSearch = $("#bm-search");
const bmSort = $("#bm-sort");
const bmList = $("#bm-list");
const bmEmpty = $("#bm-empty");

// Elemen Modal Edit Bookmark
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

/** Validasi format URL sederhana */
function isValidURL(string) {
  try {
    const url = new URL(string);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function renderBookmarks() {
  const query = bmSearch.value.trim().toLowerCase();
  const sort = bmSort.value;

  // Filter
  let items = bookmarks.filter((bm) => {
    return (
      bm.title.toLowerCase().includes(query) ||
      bm.url.toLowerCase().includes(query) ||
      bm.category.toLowerCase().includes(query)
    );
  });

  // Sorting
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
        Tidak ada bookmark yang sesuai dengan pencarian Anda.
      </div>`;
    return;
  }

  items.forEach((bm) => {
    const card = document.createElement("div");
    card.className =
      "flex flex-col justify-between p-4 rounded-xl border border-slate-200 bg-white hover:shadow-sm transition";

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
        <!-- Link membuka di tab baru -->
        <a href="${bm.url}" target="_blank" rel="noopener noreferrer" class="font-display font-bold text-slate-900 hover:text-indigo-600 transition flex items-center gap-1 group">
          <span class="truncate">${bm.title}</span>
          <i class="ti ti-external-link text-xs opacity-0 group-hover:opacity-100 transition-opacity"></i>
        </a>
        <p class="text-xs text-slate-400 truncate mt-0.5">${bm.url}</p>
        ${bm.notes ? `<p class="text-xs text-slate-600 mt-2.5 bg-slate-50 p-2 rounded-lg">${bm.notes}</p>` : ""}
      </div>
      <div class="mt-3 pt-2 border-t border-slate-100 text-[11px] text-slate-400">
        Tersimpan: ${new Date(bm.createdAt).toLocaleDateString("id-ID")}
      </div>
    `;

    // Event Ubah
    card.querySelector(".btn-edit-bm").addEventListener("click", () => {
      editingBmId = bm.id;
      bmEditTitle.value = bm.title;
      bmEditUrl.value = bm.url;
      bmEditCategory.value = bm.category;
      bmEditNotes.value = bm.notes || "";
      openModal(modalEditBm);
    });

    // Event Hapus
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

// Form Submit Tambah Bookmark
bmForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const url = bmUrl.value.trim();

  if (!isValidURL(url)) {
    alert("Format URL tidak valid! Harap masukkan tautan yang diawali http:// atau https://");
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

// Form Submit Edit Bookmark
bmEditForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const url = bmEditUrl.value.trim();

  if (!isValidURL(url)) {
    alert("Format URL tidak valid! Harap masukkan tautan yang diawali http:// atau https://");
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
   5. KUIS INTERAKTIF (QUIZ APP - 3.3)
   ========================================================================== */

const QUIZ_STORAGE_KEY = "pabwe-sk-quiz-highscore";

// Dataset soal kuis pilihan ganda
const QUIZ_DATA = [
  {
    question: "Manakah method array JavaScript yang digunakan untuk menyaring elemen berdasarkan kondisi tertentu?",
    options: ["map()", "filter()", "forEach()", "reduce()"],
    answer: 1,
    explanation: "filter() membuat array baru berisi elemen yang lolos dari kondisi callback pengujian.",
  },
  {
    question: "Bagaimanakah cara mengubah string JSON menjadi objek JavaScript asli?",
    options: ["JSON.stringify()", "JSON.parse()", "JSON.toObject()", "JSON.decode()"],
    answer: 1,
    explanation: "JSON.parse() mengurai string format JSON kembali menjadi struktur objek/array JavaScript.",
  },
  {
    question: "Atribut HTML apa yang digunakan pada elemen <a> untuk membuka halaman baru secara aman?",
    options: [
      'target="_blank" rel="noopener noreferrer"',
      'target="_new" rel="secure"',
      'target="_top" rel="follow"',
      'target="_window" rel="external"',
    ],
    answer: 0,
    explanation: 'target="_blank" membuka tab baru, sedangkan rel="noopener noreferrer" mengamankan window opener.',
  },
  {
    question: "Manakah cara seleksi elemen DOM dengan JavaScript modern yang paling sering digunakan?",
    options: ["document.getElementById", "document.querySelector", "document.getElementsByTagName", "document.findElement"],
    answer: 1,
    explanation: "document.querySelector menggunakan CSS selector dan fleksibel untuk mengambil elemen tunggal apa pun.",
  },
  {
    question: "Di manakah data localStorage disimpan pada web browser?",
    options: ["Di server cloud", "Di cookie sesi sementara", "Di penyimpanan lokal browser pengguna secara persisten", "Di database SQL"],
    answer: 2,
    explanation: "localStorage menyimpan data dalam browser klien dan tetap ada meskipun halaman di-refresh / browser ditutup.",
  },
];

// Elemen DOM Quiz
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
let isAnswered = false;

function getQuizHighScore() {
  const score = localStorage.getItem(QUIZ_STORAGE_KEY);
  return score !== null ? Number(score) : null;
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
  isAnswered = false;
  const q = QUIZ_DATA[currentQuestionIndex];

  // Update Tampilan Progres
  const progressPercent = ((currentQuestionIndex + 1) / QUIZ_DATA.length) * 100;
  quizProgressText.textContent = `Soal ${currentQuestionIndex + 1} dari ${QUIZ_DATA.length}`;
  quizProgressBar.style.width = `${progressPercent}%`;
  quizScoreBadge.textContent = `Skor: ${quizScore}`;
  quizQuestion.textContent = q.question;

  quizFeedback.className = "hidden";
  quizFeedback.innerHTML = "";
  quizBtnNext.classList.add("hidden");
  quizOptions.innerHTML = "";

  // Render Pilihan Jawaban
  q.options.forEach((optText, index) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className =
      "w-full text-left p-3.5 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition text-sm font-medium flex items-center justify-between";
    btn.innerHTML = `<span>${optText}</span><i class="ti ti-circle text-slate-300"></i>`;

    btn.addEventListener("click", () => handleAnswerSelect(index, btn));
    quizOptions.appendChild(btn);
  });
}

function handleAnswerSelect(selectedIndex, selectedBtn) {
  if (isAnswered) return;
  isAnswered = true;

  const q = QUIZ_DATA[currentQuestionIndex];
  const isCorrect = selectedIndex === q.answer;
  const optionButtons = quizOptions.querySelectorAll("button");

  // Kunci semua opsi agar tidak bisa diklik dua kali
  optionButtons.forEach((b) => (b.disabled = true));

  if (isCorrect) {
    quizScore += 20; // 5 soal x 20 = 100
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

    // Tunjukkan jawaban yang benar
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
    quizResultMsg.innerHTML = "🎉 <strong>Hebat!</strong> Anda mencetak rekor skor tertinggi baru!";
  } else if (quizScore === 100) {
    quizResultMsg.textContent = "Sempurna! Semua soal berhasil Anda jawab dengan benar.";
  } else {
    quizResultMsg.textContent = "Kerja bagus! Latih terus pemahaman dasar pemrograman web Anda.";
  }

  updateHighScoreUI();
}

quizBtnStart.addEventListener("click", startQuiz);
quizBtnRestart.addEventListener("click", startQuiz);


/* ==========================================================================
   6. INISIALISASI HALAMAN SAAT PERTAMA KALI DIBUKA
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
  renderExpenses();
  renderBookmarks();
  updateHighScoreUI();
});