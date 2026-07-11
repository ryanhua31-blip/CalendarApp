const calendarGrid = document.getElementById("calendarGrid");
const monthLabel = document.getElementById("monthLabel");
const selectedDateLabel = document.getElementById("selectedDateLabel");
const eventDateInput = document.getElementById("eventDate");
const eventNameInput = document.getElementById("eventName");
const eventInfoInput = document.getElementById("eventInfo");
const eventForm = document.getElementById("eventForm");
const eventList = document.getElementById("eventList");
const eventCount = document.getElementById("eventCount");
const prevMonthButton = document.getElementById("prevMonth");
const nextMonthButton = document.getElementById("nextMonth");
const todayButton = document.getElementById("todayButton");
const shareButton = document.getElementById("shareButton");
const shareDialog = document.getElementById("shareDialog");
const shareForm = document.getElementById("shareForm");
const closeShareButton = document.getElementById("closeShare");
const shareFromInput = document.getElementById("shareFrom");
const shareToInput = document.getElementById("shareTo");
const shareSearchInput = document.getElementById("shareSearch");
const shareInfoInput = document.getElementById("shareInfo");
const copyShareLinkButton = document.getElementById("copyShareLink");
const shareLinkInput = document.getElementById("shareLink");
const shareStatus = document.getElementById("shareStatus");
const sharedBanner = document.getElementById("sharedBanner");

const storageKey = "busyday-calendar-events";
const shareParamName = "plans";
const monthTransitionMs = 240;
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const today = new Date();
const sharedPlanData = readSharedPlanData();
const isSharedView = Boolean(sharedPlanData);
const firstVisibleDate = sharedPlanData?.events[0]?.date || toDateKey(today);
let visibleDate = new Date(fromDateKey(firstVisibleDate).getFullYear(), fromDateKey(firstVisibleDate).getMonth(), 1);
let selectedDate = firstVisibleDate;
let events = isSharedView ? sharedPlanData.events : loadEvents();
let isChangingMonth = false;

function loadEvents() {
  const savedEvents = localStorage.getItem(storageKey);
  if (!savedEvents) return [];

  try {
    return JSON.parse(savedEvents);
  } catch {
    return [];
  }
}

function saveEvents() {
  localStorage.setItem(storageKey, JSON.stringify(events));
}

function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function fromDateKey(dateKey) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function isValidDateKey(dateKey) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) return false;
  return !Number.isNaN(fromDateKey(dateKey).getTime());
}

function formatLongDate(dateKey) {
  return fromDateKey(dateKey).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric"
  });
}

function getEventsForDate(dateKey) {
  return events
    .filter((event) => event.date === dateKey)
    .sort((a, b) => a.name.localeCompare(b.name));
}

function encodeShareData(data) {
  const json = JSON.stringify(data);
  const bytes = new TextEncoder().encode(json);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function decodeShareData(encodedData) {
  const base64 = encodedData.replace(/-/g, "+").replace(/_/g, "/");
  const paddedBase64 = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  const binary = atob(paddedBase64);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes));
}

function sanitizeSharedEvents(sharedEvents) {
  if (!Array.isArray(sharedEvents)) return [];

  return sharedEvents
    .map((event, index) => {
      const name = String(event.name || "").trim();
      const date = String(event.date || "");

      if (!name || !isValidDateKey(date)) return null;

      return {
        id: `shared-${index}-${date}`,
        name,
        date,
        info: String(event.info || "").trim()
      };
    })
    .filter(Boolean);
}

function readSharedPlanData() {
  const params = new URLSearchParams(window.location.search);
  const encodedPlans = params.get(shareParamName);

  if (!encodedPlans) return null;

  try {
    const payload = decodeShareData(encodedPlans);
    return {
      events: sanitizeSharedEvents(payload.events),
      filters: payload.filters || {}
    };
  } catch {
    return null;
  }
}

function renderCalendar() {
  calendarGrid.innerHTML = "";

  const year = visibleDate.getFullYear();
  const month = visibleDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const startOffset = firstDay.getDay();
  const gridStart = new Date(year, month, 1 - startOffset);

  monthLabel.textContent = visibleDate.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric"
  });

  for (let i = 0; i < 42; i += 1) {
    const cellDate = new Date(gridStart);
    cellDate.setDate(gridStart.getDate() + i);

    const dateKey = toDateKey(cellDate);
    const dayEvents = getEventsForDate(dateKey);
    const button = document.createElement("button");
    button.type = "button";
    button.className = "day-cell";
    button.setAttribute("aria-label", `${formatLongDate(dateKey)}, ${dayEvents.length} events`);

    if (cellDate.getMonth() !== month) button.classList.add("is-muted");
    if (dateKey === selectedDate) button.classList.add("is-selected");
    if (dateKey === toDateKey(today)) button.classList.add("is-today");

    const number = document.createElement("span");
    number.className = "day-number";
    number.textContent = cellDate.getDate();
    button.appendChild(number);

    if (dayEvents.length > 0) {
      const summary = document.createElement("div");
      summary.className = "day-summary";

      dayEvents.slice(0, 2).forEach((event) => {
        const pill = document.createElement("span");
        pill.className = "event-pill";
        pill.textContent = event.name;
        summary.appendChild(pill);
      });

      if (dayEvents.length > 2) {
        const morePill = document.createElement("span");
        morePill.className = "event-pill more-pill";
        morePill.textContent = `+${dayEvents.length - 2}`;
        summary.appendChild(morePill);
      }

      button.appendChild(summary);
    }

    button.addEventListener("click", () => {
      selectedDate = dateKey;
      eventDateInput.value = selectedDate;
      if (cellDate.getMonth() !== visibleDate.getMonth()) {
        visibleDate = new Date(cellDate.getFullYear(), cellDate.getMonth(), 1);
      }
      render();
      if (!isSharedView) eventNameInput.focus();
    });

    calendarGrid.appendChild(button);
  }
}

function renderEventList() {
  const selectedEvents = getEventsForDate(selectedDate);
  selectedDateLabel.textContent = formatLongDate(selectedDate);
  eventDateInput.value = selectedDate;
  eventCount.textContent = selectedEvents.length;
  eventList.innerHTML = "";

  if (selectedEvents.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = isSharedView
      ? "No shared plans are visible on this date."
      : "No plans here yet. Add one when something important lands on this date.";
    eventList.appendChild(empty);
    return;
  }

  selectedEvents.forEach((event) => {
    const card = document.createElement("article");
    card.className = "event-card";

    const header = document.createElement("div");
    header.className = "event-card-header";

    const title = document.createElement("p");
    title.className = "event-title";
    title.textContent = event.name;

    header.appendChild(title);
    if (!isSharedView) {
      const deleteButton = document.createElement("button");
      deleteButton.className = "delete-button";
      deleteButton.type = "button";
      deleteButton.textContent = "×";
      deleteButton.setAttribute("aria-label", `Delete ${event.name}`);
      deleteButton.addEventListener("click", () => {
        events = events.filter((item) => item.id !== event.id);
        saveEvents();
        render();
      });

      header.appendChild(deleteButton);
    }
    card.appendChild(header);

    if (event.info) {
      const notes = document.createElement("p");
      notes.className = "event-notes";
      notes.textContent = event.info;
      card.appendChild(notes);
    }

    eventList.appendChild(card);
  });
}

function render() {
  renderCalendar();
  renderEventList();
}

function changeMonth(offset) {
  if (isChangingMonth) return;

  const direction = offset > 0 ? "next" : "prev";
  const updateVisibleMonth = () => {
    visibleDate = new Date(visibleDate.getFullYear(), visibleDate.getMonth() + offset, 1);
    renderCalendar();
  };

  if (prefersReducedMotion) {
    updateVisibleMonth();
    return;
  }

  isChangingMonth = true;
  prevMonthButton.disabled = true;
  nextMonthButton.disabled = true;
  calendarGrid.classList.add(`is-exiting-${direction}`);

  window.setTimeout(() => {
    updateVisibleMonth();
    calendarGrid.classList.remove(`is-exiting-${direction}`);
    calendarGrid.classList.add(`is-entering-${direction}`);

    window.setTimeout(() => {
      calendarGrid.classList.remove(`is-entering-${direction}`);
      prevMonthButton.disabled = false;
      nextMonthButton.disabled = false;
      isChangingMonth = false;
    }, monthTransitionMs);
  }, monthTransitionMs - 70);
}

function setDefaultShareFilters() {
  const firstDay = new Date(visibleDate.getFullYear(), visibleDate.getMonth(), 1);
  const lastDay = new Date(visibleDate.getFullYear(), visibleDate.getMonth() + 1, 0);

  shareFromInput.value = toDateKey(firstDay);
  shareToInput.value = toDateKey(lastDay);
  shareSearchInput.value = "";
  shareInfoInput.checked = true;
  shareLinkInput.value = "";
  updateShareStatus();
}

function getShareFilters() {
  return {
    from: shareFromInput.value,
    to: shareToInput.value,
    search: shareSearchInput.value.trim(),
    includeInfo: shareInfoInput.checked
  };
}

function getFilteredEventsForShare(filters) {
  const searchTerm = filters.search.toLowerCase();

  return events
    .filter((event) => {
      if (filters.from && event.date < filters.from) return false;
      if (filters.to && event.date > filters.to) return false;
      if (!searchTerm) return true;

      return `${event.name} ${event.info}`.toLowerCase().includes(searchTerm);
    })
    .map((event) => ({
      name: event.name,
      date: event.date,
      info: filters.includeInfo ? event.info : ""
    }));
}

function buildShareUrl() {
  const filters = getShareFilters();
  const sharedEvents = getFilteredEventsForShare(filters);
  const payload = {
    version: 1,
    filters,
    events: sharedEvents
  };
  const url = new URL(window.location.href);

  url.search = "";
  url.hash = "";
  url.searchParams.set(shareParamName, encodeShareData(payload));
  if (filters.from) url.searchParams.set("from", filters.from);
  if (filters.to) url.searchParams.set("to", filters.to);
  if (filters.search) url.searchParams.set("q", filters.search);
  url.searchParams.set("notes", filters.includeInfo ? "yes" : "no");

  return {
    count: sharedEvents.length,
    url: url.toString()
  };
}

function updateShareStatus(count = null) {
  if (count === null) {
    const previewCount = getFilteredEventsForShare(getShareFilters()).length;
    shareStatus.textContent = `${previewCount} plan${previewCount === 1 ? "" : "s"} match the current filters.`;
    return;
  }

  shareStatus.textContent = `${count} plan${count === 1 ? "" : "s"} included in this share link.`;
}

function generateShareLink() {
  const shareDetails = buildShareUrl();
  shareLinkInput.value = shareDetails.url;
  updateShareStatus(shareDetails.count);
}

function openShareDialog() {
  setDefaultShareFilters();

  if (typeof shareDialog.showModal === "function") {
    shareDialog.showModal();
  } else {
    shareDialog.setAttribute("open", "");
  }
}

function closeShareDialog() {
  if (typeof shareDialog.close === "function") {
    shareDialog.close();
  } else {
    shareDialog.removeAttribute("open");
  }
}

async function copyShareLink() {
  if (!shareLinkInput.value) generateShareLink();

  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(shareLinkInput.value);
    } else {
      shareLinkInput.focus();
      shareLinkInput.select();
      document.execCommand("copy");
    }

    shareStatus.textContent = "Share link copied.";
  } catch {
    shareLinkInput.focus();
    shareLinkInput.select();
    shareStatus.textContent = "Copy did not work automatically. Select the URL and copy it manually.";
  }
}

function prepareSharedView() {
  if (!isSharedView) return;

  document.title = "Shared Plans - Focus Calendar";
  eventForm.hidden = true;
  shareButton.hidden = true;
  sharedBanner.hidden = false;
}

eventForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (isSharedView) return;

  const name = eventNameInput.value.trim();
  const date = eventDateInput.value;
  const info = eventInfoInput.value.trim();

  if (!name || !date) return;

  events.push({
    id: crypto.randomUUID(),
    name,
    date,
    info
  });

  selectedDate = date;
  visibleDate = new Date(fromDateKey(date).getFullYear(), fromDateKey(date).getMonth(), 1);
  saveEvents();
  eventForm.reset();
  eventDateInput.value = selectedDate;
  eventNameInput.focus();
  render();
});

eventDateInput.addEventListener("change", () => {
  if (!eventDateInput.value) return;
  selectedDate = eventDateInput.value;
  visibleDate = new Date(fromDateKey(selectedDate).getFullYear(), fromDateKey(selectedDate).getMonth(), 1);
  render();
});

prevMonthButton.addEventListener("click", () => {
  changeMonth(-1);
});

nextMonthButton.addEventListener("click", () => {
  changeMonth(1);
});

todayButton.addEventListener("click", () => {
  selectedDate = toDateKey(today);
  visibleDate = new Date(today.getFullYear(), today.getMonth(), 1);
  render();
});

shareButton.addEventListener("click", openShareDialog);
closeShareButton.addEventListener("click", closeShareDialog);
copyShareLinkButton.addEventListener("click", copyShareLink);

shareForm.addEventListener("submit", (event) => {
  event.preventDefault();
  generateShareLink();
});

[shareFromInput, shareToInput, shareSearchInput, shareInfoInput].forEach((input) => {
  input.addEventListener("input", () => {
    shareLinkInput.value = "";
    updateShareStatus();
  });
});

prepareSharedView();
render();
