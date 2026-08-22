// load saved tasks from this browser, or start empty if there are none
let tasks = JSON.parse(localStorage.getItem("donezo-tasks")) || [];
let sortByDeadline = false;
let historyVisible = false;
let dragStartIndex = null;
let calendarVisible = false;
let calendarDate = new Date();
let selectedDay = null;

const form = document.getElementById("task-form");
const searchInput = document.getElementById("search-input");
const filterInput = document.getElementById("filter-input");
const progressText = document.getElementById("progress-text");
const sortBtn = document.getElementById("sort-btn");
const historyToggleBtn = document.getElementById("history-toggle-btn");
const historyList = document.getElementById("history-list");
const darkModeBtn = document.getElementById("dark-mode-btn");
const calendarToggleBtn = document.getElementById("calendar-toggle-btn");
const calendarDiv = document.getElementById("calendar");
const nameInput = document.getElementById("name-input");
const greetingWord = document.getElementById("greeting-word");

function saveTasks() {
  localStorage.setItem("donezo-tasks", JSON.stringify(tasks));
}

// ---- name + greeting ----
function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

greetingWord.textContent = getGreeting() + ",";
nameInput.value = localStorage.getItem("donezo-name") || "";

nameInput.addEventListener("input", function() {
  localStorage.setItem("donezo-name", nameInput.value);
});

// ---- dark mode (also remembered between visits) ----
if (localStorage.getItem("donezo-dark-mode") === "true") {
  document.body.classList.add("dark-mode");
}

darkModeBtn.addEventListener("click", function() {
  document.body.classList.toggle("dark-mode");
  localStorage.setItem("donezo-dark-mode", document.body.classList.contains("dark-mode"));
});

calendarToggleBtn.addEventListener("click", function() {
  calendarVisible = !calendarVisible;
  renderTasks();
});

form.addEventListener("submit", function(event) {
  event.preventDefault();

  const titleInput = document.getElementById("title-input");
  const dateInput = document.getElementById("date-input");
  const priorityInput = document.getElementById("priority-input");
  const categoryInput = document.getElementById("category-input");
  const recurringInput = document.getElementById("recurring-input");

  const newTask = {
    title: titleInput.value,
    dueDate: dateInput.value,
    priority: priorityInput.value,
    category: categoryInput.value,
    recurring: recurringInput.value,
    completed: false,
    editing: false
  };

  tasks.push(newTask);

  titleInput.value = "";
  dateInput.value = "";
  categoryInput.value = "";
  recurringInput.value = "none";
  updateCategoryOptions();
  renderTasks();
});

searchInput.addEventListener("input", renderTasks);
filterInput.addEventListener("change", renderTasks);

sortBtn.addEventListener("click", function() {
  sortByDeadline = !sortByDeadline;
  renderTasks();
});

historyToggleBtn.addEventListener("click", function() {
  historyVisible = !historyVisible;
  renderTasks();
});

function updateCategoryOptions() {
  const uniqueCategories = [...new Set(tasks.map(function(t) { return t.category; }))];

  filterInput.innerHTML = '<option value="all">All Categories</option>';
  uniqueCategories.forEach(function(cat) {
    if (cat) {
      const option = document.createElement("option");
      option.value = cat;
      option.textContent = cat;
      filterInput.appendChild(option);
    }
  });
}

function getVisibleTasks() {
  const searchTerm = searchInput.value.toLowerCase();
  const selectedCategory = filterInput.value;

  let visible = tasks.filter(function(task) {
    const matchesSearch = task.title.toLowerCase().includes(searchTerm);
    const matchesCategory = selectedCategory === "all" || task.category === selectedCategory;
    const matchesDay = !selectedDay || task.dueDate === selectedDay;
    return matchesSearch && matchesCategory && matchesDay && !task.completed;
  });

  if (sortByDeadline) {
    visible = visible.slice().sort(function(a, b) {
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return a.dueDate.localeCompare(b.dueDate);
    });
  }

  return visible;
}

function updateProgress() {
  const total = tasks.length;
  const doneCount = tasks.filter(function(t) { return t.completed; }).length;

  if (total === 0) {
    progressText.textContent = "0 of 0 tasks done";
    return;
  }

  const percent = Math.round((doneCount / total) * 100);

  if (percent === 100) {
    progressText.textContent = "Look at you being productive. ✨";
  } else {
    progressText.textContent = doneCount + " of " + total + " tasks done — " + percent + "% completed";
  }
}

function renderHistory() {
  historyToggleBtn.textContent = historyVisible ? "Hide Completed History" : "Show Completed History";

  if (!historyVisible) {
    historyList.innerHTML = "";
    return;
  }

  const completedTasks = tasks.filter(function(t) { return t.completed; });

  if (completedTasks.length === 0) {
    historyList.innerHTML = "<p>Nothing completed yet.</p>";
    return;
  }

  historyList.innerHTML = "";
  completedTasks.forEach(function(task) {
    const index = tasks.indexOf(task);
    const taskDiv = document.createElement("div");
    taskDiv.className = "task-card";

    const titleSpan = document.createElement("span");
    titleSpan.className = "task-title";
    titleSpan.textContent = task.title;
    titleSpan.style.textDecoration = "line-through";

    const buttonRow = document.createElement("div");
    buttonRow.className = "button-row";

    const undoBtn = document.createElement("button");
    undoBtn.textContent = "Undo";
    undoBtn.onclick = function() {
      toggleComplete(index);
    };

    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "Delete";
    deleteBtn.onclick = function() {
      deleteTask(index);
    };

    buttonRow.appendChild(undoBtn);
    buttonRow.appendChild(deleteBtn);
    taskDiv.appendChild(titleSpan);
    taskDiv.appendChild(buttonRow);
    historyList.appendChild(taskDiv);
  });
}

function renderCalendar() {
  calendarToggleBtn.textContent = calendarVisible ? "📅 Hide Calendar" : "📅 Calendar";

  if (!calendarVisible) {
    calendarDiv.innerHTML = "";
    return;
  }

  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();

  calendarDiv.innerHTML = "";

  const header = document.createElement("div");
  header.className = "button-row";

  const prevBtn = document.createElement("button");
  prevBtn.textContent = "< Prev";
  prevBtn.onclick = function() {
    calendarDate.setMonth(calendarDate.getMonth() - 1);
    renderCalendar();
  };

  const monthLabel = document.createElement("span");
  const monthNames = ["January", "February", "March", "April", "May", "June",
                       "July", "August", "September", "October", "November", "December"];
  monthLabel.textContent = " " + monthNames[month] + " " + year + " ";

  const nextBtn = document.createElement("button");
  nextBtn.textContent = "Next >";
  nextBtn.onclick = function() {
    calendarDate.setMonth(calendarDate.getMonth() + 1);
    renderCalendar();
  };

  header.appendChild(prevBtn);
  header.appendChild(monthLabel);
  header.appendChild(nextBtn);
  calendarDiv.appendChild(header);

  const tasksByDay = {};
  tasks.forEach(function(task) {
    if (task.dueDate && !task.completed) {
      if (!tasksByDay[task.dueDate]) {
        tasksByDay[task.dueDate] = [];
      }
      tasksByDay[task.dueDate].push(task);
    }
  });

  const grid = document.createElement("div");
  grid.style.display = "grid";
  grid.style.gridTemplateColumns = "repeat(7, 1fr)";
  grid.style.gap = "4px";
  grid.style.marginBottom = "16px";

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  for (let i = 0; i < firstDayOfMonth; i++) {
    grid.appendChild(document.createElement("div"));
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const monthStr = String(month + 1).padStart(2, "0");
    const dayStr = String(day).padStart(2, "0");
    const iso = year + "-" + monthStr + "-" + dayStr;

    const cell = document.createElement("div");
    cell.style.border = "1px solid #C3B1E1";
    cell.style.borderRadius = "6px";
    cell.style.padding = "4px";
    cell.style.minHeight = "44px";
    cell.style.cursor = "pointer";
    cell.style.fontSize = "12px";

    if (iso === selectedDay) {
      cell.style.backgroundColor = "#E39BB8";
      cell.style.color = "white";
    }

    const dayNumber = document.createElement("div");
    dayNumber.textContent = day;
    cell.appendChild(dayNumber);

    const dayTasks = tasksByDay[iso] || [];
    dayTasks.slice(0, 1).forEach(function(task) {
      const taskLine = document.createElement("div");
      taskLine.textContent = task.title;
      taskLine.style.fontSize = "10px";
      taskLine.style.overflow = "hidden";
      taskLine.style.textOverflow = "ellipsis";
      taskLine.style.whiteSpace = "nowrap";
      cell.appendChild(taskLine);
    });
    if (dayTasks.length > 1) {
      const moreLine = document.createElement("div");
      moreLine.textContent = "+" + (dayTasks.length - 1) + " more";
      moreLine.style.fontSize = "10px";
      cell.appendChild(moreLine);
    }

    cell.onclick = function() {
      selectedDay = (selectedDay === iso) ? null : iso;
      renderTasks();
    };

    grid.appendChild(cell);
  }

  calendarDiv.appendChild(grid);
}

function renderTasks() {
  saveTasks(); // keep localStorage in sync every time the list changes

  const container = document.getElementById("task-list");
  container.innerHTML = "";

  updateProgress();
  renderHistory();
  renderCalendar();

  const visibleTasks = getVisibleTasks();

  if (visibleTasks.length === 0) {
    container.innerHTML = "<p>No tasks yet.</p>";
    return;
  }

  visibleTasks.forEach(function(task) {
    const index = tasks.indexOf(task);
    const taskDiv = document.createElement("div");
    taskDiv.className = "task-card";

    if (!sortByDeadline) {
      taskDiv.draggable = true;

      taskDiv.addEventListener("dragstart", function() {
        dragStartIndex = index;
        taskDiv.style.opacity = "0.5";
      });

      taskDiv.addEventListener("dragend", function() {
        taskDiv.style.opacity = "1";
      });

      taskDiv.addEventListener("dragover", function(event) {
        event.preventDefault();
      });

      taskDiv.addEventListener("drop", function() {
        reorderTasks(dragStartIndex, index);
      });
    }

    if (task.editing) {
      const editInput = document.createElement("input");
      editInput.type = "text";
      editInput.value = task.title;

      const saveBtn = document.createElement("button");
      saveBtn.textContent = "Save";
      saveBtn.onclick = function() {
        saveEdit(index, editInput.value);
      };

      taskDiv.appendChild(editInput);
      taskDiv.appendChild(saveBtn);
    } else {
      const titleSpan = document.createElement("span");
      titleSpan.className = "task-title";
      titleSpan.textContent = task.title;

      const badgeRow = document.createElement("div");
      badgeRow.className = "badge-row";

      if (task.dueDate) {
        const dueBadge = document.createElement("span");
        dueBadge.className = "badge badge-due";
        dueBadge.textContent = "Due: " + task.dueDate;
        badgeRow.appendChild(dueBadge);
      }

      const priorityBadge = document.createElement("span");
      priorityBadge.className = "badge badge-priority-" + task.priority;
      priorityBadge.textContent = task.priority.toUpperCase();
      badgeRow.appendChild(priorityBadge);

      if (task.category) {
        const categoryBadge = document.createElement("span");
        categoryBadge.className = "badge badge-category";
        categoryBadge.textContent = task.category;
        badgeRow.appendChild(categoryBadge);
      }

      if (task.recurring !== "none") {
        const recurringBadge = document.createElement("span");
        recurringBadge.className = "badge badge-recurring";
        recurringBadge.textContent = "Repeats: " + task.recurring;
        badgeRow.appendChild(recurringBadge);
      }

      const buttonRow = document.createElement("div");
      buttonRow.className = "button-row";

      const completeBtn = document.createElement("button");
      completeBtn.textContent = "Complete";
      completeBtn.onclick = function() {
        toggleComplete(index);
      };

      const editBtn = document.createElement("button");
      editBtn.textContent = "Edit";
      editBtn.onclick = function() {
        startEdit(index);
      };

      const deleteBtn = document.createElement("button");
      deleteBtn.textContent = "Delete";
      deleteBtn.onclick = function() {
        deleteTask(index);
      };

      buttonRow.appendChild(completeBtn);
      buttonRow.appendChild(editBtn);
      buttonRow.appendChild(deleteBtn);

      taskDiv.appendChild(titleSpan);
      taskDiv.appendChild(badgeRow);
      taskDiv.appendChild(buttonRow);
    }

    container.appendChild(taskDiv);
  });
}

function reorderTasks(fromIndex, toIndex) {
  if (fromIndex === null || fromIndex === toIndex) return;
  const [movedTask] = tasks.splice(fromIndex, 1);
  tasks.splice(toIndex, 0, movedTask);
  dragStartIndex = null;
  renderTasks();
}

function getNextDueDate(dueDate, recurring) {
  if (!dueDate) return dueDate;

  const date = new Date(dueDate + "T00:00:00");

  if (recurring === "daily") {
    date.setDate(date.getDate() + 1);
  } else if (recurring === "weekly") {
    date.setDate(date.getDate() + 7);
  } else if (recurring === "monthly") {
    date.setMonth(date.getMonth() + 1);
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return year + "-" + month + "-" + day;
}

function toggleComplete(index) {
  const task = tasks[index];

  if (!task.completed && task.recurring !== "none") {
    const nextTask = {
      title: task.title,
      dueDate: getNextDueDate(task.dueDate, task.recurring),
      priority: task.priority,
      category: task.category,
      recurring: task.recurring,
      completed: false,
      editing: false
    };
    tasks.push(nextTask);
  }

  task.completed = !task.completed;
  renderTasks();
}

function startEdit(index) {
  tasks[index].editing = true;
  renderTasks();
}

function saveEdit(index, newTitle) {
  tasks[index].title = newTitle;
  tasks[index].editing = false;
  renderTasks();
}

function deleteTask(index) {
  tasks.splice(index, 1);
  renderTasks();
}

updateCategoryOptions();
renderTasks();
