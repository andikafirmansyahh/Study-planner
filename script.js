/* ==========================================================================
   1. KONFIGURASI & VARIABLE GLOBAL
   - Ubah kunci localStorage, elemen DOM dasar, atau konfigurasi segmen di sini.
   ========================================================================== */
const KEY = "study-planner-tasks";
let tasks = load();
let filter = "semua";

const $ = (id) => document.getElementById(id);
const list = $("list");
const form = $("form");
const segsContainer = $("segs");

const COLOR = {
  Tinggi: "var(--red)",
  Sedang: "var(--amber)",
  Rendah: "var(--green)",
};
const SEGS = 20;

// Inisialisasi segmen indikator progress di header
const segFragment = document.createDocumentFragment();
for (let i = 0; i < SEGS; i++) {
  segFragment.appendChild(document.createElement("i"));
}
segsContainer.appendChild(segFragment);

// Tampilkan tanggal hari ini
$("today").textContent =
  "// " +
  new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

/* ==========================================================================
   2. HELPER & MANAJEMEN DATA (LOCALSTORAGE & TANGGAL)
   - Tempat mengecek bug penyimpanan, kalkulasi tanggal, atau format penulisan.
   ========================================================================== */
function load() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error("Gagal memuat data dari localStorage:", e);
    return [];
  }
}

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(tasks));
  } catch (e) {
    console.error("Gagal menyimpan data ke localStorage:", e);
  }
}

// Helper parsing tanggal lokal tanpa terpengaruh offset UTC
function parseLocalDate(s) {
  if (!s) return new Date();
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function daysLeft(s) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = parseLocalDate(s);
  return Math.round((target - today) / 86400000);
}

function dueText(t) {
  const n = daysLeft(t.deadline);
  if (n < 0) return `Terlambat ${-n} hari`;
  if (n === 0) return "Hari ini";
  if (n === 1) return "Besok";
  return `${n} hari lagi`;
}

function formatDate(s) {
  return parseLocalDate(s).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/* ==========================================================================
   3. LOGIKA RENDER TAMPILAN (DOM MANIPULATION)
   - Tempat mengecek masalah pembuatan elemen HTML, update progress, atau penataan list.
   ========================================================================== */
function render() {
  const total = tasks.length;
  const done = tasks.filter((t) => t.done).length;
  const pct = total ? Math.round((done / total) * 100) : 0;
  const activeSegs = Math.round((pct / 100) * SEGS);

  // Update indikator progress bar
  const segNodes = segsContainer.children;
  for (let i = 0; i < SEGS; i++) {
    segNodes[i].classList.toggle("on", i < activeSegs);
  }
  $("pct").textContent = `${pct}%`;
  $("bar").setAttribute("aria-valuenow", pct);

  // Update teks ringkasan & angka tab
  $("count").textContent =
    `${done} dari ${total} tugas selesai` +
    (total && done === total ? ". Semua beres." : "");
  $("n-semua").textContent = total;
  $("n-belum").textContent = total - done;
  $("n-selesai").textContent = done;

  // Filter & sortir tugas berdasarkan deadline terdekat
  const shown = tasks
    .filter(
      (t) => filter === "semua" || (filter === "selesai" ? t.done : !t.done),
    )
    .sort((a, b) => a.deadline.localeCompare(b.deadline));

  list.innerHTML = "";

  if (!shown.length) {
    const e = document.createElement("li");
    e.className = "empty";
    e.textContent = total
      ? "Tidak ada tugas di filter ini."
      : "Belum ada tugas. Isi form di atas untuk menambahkan.";
    list.appendChild(e);
    return;
  }

  const fragment = document.createDocumentFragment();

  shown.forEach((t) => {
    const li = document.createElement("li");
    li.style.setProperty("--pc", COLOR[t.priority] || COLOR.Sedang);
    if (t.done) li.className = "done";

    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.className = "cb";
    cb.checked = t.done;
    cb.dataset.id = t.id;
    cb.setAttribute("aria-label", `Tandai selesai: ${t.title}`);

    const title = document.createElement("div");
    title.className = "title";
    title.textContent = t.title;

    const meta = document.createElement("div");
    meta.className = "meta";
    const pb = document.createElement("b");
    pb.textContent = `Prioritas ${t.priority.toLowerCase()}`;
    meta.appendChild(pb);

    const n = daysLeft(t.deadline);
    const due = document.createElement("div");
    due.className =
      "due" + (!t.done && n < 0 ? " late" : !t.done && n <= 1 ? " soon" : "");
    const b = document.createElement("b");
    b.textContent = t.done ? "Selesai" : dueText(t);
    const d = document.createElement("span");
    d.className = "mono";
    d.textContent = formatDate(t.deadline);
    due.append(b, d);

    const del = document.createElement("button");
    del.className = "del";
    del.textContent = "Hapus";
    del.dataset.id = t.id;
    del.setAttribute("aria-label", `Hapus tugas: ${t.title}`);

    li.append(cb, title, meta, due, del);
    fragment.appendChild(li);
  });

  list.appendChild(fragment);
}

/* ==========================================================================
   4. EVENT LISTENERS & INTERAKSI PENGGUNA
   - Tempat mengecek masalah saat klik checklist, hapus tugas, submit form, atau ganti tab.
   ========================================================================== */

// Checkbox & Hapus via Event Delegation pada list
list.addEventListener("change", (e) => {
  if (e.target.classList.contains("cb")) {
    const id = e.target.dataset.id;
    const task = tasks.find((t) => String(t.id) === id);
    if (task) {
      task.done = e.target.checked;
      save();
      render();
    }
  }
});

list.addEventListener("click", (e) => {
  if (e.target.classList.contains("del")) {
    const id = e.target.dataset.id;
    tasks = tasks.filter((t) => String(t.id) !== id);
    save();
    render();
  }
});

// Form Submit
form.addEventListener("submit", (e) => {
  e.preventDefault();
  const titleInput = $("title");
  const deadlineInput = $("deadline");
  const priorityInput = $("priority");

  const title = titleInput.value.trim();
  const deadline = deadlineInput.value;
  const priority = priorityInput.value;

  if (!title || !deadline) return;

  tasks.push({
    id: Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
    title,
    deadline,
    priority,
    done: false,
  });

  save();
  form.reset();
  priorityInput.value = "Sedang";
  render();
});

// Tab Filter
document.querySelectorAll(".tabs button").forEach((btn) => {
  btn.addEventListener("click", () => {
    filter = btn.dataset.filter;
    document.querySelectorAll(".tabs button").forEach((x) => {
      x.setAttribute("aria-pressed", String(x === btn));
    });
    render();
  });
});

/* ==========================================================================
   5. INISIALISASI APLIKASI
   ========================================================================== */
render();
