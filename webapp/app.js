const SUPABASE_URL = "https://mpqevzrtpyolfcjknccy.supabase.co/functions/v1";
const SUPABASE_KEY = "sb_publishable_MpY8Hk7x3xiXlVbdXni93A_PWZjydfC"; // publishable key, safe client-side
const MAX_IMAGES = 12;

const STYLES = [
  {
    id: "bold-industrial",
    name: "Bold Industrial",
    swatch: "linear-gradient(135deg,#161616,#F4C430)",
    desc: "Dark background, hazard-stripe accents, heavy uppercase type.",
    guide: "Near-black background (#161616), amber accent (#F4C430), heavy uppercase display headlines, diagonal hazard-stripe borders, rugged utility tone.",
  },
  {
    id: "clean-confidence",
    name: "Clean Confidence",
    swatch: "linear-gradient(135deg,#1E6FE0,#66A6FF)",
    desc: "Saturated color block, rounded friendly type, soft accents.",
    guide: "Saturated brand-color block background, white pill badges, bold rounded display type, scattered star/dot decorations, product floating with soft shadow.",
  },
  {
    id: "hand-drawn-utility",
    name: "Hand-Drawn Utility",
    swatch: "linear-gradient(135deg,#FBF3E4,#C97B3D)",
    desc: "Warm paper background, hand-drawn doodle accents, script line.",
    guide: "Warm cream/paper background, hand-drawn doodle arrows and icons, script accent line paired with clean sans body, product tilted with soft shadow.",
  },
];

const state = { features: [], images: [], style: STYLES[0].id };

const $ = (id) => document.getElementById(id);

function setStatus(msg, isError) {
  const el = $("status");
  el.textContent = msg;
  el.className = "status" + (isError ? " error" : "");
}

function renderFeatureList() {
  const ul = $("featureList");
  ul.innerHTML = "";
  state.features.forEach((f, i) => {
    const li = document.createElement("li");
    li.innerHTML = `<input type="checkbox" ${f.approved ? "checked" : ""} data-i="${i}" class="feature-approve">
      <span>${f.text}</span>
      <button class="rm" data-i="${i}">&times;</button>`;
    ul.appendChild(li);
  });
  ul.querySelectorAll(".feature-approve").forEach((cb) =>
    cb.addEventListener("change", (e) => { state.features[+e.target.dataset.i].approved = e.target.checked; })
  );
  ul.querySelectorAll(".rm").forEach((btn) =>
    btn.addEventListener("click", (e) => { state.features.splice(+e.target.dataset.i, 1); renderFeatureList(); })
  );
}

function renderStyleGrid() {
  const grid = $("styleGrid");
  grid.innerHTML = "";
  STYLES.forEach((s) => {
    const card = document.createElement("div");
    card.className = "style-card" + (state.style === s.id ? " selected" : "");
    card.innerHTML = `<div class="swatch" style="background:${s.swatch}"></div>
      <div><div class="name">${s.name}</div><div class="desc">${s.desc}</div></div>`;
    card.addEventListener("click", () => { state.style = s.id; renderStyleGrid(); });
    grid.appendChild(card);
  });
}

function renderImageGrid() {
  const grid = $("imageGrid");
  grid.innerHTML = "";
  state.images.forEach((img, i) => {
    const div = document.createElement("div");
    div.className = "thumb";
    div.innerHTML = `<img src="${img.dataUrl}"><button class="rm" data-i="${i}">&times;</button>`;
    div.querySelector(".rm").addEventListener("click", () => { state.images.splice(i, 1); renderImageGrid(); });
    grid.appendChild(div);
  });
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

$("addFeaturesBtn").addEventListener("click", () => {
  const lines = $("featureInput").value.split("\n").map((l) => l.trim()).filter(Boolean);
  lines.forEach((text) => state.features.push({ text, approved: true }));
  $("featureInput").value = "";
  renderFeatureList();
});

$("suggestFeaturesBtn").addEventListener("click", async () => {
  setStatus("Asking AI to suggest features...");
  try {
    const res = await fetch(`${SUPABASE_URL}/generate-content`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${SUPABASE_KEY}`, "apikey": SUPABASE_KEY },
      body: JSON.stringify({
        mode: "features",
        productName: $("productName").value,
        brand: $("brand").value,
        description: $("description").value,
      }),
    });
    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.detail || data.error || "request failed");
    (data.features || []).forEach((text) => state.features.push({ text, approved: true }));
    renderFeatureList();
    setStatus("Features suggested — review and uncheck any you don't want.");
  } catch (e) {
    setStatus("Couldn't suggest features: " + e.message, true);
  }
});

$("imageInput").addEventListener("change", async (e) => {
  const files = Array.from(e.target.files).slice(0, MAX_IMAGES - state.images.length);
  for (const file of files) {
    const dataUrl = await fileToDataUrl(file);
    state.images.push({ dataUrl, name: file.name });
  }
  renderImageGrid();
  e.target.value = "";
});

function moduleFrameHtml(mod, styleId) {
  const style = STYLES.find((s) => s.id === styleId);
  return `
    <div class="module-card">
      <div class="frame" data-type="${mod.type}">
        <div class="spinner"></div>
      </div>
      <div class="meta">
        <div>
          <div class="title">${mod.title || mod.type}</div>
          <div class="type">${mod.type} &middot; ${style.name}</div>
        </div>
      </div>
      <div class="actions">
        <button class="btn-secondary reroll-btn">Reroll image</button>
        <button class="btn-secondary download-btn" disabled>Download</button>
      </div>
    </div>`;
}

async function generateModuleImage(mod, styleId) {
  const style = STYLES.find((s) => s.id === styleId);
  const refs = state.images.slice(0, 6).map((img) => img.dataUrl);
  const prompt = [
    `Amazon A+ Content module image, 1464x600 px, landscape.`,
    `Module type: ${mod.type}. Title: "${mod.title}".`,
    mod.bullets && mod.bullets.length ? `Key points to convey visually: ${mod.bullets.join("; ")}.` : "",
    `Visual direction: ${style.guide}`,
    mod.imagePrompt || "",
    `Ground the composition in the real product photo(s) provided — do not invent a different product.`,
  ].filter(Boolean).join(" ");

  const res = await fetch(`${SUPABASE_URL}/generate-graphic`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${SUPABASE_KEY}`, "apikey": SUPABASE_KEY },
    body: JSON.stringify({ provider: "gemini", prompt, referenceImages: refs, width: 1464, height: 600 }),
  });
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.detail || data.error || "image generation failed");
  return data.image;
}

async function fillModuleCard(card, mod, styleId) {
  const frame = card.querySelector(".frame");
  const downloadBtn = card.querySelector(".download-btn");
  const rerollBtn = card.querySelector(".reroll-btn");
  frame.innerHTML = `<div class="spinner"></div>`;
  try {
    const image = await generateModuleImage(mod, styleId);
    frame.innerHTML = `<img src="${image}">`;
    downloadBtn.disabled = false;
    downloadBtn.onclick = () => {
      const a = document.createElement("a");
      a.href = image;
      a.download = `${(mod.type || "module")}.png`;
      a.click();
    };
  } catch (e) {
    frame.innerHTML = `<div class="placeholder">Image generation failed: ${e.message}</div>`;
  }
  rerollBtn.onclick = () => fillModuleCard(card, mod, styleId);
}

$("createBtn").addEventListener("click", async () => {
  const productName = $("productName").value.trim();
  const description = $("description").value.trim();
  if (!productName && !description) {
    setStatus("Enter at least a product name or description.", true);
    return;
  }
  $("createBtn").disabled = true;
  setStatus("Drafting module spec with AI...");
  const results = $("results");
  results.innerHTML = "";

  try {
    const styleObj = STYLES.find((s) => s.id === state.style);
    const specRes = await fetch(`${SUPABASE_URL}/generate-content`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${SUPABASE_KEY}`, "apikey": SUPABASE_KEY },
      body: JSON.stringify({
        productName,
        brand: $("brand").value.trim(),
        description,
        features: state.features,
        moduleCount: Number($("moduleCount").value),
        style: styleObj.guide,
        imageCount: state.images.length,
      }),
    });
    const spec = await specRes.json();
    if (!specRes.ok || spec.error) throw new Error(spec.detail || spec.error || "content generation failed");

    setStatus(`Generating ${spec.modules.length} module images...`);
    const cards = spec.modules.map((mod) => {
      const wrap = document.createElement("div");
      wrap.innerHTML = moduleFrameHtml(mod, state.style);
      const card = wrap.firstElementChild;
      results.appendChild(card);
      return { card, mod };
    });

    await Promise.all(cards.map(({ card, mod }) => fillModuleCard(card, mod, state.style)));
    setStatus(`Done — ${spec.modules.length} modules generated.`);
  } catch (e) {
    setStatus("Failed: " + e.message, true);
  } finally {
    $("createBtn").disabled = false;
  }
});

renderFeatureList();
renderStyleGrid();
renderImageGrid();
