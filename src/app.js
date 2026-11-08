const form = document.getElementById("ticket-form");
const ticketInput = document.getElementById("ticket-description");
const charCounter = document.getElementById("char-counter");
const submitBtn = document.getElementById("submit-btn");
const submitText = document.getElementById("submit-text");
const submitSpinner = document.getElementById("submit-spinner");
const clearBtn = document.getElementById("clear-btn");
const alertBanner = document.getElementById("alert-banner");
const alertText = document.getElementById("alert-text");

const emptyState = document.getElementById("empty-state");
const loadingSkeleton = document.getElementById("loading-skeleton");
const diagnosisContainer = document.getElementById("diagnosis-container");

const categoryBadge = document.getElementById("badge-category");
const priorityBadge = document.getElementById("badge-priority");
const escalationBanner = document.getElementById("escalation-banner");
const escalationText = document.getElementById("escalation-text");
const summaryText = document.getElementById("summary-text");
const causesList = document.getElementById("causes-list");
const stepsList = document.getElementById("steps-list");
const rawJsonDisplay = document.getElementById("raw-json-display");

function updateCharCounter() {
  const count = ticketInput.value.length;
  charCounter.textContent = `${count} characters`;
}

function showAlert(message, type = "danger") {
  alertText.textContent = message;
  alertBanner.className = `alert-banner active ${type === "danger" ? "alert-danger" : "alert-info"}`;
}

function hideAlert() {
  alertBanner.className = "alert-banner";
  alertText.textContent = "";
}

function setLoadingState(isLoading) {
  submitBtn.disabled = isLoading;
  ticketInput.disabled = isLoading;
  clearBtn.disabled = isLoading;

  if (isLoading) {
    submitSpinner.style.display = "inline-block";
    submitText.textContent = "Analyzing Ticket...";
    emptyState.style.display = "none";
    diagnosisContainer.classList.remove("active");
    loadingSkeleton.classList.add("active");
  } else {
    submitSpinner.style.display = "none";
    submitText.textContent = "Analyze Ticket";
    loadingSkeleton.classList.remove("active");
  }
}

function resetForm() {
  form.reset();
  updateCharCounter();
  hideAlert();
  emptyState.style.display = "flex";
  loadingSkeleton.classList.remove("active");
  diagnosisContainer.classList.remove("active");
  rawJsonDisplay.textContent = "";
  ticketInput.focus();
}

function populateSample(sampleKey) {
  if (SAMPLE_TICKETS[sampleKey]) {
    ticketInput.value = SAMPLE_TICKETS[sampleKey];
    updateCharCounter();
    hideAlert();
    ticketInput.focus();
  }
}

function renderDiagnosis(data) {
  emptyState.style.display = "none";
  loadingSkeleton.classList.remove("active");
  diagnosisContainer.classList.add("active");

  const cat = (data.category || "other").toLowerCase();
  categoryBadge.textContent = cat.replace("_", " ");
  categoryBadge.className = `badge badge-category badge-cat-${cat}`;

  const prio = (data.priority || "medium").toLowerCase();
  priorityBadge.textContent = `${prio} priority`;
  priorityBadge.className = `badge badge-priority-${prio}`;

  if (data.escalation_recommended) {
    escalationBanner.className = "escalation-banner escalated";
    escalationText.textContent = "Escalation to Tier-2 / Specialist Recommended";
  } else {
    escalationBanner.className = "escalation-banner standard";
    escalationText.textContent = "Can be resolved at Tier-1 / Standard Helpdesk";
  }

  summaryText.textContent = data.summary || "No summary provided.";

  causesList.replaceChildren();
  if (Array.isArray(data.possible_causes) && data.possible_causes.length > 0) {
    data.possible_causes.forEach((cause) => {
      const li = document.createElement("li");
      li.className = "cause-item";

      const bullet = document.createElement("span");
      bullet.className = "cause-bullet";
      bullet.textContent = "▲";

      const text = document.createElement("span");
      text.textContent = String(cause);

      li.appendChild(bullet);
      li.appendChild(text);
      causesList.appendChild(li);
    });
  } else {
    const li = document.createElement("li");
    li.className = "cause-item";
    li.textContent = "No specific root causes identified.";
    causesList.appendChild(li);
  }

  stepsList.replaceChildren();
  if (Array.isArray(data.troubleshooting_steps) && data.troubleshooting_steps.length > 0) {
    data.troubleshooting_steps.forEach((step, index) => {
      const li = document.createElement("li");
      li.className = "step-item";

      const num = document.createElement("span");
      num.className = "step-number";
      num.textContent = String(index + 1);

      const text = document.createElement("span");
      text.className = "step-text";
      text.textContent = String(step);

      li.appendChild(num);
      li.appendChild(text);
      stepsList.appendChild(li);
    });
  } else {
    const li = document.createElement("li");
    li.className = "step-item";
    li.textContent = "No actionable steps generated.";
    stepsList.appendChild(li);
  }

  rawJsonDisplay.textContent = JSON.stringify(data, null, 2);
}

async function analyzeTicket(description) {
  setLoadingState(true);
  hideAlert();

  try {
    const response = await fetch("/api/analyze", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ description })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `Server error (${response.status})`);
    }

    const diagnosis = await response.json();
    renderDiagnosis(diagnosis);
  } catch (err) {
    emptyState.style.display = "flex";
    diagnosisContainer.classList.remove("active");
    showAlert(
      err.message && !err.message.includes("Failed to fetch")
        ? `Analysis request failed: ${err.message}`
        : "Unable to connect to the analysis service. Please ensure the backend server is running and try again.",
      "danger"
    );
  } finally {
    setLoadingState(false);
  }
}

ticketInput.addEventListener("input", updateCharCounter);

form.addEventListener("submit", (e) => {
  e.preventDefault();

  const description = ticketInput.value.trim();

  if (!description) {
    showAlert("Please enter an IT problem description before submitting.");
    ticketInput.focus();
    return;
  }

  if (description.length < 10) {
    showAlert("Description is too short. Please provide at least 10 characters with specific details.");
    ticketInput.focus();
    return;
  }

  analyzeTicket(description);
});

clearBtn.addEventListener("click", resetForm);

document.querySelectorAll(".sample-chip").forEach((btn) => {
  btn.addEventListener("click", () => {
    const sampleType = btn.dataset.sample;
    populateSample(sampleType);
  });
});

updateCharCounter();
