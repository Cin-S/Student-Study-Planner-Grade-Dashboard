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
  return status !== "Completed" && dateString && new Date(`${dateString}T00:00:00`) < startOfToday();
}

function startOfToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

function endOfThisWeek() {
  const end = startOfToday();
  end.setDate(end.getDate() + (7 - end.getDay()));
  end.setHours(23, 59, 59, 999);
  return end;
}

function isDueThisWeek(assignment) {
  if (!assignment.dueDate || assignment.status === "Completed") return false;
  const due = new Date(`${assignment.dueDate}T23:59:59`);
  return due >= startOfToday() && due <= endOfThisWeek();
}

function isDueWithin48Hours(assignment) {
  if (!assignment.dueDate || assignment.status === "Completed") return false;
  const due = new Date(`${assignment.dueDate}T23:59:59`);
  return due >= new Date() && due <= new Date(Date.now() + 48 * 60 * 60 * 1000);
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
  list.innerHTML = courses.map((course) => {
    const grades = assignments.filter((assignment) => assignment.courseId === course.id && hasGrade(assignment)).map((assignment) => Number(assignment.grade));
    const average = grades.length ? `${(grades.reduce((sum, grade) => sum + grade, 0) / grades.length).toFixed(1).replace(/\.0$/, "")}%` : "N/A";
    return `<article class="course-card"><span class="course-code">${escapeHtml(course.code)}</span><h3>${escapeHtml(course.name)}</h3><div class="course-average"><span>RUNNING AVERAGE</span><strong>${average}</strong></div><div class="card-actions"><button class="text-button" data-action="edit-course" data-id="${course.id}" type="button">Edit</button><button class="text-button text-button--delete" data-action="delete-course" data-id="${course.id}" type="button">Delete</button></div></article>`;
  }).join("");
}

function renderAssignments() {
  const list = document.querySelector("#assignmentList");
  const priorityOrder = { High: 0, Medium: 1, Low: 2 };
  const gradedOnly = document.querySelector("#gradedFilter").checked;
  const visibleAssignments = assignments.filter((assignment) => (!document.querySelector("#deadlineFilter").checked || isDueWithin48Hours(assignment)) && (!gradedOnly || hasGrade(assignment))).sort((left, right) => {
    const priorityDifference = priorityOrder[left.priority] - priorityOrder[right.priority];
    return priorityDifference || (left.dueDate || "9999").localeCompare(right.dueDate || "9999");
  });
  document.querySelector("#assignmentEmpty").hidden = visibleAssignments.length > 0;
  list.innerHTML = visibleAssignments.map((assignment) => {
    const course = courses.find((item) => item.id === assignment.courseId);
    const priorityClass = assignment.priority.toLowerCase();
    const statusClass = assignment.status === "In Progress" ? "progress" : assignment.status.toLowerCase().replace(" ", "-");
    const weekMark = document.querySelector("#highlightWeek").checked && isDueThisWeek(assignment) ? " due-this-week" : "";
    return `<tr class="${weekMark}"><td>${escapeHtml(assignment.title)}<span class="assignment-course">${escapeHtml(course?.code || "Course removed")}</span></td><td>${escapeHtml(course?.name || "Unassigned")}</td><td class="due-date ${dateIsOverdue(assignment.dueDate, assignment.status) ? "overdue" : ""}">${formatDate(assignment.dueDate)}</td><td class="grade-cell ${hasGrade(assignment) ? "grade-cell--graded" : "grade-cell--empty"}">${hasGrade(assignment) ? `${assignment.grade}%` : "Not graded"}</td><td><select class="inline-select select-${priorityClass}" data-field="priority" data-id="${assignment.id}" aria-label="Priority for ${escapeHtml(assignment.title)}"><option ${assignment.priority === "Low" ? "selected" : ""}>Low</option><option ${assignment.priority === "Medium" ? "selected" : ""}>Medium</option><option ${assignment.priority === "High" ? "selected" : ""}>High</option></select></td><td><select class="inline-select select-${statusClass}" data-field="status" data-id="${assignment.id}" aria-label="Status for ${escapeHtml(assignment.title)}"><option ${assignment.status === "Not Started" ? "selected" : ""}>Not Started</option><option ${assignment.status === "In Progress" ? "selected" : ""}>In Progress</option><option ${assignment.status === "Completed" ? "selected" : ""}>Completed</option></select></td><td><div class="assignment-actions"><button class="text-button" data-action="edit-assignment" data-id="${assignment.id}" type="button">Edit</button><button class="text-button text-button--delete" data-action="delete-assignment" data-id="${assignment.id}" type="button">Delete</button></div></td></tr>`;
  }).join("");
}

function hasGrade(assignment) {
  const grade = Number(assignment.grade);
  return assignment.grade !== null && assignment.grade !== "" && assignment.grade !== undefined && Number.isFinite(grade) && grade >= 0 && grade <= 100;
}

function updateStats() {
  const completed = assignments.filter((assignment) => assignment.status === "Completed");
  const overdue = assignments.filter((assignment) => dateIsOverdue(assignment.dueDate, assignment.status));
  const dueThisWeek = assignments.filter(isDueThisWeek);
  const grades = assignments.filter((assignment) => assignment.grade !== null && assignment.grade !== "" && assignment.grade !== undefined).map((assignment) => Number(assignment.grade)).filter((grade) => Number.isFinite(grade) && grade >= 0 && grade <= 100);
  const average = grades.length ? (grades.reduce((sum, grade) => sum + grade, 0) / grades.length).toFixed(1).replace(/\.0$/, "") : "N/A";
  document.querySelector("#totalAssignments").textContent = assignments.length;
  document.querySelector("#completedAssignments").textContent = completed.length;
  document.querySelector("#remainingAssignments").textContent = assignments.length - completed.length;
  document.querySelector("#overdueAssignments").textContent = overdue.length;
  document.querySelector("#dueThisWeek").textContent = dueThisWeek.length;
  document.querySelector("#gradeAverage").textContent = average;
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
  document.querySelector("#assignmentGrade").value = assignment?.grade ?? "";
  populateCourseOptions(assignment?.courseId || courses[0]?.id || "");
  if (!courses.length) { alert("Add a course before creating an assignment."); return; }
  assignmentDialog.showModal();
}

document.querySelector("#addCourseButton").addEventListener("click", () => openCourseEditor());
document.querySelector("#addAssignmentButton").addEventListener("click", () => openAssignmentEditor());
document.querySelector("#deadlineFilter").addEventListener("change", renderAssignments);
document.querySelector("#gradedFilter").addEventListener("change", renderAssignments);
document.querySelector("#highlightWeek").addEventListener("change", renderAssignments);
document.querySelector("#exportCalendarButton").addEventListener("click", () => {
  const events = assignments.filter((assignment) => assignment.dueDate).map((assignment) => {
    const course = courses.find((item) => item.id === assignment.courseId);
    const date = assignment.dueDate.replaceAll("-", "");
    return ["BEGIN:VEVENT", `UID:${assignment.id}@studydeck`, `DTSTART;VALUE=DATE:${date}`, `DTEND;VALUE=DATE:${date}`, `SUMMARY:${escapeIcs(`${assignment.title}${course ? ` - ${course.code}` : ""}`)}`, `DESCRIPTION:Priority: ${escapeIcs(assignment.priority)}` , "END:VEVENT"].join("\r\n");
  });
  if (!events.length) { alert("Add an assignment with a due date before exporting."); return; }
  const calendar = `BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//StudyDeck//Planner//EN\r\n${events.join("\r\n")}\r\nEND:VCALENDAR`;
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([calendar], { type: "text/calendar" }));
  link.download = "studydeck-assignments.ics";
  link.click();
  URL.revokeObjectURL(link.href);
});

function escapeIcs(value) {
  return String(value).replace(/[\\;,]/g, (character) => `\\${character}`).replace(/\n/g, "\\n");
}

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
  const gradeInput = document.querySelector("#assignmentGrade").value.trim();
  const grade = gradeInput === "" ? null : Number(gradeInput);
  if (grade !== null && (!Number.isFinite(grade) || grade < 0 || grade > 100)) return;
  const assignment = { id: id || makeId(), title: document.querySelector("#assignmentTitle").value.trim(), courseId: document.querySelector("#assignmentCourse").value, dueDate: document.querySelector("#assignmentDueDate").value, priority: document.querySelector("#assignmentPriority").value, status: document.querySelector("#assignmentStatus").value, grade };
  if (id) assignments = assignments.map((item) => item.id === id ? assignment : item); else assignments.push(assignment);
  saveState(); render(); assignmentDialog.close();
});

render();
