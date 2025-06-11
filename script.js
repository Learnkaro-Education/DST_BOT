document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("admin-form");
  const spinner = document.getElementById("spinner");
  const rowsContainer = document.getElementById("rowsContainer");
  const addRowBtn = document.getElementById("addRowBtn");
  const presetButtonsContainer = document.createElement("div");
  const basedURL = "http://localhost:3000";
  const scheduleControls = document.getElementById("scheduleControls") || { style: { display: 'none' } };
  const quill = new Quill("#quill-editor", { theme: "snow" });

  const presets = [
    { text: "Permium Group 🔥 ", url: "https://dilsetrader.com/g/harFPFoJHN?code=SPECIAL" },
    { text: "Stock Option Group 🔥", url: "https://dilsetrader.com/g/0b1iT9tDej?code=VIP50" },
    { text: "Join Permium Group 🔥", url: "https://dilsetrader.com/g/harFPFoJHN?code=SPECIAL" },
    { text: "JOin MCX Group 🔥", url: "https://dilsetrader.com/g/AKEmBPbvzS?code=GOLD50" },
    { text: "Algo VIP+", url: "https://com.rpy.club/pdp/algovip7?code=ALGO50" },
    { text: "Join BTST Group 🔥", url: "https://dilsetrader.com/g/1QBoZY9Tmf?code=BTST" },
    { text: "Know more  🔥", url: "https://www.dilsetrader.in/services/premium-telegram-channel" },
    { text: "Join Crypto VIP 🔥 ", url: "https://t.me/dilsecrypto7" }
  ];

  presetButtonsContainer.className = "mb-3 d-flex flex-wrap gap-2";
  presets.forEach(preset => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn btn-outline-secondary btn-sm";
    btn.textContent = preset.text;
    btn.onclick = () => addPresetButton(preset.text, preset.url);
    presetButtonsContainer.appendChild(btn);
  });
  rowsContainer.parentElement.insertBefore(presetButtonsContainer, rowsContainer);

  const addPresetButton = (text, url) => {
    const row = document.createElement("div");
    row.className = "input-row mb-3";
    row.innerHTML = `
      <div class="row g-3 align-items-center">
        <div class="col-auto">
          <input type="text" class="form-control" placeholder="Button Text" value="${text || ''}" />
        </div>
        <div class="col-auto">
          <input type="url" class="form-control" placeholder="Button URL" value="${url || ''}" />
        </div>
        <div class="col-auto">
          <button type="button" class="btn btn-danger remove-row">Remove</button>
        </div>
      </div>`;
    rowsContainer.appendChild(row);
    row.querySelector(".remove-row").addEventListener("click", () => row.remove());
  };

  addRowBtn.addEventListener("click", () => addPresetButton("", ""));

  let formAction = null;

  document.getElementById("sendBtn").addEventListener("click", (e) => {
    formAction = "send";
    scheduleControls.style.display = "none";
    e.preventDefault();
    form.requestSubmit();
  });

  document.getElementById("scheduleBtn").addEventListener("click", (e) => {
    formAction = "schedule";
    scheduleControls.style.display = "block";
    e.preventDefault();
    form.requestSubmit();
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!formAction) return;

    spinner.style.display = "flex";

    try {
      const caption = quill.root.innerHTML.trim();
      const image = document.getElementById("imageInput").files[0];
      const password = document.getElementById("passwordInput").value.trim();

      if (caption === "<p><br></p>" && !image) throw new Error("Please provide a caption or image.");
      if (!password) throw new Error("Password is required.");

      const buttons = Array.from(rowsContainer.querySelectorAll(".input-row")).map(row => {
        return {
          text: row.querySelector("input[type='text']").value.trim(),
          url: row.querySelector("input[type='url']").value.trim(),
        };
      }).filter(btn => btn.text && btn.url);

      const formData = new FormData();
      formData.append("caption", caption);
      if (image) formData.append("image", image);
      formData.append("password", password);
      formData.append("buttons", JSON.stringify(buttons));

      if (formAction === "schedule") {
        const dateTimeInput = document.getElementById("scheduleDateTime");
        const dateTime = dateTimeInput && dateTimeInput.value ? dateTimeInput.value : null;

        if (!dateTime) throw new Error("Please select date and time.");

        const scheduleISO = new Date(dateTime).toISOString();
        formData.append("scheduleTime", scheduleISO);
      }

      const response = await fetch(`${basedURL}/send-message`, { method: "POST", body: formData });
      const data = await response.json();

      if (!response.ok) throw new Error(data.message || "Unknown error");
      alert(data.message);
      form.reset();
      quill.root.innerHTML = "";
      rowsContainer.innerHTML = "";
      scheduleControls.style.display = "none";
    } catch (error) {
      alert(error.message);
    } finally {
      spinner.style.display = "none";
      formAction = null;
    }
  });
});
