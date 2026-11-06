const STORAGE_KEY = "ritmo-study-planner-v1";
const PROFILE_STORAGE_KEY = "ritmo-study-profile-v1";
const defaultProfile = { name: "Marina Alves", email: "", course: "Estudante" };
const subjectColors = ["#8978ed", "#65b99a", "#ec9a78", "#6ea5d9", "#d399c5", "#e0b45e"];
const weekdayNames = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];
const shortWeekdays = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];
const monthNames = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const monthLong = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const $ = (selector) => document.querySelector(selector);
const localDate = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const parseDate = (value) => {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day, 12);
};
const dayStart = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12);
const addDays = (date, amount) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + amount, 12);
const dayDiff = (date, today = dayStart(new Date())) => Math.round((dayStart(date) - today) / 86400000);
const formatDate = (date, options = { day: "numeric", month: "long" }) => new Intl.DateTimeFormat("pt-BR", options).format(date);
const escapeHTML = (value) => String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);

function createDemoEvents() {
  const today = dayStart(new Date());
  return [
    { id: crypto.randomUUID(), title: "Prova de funções", subject: "Matemática", type: "prova", date: localDate(addDays(today, 3)), hours: 5, notes: "Função afim e quadrática", completedSessions: [] },
    { id: crypto.randomUUID(), title: "Entrega do trabalho", subject: "História", type: "trabalho", date: localDate(addDays(today, 6)), hours: 3, notes: "Era Vargas", completedSessions: [] },
    { id: crypto.randomUUID(), title: "Prova de biologia", subject: "Biologia", type: "prova", date: localDate(addDays(today, 9)), hours: 6, notes: "Genética e evolução", completedSessions: [] }
  ];
}

function loadEvents() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === null) {
      const demo = createDemoEvents();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(demo));
      return demo;
    }
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) throw new Error("Os dados salvos não estão no formato esperado.");
    return parsed;
  } catch (error) {
    console.error("Não foi possível carregar sua agenda:", error);
    showToast("Não foi possível carregar os dados salvos.");
    return [];
  }
}

let events = loadEvents();
let profile = loadProfile();
let toastTimeout;

function loadProfile() {
  try {
    const stored = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (stored === null) return { ...defaultProfile };
    const parsed = JSON.parse(stored);
    if (!parsed || typeof parsed !== "object" || typeof parsed.name !== "string") {
      throw new Error("Os dados do perfil não estão no formato esperado.");
    }
    return {
      name: parsed.name.trim() || defaultProfile.name,
      email: typeof parsed.email === "string" ? parsed.email : "",
      course: typeof parsed.course === "string" ? parsed.course : ""
    };
  } catch (error) {
    console.error("Não foi possível carregar seu perfil:", error);
    showToast("Não foi possível carregar o perfil salvo.");
    return { ...defaultProfile };
  }
}

function saveProfile() {
  try {
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
  } catch (error) {
    console.error("Não foi possível salvar seu perfil:", error);
    showToast("Não foi possível salvar o perfil. Verifique o espaço do navegador.");
    return false;
  }
  return true;
}

function saveEvents() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  } catch (error) {
    console.error("Não foi possível salvar sua agenda:", error);
    showToast("Não foi possível salvar. Verifique o espaço do navegador.");
    return false;
  }
  return true;
}

function showToast(message) {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.remove("show"), 2800);
}

function sortedEvents() {
  return [...events].sort((a, b) => a.date.localeCompare(b.date));
}

function daysUntilLabel(days) {
  if (days < 0) return "Atrasado";
  if (days === 0) return "É hoje!";
  if (days === 1) return "Falta 1 dia";
  return `Faltam ${days} dias`;
}

function dateTile(date) {
  return `<span class="date-tile"><strong>${date.getDate()}</strong><small>${monthNames[date.getMonth()]}</small></span>`;
}

function buildPlan() {
  const today = dayStart(new Date());
  return sortedEvents().filter((event) => dayDiff(parseDate(event.date), today) >= 0).flatMap((event) => {
    const daysLeft = dayDiff(parseDate(event.date), today);
    if (daysLeft === 0) {
      return [{ event, date: parseDate(event.date), hours: Math.max(1, Math.min(2, Number(event.hours) || 1)), final: true, sessionKey: `${event.id}-${event.date}` }];
    }
    const totalHours = Math.max(1, Number(event.hours) || 1);
    const sessions = Math.min(daysLeft, totalHours);
    const baseHours = Math.floor(totalHours / sessions);
    const extraHours = totalHours % sessions;
    return Array.from({ length: sessions }, (_, index) => {
      const date = addDays(today, index + 1);
      return {
        event,
        date,
        hours: baseHours + (index < extraHours ? 1 : 0),
        final: index === sessions - 1,
        sessionKey: `${event.id}-${localDate(date)}`
      };
    });
  }).sort((a, b) => a.date - b.date);
}

function renderHeader() {
  const now = new Date();
  $("#today-label").textContent = `${weekdayNames[now.getDay()].replace("-feira", "")}, ${formatDate(now)}`;
  const hour = now.getHours();
  const firstName = profile.name.trim().split(/\s+/)[0] || defaultProfile.name.split(" ")[0];
  $("#greeting").textContent = `${hour < 12 ? "BOM DIA" : hour < 18 ? "BOA TARDE" : "BOA NOITE"}, ${firstName.toLocaleUpperCase("pt-BR")} 👋`;
  $("#plan-date").textContent = `Atualizado hoje, ${formatDate(now)}`;
  const initials = profile.name.trim().split(/\s+/).slice(0, 2).map((part) => Array.from(part)[0] || "").join("").toLocaleUpperCase("pt-BR");
  $("#profile-name").textContent = profile.name;
  $("#profile-course").textContent = profile.course || "Estudante";
  $("#profile-initials").textContent = initials;
  $("#top-avatar").textContent = initials;
  $("#top-avatar").setAttribute("aria-label", `Perfil de ${profile.name}`);
}

function renderEvents() {
  const today = dayStart(new Date());
  const upcoming = sortedEvents().filter((event) => dayDiff(parseDate(event.date), today) >= 0);
  $("#agenda-count").textContent = upcoming.length;
  $("#stat-events").textContent = upcoming.length;
  $("#stat-events-foot").textContent = upcoming.length ? `${upcoming.length} compromisso${upcoming.length === 1 ? "" : "s"} no seu radar` : "Tudo sob controle";
  $("#upcoming-list").innerHTML = upcoming.slice(0, 3).map((event) => {
    const date = parseDate(event.date);
    const days = dayDiff(date, today);
    return `<article class="event-row">
      ${dateTile(date)}
      <div class="event-copy"><strong>${escapeHTML(event.title)}</strong><small>${escapeHTML(event.subject)} · ${formatDate(date, { weekday: "long" })}</small></div>
      <div class="event-right"><span class="countdown">${daysUntilLabel(days)}</span><span class="type-tag ${event.type === "trabalho" ? "trabalho" : ""}">${event.type === "trabalho" ? "Trabalho" : "Prova"}</span></div>
    </article>`;
  }).join("");
  $("#events-empty").classList.toggle("hidden", upcoming.length > 0);
  $("#upcoming-list").classList.toggle("hidden", upcoming.length === 0);

  const subjects = [...new Set(events.map((event) => event.subject.trim()).filter(Boolean))];
  $("#subject-list").innerHTML = subjects.length
    ? subjects.map((subject, index) => `<div class="subject-item"><span class="subject-color" style="background:${subjectColors[index % subjectColors.length]}"></span>${escapeHTML(subject)}</div>`).join("")
    : '<div class="subject-empty">Suas matérias aparecem aqui</div>';
}

function renderPlan() {
  const plan = buildPlan();
  const rows = plan.slice(0, 7);
  const hoursThisWeek = plan.filter((item) => dayDiff(item.date) <= 7).reduce((sum, item) => sum + item.hours, 0);
  const completed = plan.filter((item) => item.event.completedSessions?.includes(item.sessionKey)).length;
  $("#stat-hours").textContent = hoursThisWeek;
  $("#stat-completed").textContent = completed;
  $("#stat-total").textContent = plan.length;
  $("#stat-completion-foot").textContent = plan.length ? (completed ? `${Math.round(completed / plan.length * 100)}% do plano concluído` : "Cada sessão conta") : "Seu ritmo está começando";
  $(".focus-progress span").style.width = `${plan.length ? Math.max(8, Math.round(completed / plan.length * 100)) : 8}%`;
  $("#focus-caption").textContent = plan.length ? `${completed} de ${plan.length} sessões concluídas` : "Vamos começar?";
  $("#week-summary-text").textContent = plan.length ? `${hoursThisWeek} horas de estudo planejadas` : "Seu plano de estudo aparece aqui";
  $("#week-total").textContent = `${hoursThisWeek}h no total`;

  const today = dayStart(new Date());
  const mondayOffset = (today.getDay() + 6) % 7;
  const monday = addDays(today, -mondayOffset);
  const weekHours = Array(7).fill(0);
  plan.forEach((item) => {
    const offset = dayDiff(item.date, monday);
    if (offset >= 0 && offset < 7) weekHours[offset] += item.hours;
  });
  const maxHours = Math.max(...weekHours, 1);
  $("#week-chart").innerHTML = weekHours.map((hours, index) => {
    const chartDate = addDays(monday, index);
    const todayClass = localDate(chartDate) === localDate(today) ? "today" : "";
    const height = hours ? Math.max(8, (hours / maxHours) * 70) : 3;
    return `<div class="chart-column ${todayClass}"><span class="chart-hours">${hours || ""}</span><span class="chart-bar" style="height:${height}px"></span></div>`;
  }).join("");

  $("#plan-list").innerHTML = rows.map((item) => {
    const done = item.event.completedSessions?.includes(item.sessionKey);
    const days = dayDiff(item.date);
    const label = days === 0 ? "Hoje" : days === 1 ? "Amanhã" : `${weekdayNames[item.date.getDay()]}, ${formatDate(item.date, { day: "numeric", month: "short" })}`;
    const description = item.final ? `Revisar ${escapeHTML(item.event.subject)} antes da ${item.event.type === "trabalho" ? "entrega" : "prova"}` : `${item.event.notes ? `Estudar: ${escapeHTML(item.event.notes)}` : `Estudar ${escapeHTML(item.event.subject)}`}`;
    return `<div class="plan-row ${done ? "completed" : ""}">
      <button class="plan-check ${done ? "done" : ""}" data-session="${escapeHTML(item.sessionKey)}" aria-label="${done ? "Marcar como não concluída" : "Marcar como concluída"}">${done ? "✓" : ""}</button>
      <span class="plan-day">${label}</span>
      <span class="plan-description"><strong>${description}</strong><small>${escapeHTML(item.event.subject)}${item.final ? " · revisão final" : ""}</small></span>
      <span class="plan-duration">${item.hours}h de estudo</span>
    </div>`;
  }).join("");
  $("#plan-list").classList.toggle("hidden", rows.length === 0);
  $("#plan-empty").classList.toggle("hidden", rows.length > 0);
}

function render() {
  renderHeader();
  renderEvents();
  renderPlan();
}

function openModal() {
  const form = $("#event-form");
  form.reset();
  form.elements.date.min = localDate(new Date());
  form.elements.date.value = localDate(addDays(new Date(), 7));
  $("#form-error").classList.add("hidden");
  $("#event-modal").classList.remove("hidden");
  form.elements.title.focus();
}

function closeModal() {
  $("#event-modal").classList.add("hidden");
}

function openProfileModal() {
  const form = $("#profile-form");
  form.elements.name.value = profile.name;
  form.elements.email.value = profile.email;
  form.elements.course.value = profile.course === defaultProfile.course ? "" : profile.course;
  $("#profile-error").classList.add("hidden");
  $("#profile-modal").classList.remove("hidden");
  form.elements.name.focus();
}

function closeProfileModal() {
  $("#profile-modal").classList.add("hidden");
}

function updateProfile(formData) {
  const name = String(formData.get("name") || "").trim();
  const email = String(formData.get("email") || "").trim();
  const course = String(formData.get("course") || "").trim();
  const error = $("#profile-error");
  if (!name) {
    error.textContent = "Informe seu nome para salvar o perfil.";
    error.classList.remove("hidden");
    return;
  }
  profile = { name, email, course: course || defaultProfile.course };
  if (!saveProfile()) return;
  closeProfileModal();
  renderHeader();
  showToast("Perfil atualizado com sucesso!");
}

function addEvent(formData) {
  const title = String(formData.get("title") || "").trim();
  const subject = String(formData.get("subject") || "").trim();
  const date = String(formData.get("date") || "");
  const hours = Number(formData.get("hours"));
  const error = $("#form-error");
  if (!title || !subject || !date || !Number.isInteger(hours) || hours < 1 || hours > 40) {
    error.textContent = "Preencha os campos obrigatórios e escolha de 1 a 40 horas de estudo.";
    error.classList.remove("hidden");
    return;
  }
  if (dayDiff(parseDate(date)) < 0) {
    error.textContent = "A data precisa ser hoje ou uma data futura.";
    error.classList.remove("hidden");
    return;
  }
  events.push({
    id: crypto.randomUUID(),
    title,
    subject,
    type: String(formData.get("type")) === "trabalho" ? "trabalho" : "prova",
    date,
    hours,
    notes: String(formData.get("notes") || "").trim(),
    completedSessions: []
  });
  if (!saveEvents()) return;
  closeModal();
  render();
  showToast("Compromisso adicionado. Seu plano foi atualizado!");
}

function toggleSession(sessionKey) {
  const event = events.find((item) => sessionKey.startsWith(`${item.id}-`));
  if (!event) return;
  if (!Array.isArray(event.completedSessions)) event.completedSessions = [];
  event.completedSessions = event.completedSessions.includes(sessionKey)
    ? event.completedSessions.filter((key) => key !== sessionKey)
    : [...event.completedSessions, sessionKey];
  if (saveEvents()) render();
}

$("#add-event-top").addEventListener("click", openModal);
$("#add-event-empty").addEventListener("click", openModal);
$("#add-event-plan").addEventListener("click", openModal);
$("#modal-close").addEventListener("click", closeModal);
$("#cancel-modal").addEventListener("click", closeModal);
$("#event-modal").addEventListener("click", (event) => {
  if (event.target === $("#event-modal")) closeModal();
});
$("#event-form").addEventListener("submit", (event) => {
  event.preventDefault();
  addEvent(new FormData(event.currentTarget));
});
$("#plan-list").addEventListener("click", (event) => {
  const button = event.target.closest("[data-session]");
  if (button) toggleSession(button.dataset.session);
});
$("#refresh-plan").addEventListener("click", () => {
  render();
  showToast("Plano atualizado com seus próximos compromissos.");
});
$("#mobile-menu").addEventListener("click", () => $("#sidebar").classList.toggle("open"));
document.querySelectorAll(".nav-link[href^='#']").forEach((link) => {
  link.addEventListener("click", () => {
    document.querySelectorAll(".nav-link").forEach((item) => item.classList.remove("active"));
    link.classList.add("active");
    $("#sidebar").classList.remove("open");
  });
});
$("#subjects-filter").addEventListener("click", () => showToast("Suas matérias são organizadas automaticamente pelos compromissos."));
$("#profile-button").addEventListener("click", openProfileModal);
$("#profile-modal-close").addEventListener("click", closeProfileModal);
$("#profile-cancel").addEventListener("click", closeProfileModal);
$("#profile-modal").addEventListener("click", (event) => {
  if (event.target === $("#profile-modal")) closeProfileModal();
});
$("#profile-form").addEventListener("submit", (event) => {
  event.preventDefault();
  updateProfile(new FormData(event.currentTarget));
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeModal();
    closeProfileModal();
  }
});

render();
