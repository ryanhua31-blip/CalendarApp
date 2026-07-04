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

const storageKey = "busyday-calendar-events";
const monthTransitionMs = 240;
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const today = new Date();
let visibleDate = new Date(today.getFullYear(), today.getMonth(), 1);
let selectedDate = toDateKey(today);
let events = loadEvents();
let isChangingMonth = false;

function loadEvents() {
  const savedEvents = localStorage.getItem(storageKey);
  return savedEvents ? JSON.parse(savedEvents) : [];
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
      eventNameInput.focus();
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
    empty.textContent = "No plans here yet. Add one when something important lands on this date.";
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

    header.append(title, deleteButton);
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

eventForm.addEventListener("submit", (event) => {
  event.preventDefault();

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

render();
