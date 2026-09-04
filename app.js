const COURSE_KEY = "study_courses";
const ASSIGNMENT_KEY = "study_assignments";

let courses = readStorage(COURSE_KEY);
let assignments = readStorage(ASSIGNMENT_KEY);

const courseDialog = document.querySelector("#courseDialog");
const assignmentDialog = document.querySelector("#assignmentDialog");
const courseForm = document.querySelector("#courseForm");
const assignmentForm = document.querySelector("#assignmentForm");

function readStorage(key) {
  try {
    const saved = JSON.parse(localStorage.getItem(key));
    return Array.isArray(saved) ? saved : [];
  } catch (error) {
    return [];
  }
}

function saveState() {
  localStorage.setItem(COURSE_KEY, JSON.stringify(courses));
  localStorage.setItem(ASSIGNMENT_KEY, JSON.stringify(assignments));
}

function makeId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#039;", '"': "&quot;" })[character]);
}

function formatDate(dateString) {
  if (!dateString) return "No date";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(`${dateString}T00:00:00`));
}

function dateIsOverdue(dateString, status) {
  return status !== "Completed" && dateString && new Date(`${dateString}T23:59:59`) < new Date();
}

function render() {
  renderCourses();
  renderAssignments();
  updateStats();
  document.querySelector("#todayLabel").textContent = new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric" }).format(new Date());
}

function renderCourses() {
  const list = document.querySelector("#courseList");
  document.querySelector("#courseEmpty").hidden = courses.length > 0;
  list.innerHTML = courses.map((course) => `<article class="course-card"><span class="course-code">${escapeHtml(course.code)}</span><h3>${escapeHtml(course.name)}</h3><div class="card-actions"><button class="text-button" data-action="edit-course" data-id="${course.id}" type="button">Edit</button><button class="text-button text-button--delete" data-action="delete-course" data-id="${course.id}" type="button">Delete</button></div></article>`).join("");
}

function renderAssignments() {
  const list = document.querySelector("#assignmentList");
  document.querySelector("#assignmentEmpty").hidden = assignments.length > 0;
  list.innerHTML = assignments.map((assignment) => {
    const course = courses.find((item) => item.id === assignment.courseId);
    const priorityClass = assignment.priority.toLowerCase();
    const statusClass = assignment.status === "In Progress" ? "progress" : assignment.status.toLowerCase().replace(" ", "-");
    return `<tr><td>${escapeHtml(assignment.title)}<span class="assignment-course">${escapeHtml(course?.code || "Course removed")}</span></td><td>${escapeHtml(course?.name || "Unassigned")}</td><td class="due-date ${dateIsOverdue(assignment.dueDate, assignment.status) ? "overdue" : ""}">${formatDate(assignment.dueDate)}</td><td><select class="inline-select select-${priorityClass}" data-field="priority" data-id="${assignment.id}" aria-label="Priority for ${escapeHtml(assignment.title)}"><option ${assignment.priority === "Low" ? "selected" : ""}>Low</option><option ${assignment.priority === "Medium" ? "selected" : ""}>Medium</option><option ${assignment.priority === "High" ? "selected" : ""}>High</option></select></td><td><select class="inline-select select-${statusClass}" data-field="status" data-id="${assignment.id}" aria-label="Status for ${escapeHtml(assignment.title)}"><option ${assignment.status === "Not Started" ? "selected" : ""}>Not Started</option><option ${assignment.status === "In Progress" ? "selected" : ""}>In Progress</option><option ${assignment.status === "Completed" ? "selected" : ""}>Completed</option></select></td><td><button class="text-button" data-action="edit-assignment" data-id="${assignment.id}" type="button">Edit</button><button class="text-button text-button--delete" data-action="delete-assignment" data-id="${assignment.id}" type="button">Delete</button></td></tr>`;
  }).join("");
}

function updateStats() {
  const open = assignments.filter((assignment) => assignment.status !== "Completed");
  const completed = assignments.filter((assignment) => assignment.status === "Completed");
  const now = new Date();
  const weekEnd = new Date(now);
  weekEnd.setDate(now.getDate() + 7);
  const dueThisWeek = open.filter((assignment) => {
    const date = new Date(`${assignment.dueDate}T23:59:59`);
    return assignment.dueDate && date >= now && date <= weekEnd;
  });
  document.querySelector("#courseCount").textContent = courses.length;
  document.querySelector("#openCount").textContent = open.length;
  document.querySelector("#weekCount").textContent = dueThisWeek.length;
  document.querySelector("#completionRate").textContent = assignments.length ? `${Math.round((completed.length / assignments.length) * 100)}%` : "0%";
}

function populateCourseOptions(selectedId = "") {
  const select = document.querySelector("#assignmentCourse");
  select.innerHTML = courses.length ? courses.map((course) => `<option value="${course.id}" ${course.id === selectedId ? "selected" : ""}>${escapeHtml(course.code)} — ${escapeHtml(course.name)}</option>`).join("") : "<option value=\"\">Add a course first</option>";
}

function openCourseEditor(course = null) {
  courseForm.reset();
  document.querySelector("#courseDialogTitle").textContent = course ? "Edit course" : "Add a course";
  document.querySelector("#courseId").value = course?.id || "";
  document.querySelector("#courseName").value = course?.name || "";
  document.querySelector("#courseCode").value = course?.code || "";
  courseDialog.showModal();
}

function openAssignmentEditor(assignment = null) {
  assignmentForm.reset();
  document.querySelector("#assignmentDialogTitle").textContent = assignment ? "Edit assignment" : "Add an assignment";
  document.querySelector("#assignmentId").value = assignment?.id || "";
  document.querySelector("#assignmentTitle").value = assignment?.title || "";
  document.querySelector("#assignmentDueDate").value = assignment?.dueDate || "";
  document.querySelector("#assignmentPriority").value = assignment?.priority || "Medium";
  document.querySelector("#assignmentStatus").value = assignment?.status || "Not Started";
  populateCourseOptions(assignment?.courseId || courses[0]?.id || "");
  if (!courses.length) { alert("Add a course before creating an assignment."); return; }
  assignmentDialog.showModal();
}

document.querySelector("#addCourseButton").addEventListener("click", () => openCourseEditor());
document.querySelector("#addAssignmentButton").addEventListener("click", () => openAssignmentEditor());

document.addEventListener("click", (event) => {
  const button = event.target.closest("[data-action]");
  if (!button) return;
  const id = button.dataset.id;
  if (button.dataset.action === "edit-course") openCourseEditor(courses.find((course) => course.id === id));
  if (button.dataset.action === "delete-course") {
    if (assignments.some((assignment) => assignment.courseId === id)) { alert("This course has assignments. Delete or reassign them first."); return; }
    if (confirm("Delete this course?")) { courses = courses.filter((course) => course.id !== id); saveState(); render(); }
  }
  if (button.dataset.action === "edit-assignment") openAssignmentEditor(assignments.find((assignment) => assignment.id === id));
  if (button.dataset.action === "delete-assignment" && confirm("Delete this assignment?")) { assignments = assignments.filter((assignment) => assignment.id !== id); saveState(); render(); }
});

document.addEventListener("change", (event) => {
  const select = event.target.closest("[data-field]");
  if (!select) return;
  const assignment = assignments.find((item) => item.id === select.dataset.id);
  if (!assignment) return;
  assignment[select.dataset.field] = select.value;
  saveState();
  render();
});

courseForm.addEventListener("submit", (event) => {
  if (event.submitter?.value !== "default") return;
  event.preventDefault();
  const id = document.querySelector("#courseId").value;
  const course = { id: id || makeId(), name: document.querySelector("#courseName").value.trim(), code: document.querySelector("#courseCode").value.trim().toUpperCase() };
  if (id) courses = courses.map((item) => item.id === id ? course : item); else courses.push(course);
  saveState(); render(); courseDialog.close();
});

assignmentForm.addEventListener("submit", (event) => {
  if (event.submitter?.value !== "default") return;
  event.preventDefault();
  const id = document.querySelector("#assignmentId").value;
  const assignment = { id: id || makeId(), title: document.querySelector("#assignmentTitle").value.trim(), courseId: document.querySelector("#assignmentCourse").value, dueDate: document.querySelector("#assignmentDueDate").value, priority: document.querySelector("#assignmentPriority").value, status: document.querySelector("#assignmentStatus").value };
  if (id) assignments = assignments.map((item) => item.id === id ? assignment : item); else assignments.push(assignment);
  saveState(); render(); assignmentDialog.close();
});

render();
