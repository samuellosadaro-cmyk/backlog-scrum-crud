// Conecta el formulario y la lista con el almacenamiento local.
const form = document.querySelector("#story-form");
const titleInput = document.querySelector("#title");
const descriptionInput = document.querySelector("#description");
const responsibleInput = document.querySelector("#responsible");
const pointsInput = document.querySelector("#points");
const priorityInput = document.querySelector("#priority");
const statusInput = document.querySelector("#status");
const storyList = document.querySelector("#story-list");
const storyCount = document.querySelector("#story-count");
const headingCount = document.querySelector("#heading-count");
const formTitle = document.querySelector("#form-title");
const formHint = document.querySelector("#form-hint");
const submitButton = document.querySelector("#submit-button");
const cancelEditButton = document.querySelector("#cancel-edit");
const message = document.querySelector("#message");
const deleteDialog = document.querySelector("#delete-dialog");
const deleteStoryName = document.querySelector("#delete-story-name");
const cancelDeleteButton = document.querySelector("#cancel-delete");
const confirmDeleteButton = document.querySelector("#confirm-delete");

let stories = [];
let editingId = null;
let pendingDeleteId = null;

const priorityLabels = {
  alta: "Prioridad alta",
  media: "Prioridad media",
  baja: "Prioridad baja"
};

const priorityOrder = {
  alta: 0,
  media: 1,
  baja: 2
};

const statusLabels = {
  "por-hacer": "Por hacer",
  "en-progreso": "En progreso",
  hecho: "Hecho"
};

// Muestra errores de almacenamiento en lugar de dejar fallar la operación en silencio.
function showMessage(text) {
  message.textContent = text;
  message.hidden = false;
}

function clearMessage() {
  message.textContent = "";
  message.hidden = true;
}

// Crea elementos de texto como nodos para que el contenido de las historias no se interprete como HTML.
function createBadge(text, className) {
  const badge = document.createElement("span");
  badge.className = `badge ${className}`;
  badge.textContent = text;
  return badge;
}

function createActionButton(text, action, id, extraClass) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `icon-button ${extraClass || ""}`.trim();
  button.dataset.action = action;
  button.dataset.id = id;
  button.textContent = text;
  return button;
}

// Renderiza la lista desde el estado actual y actualiza los contadores.
function renderStories() {
  storyCount.textContent = String(stories.length);
  headingCount.textContent = String(stories.length);
  storyList.replaceChildren();

  if (stories.length === 0) {
    const emptyState = document.createElement("div");
    emptyState.className = "empty-state";

    const icon = document.createElement("div");
    icon.className = "empty-icon";
    icon.setAttribute("aria-hidden", "true");
    icon.textContent = "✳";

    const heading = document.createElement("h3");
    heading.textContent = "Tu backlog está vacío";

    const description = document.createElement("p");
    description.textContent = "Crea la primera historia con el formulario para empezar a planificar.";

    emptyState.append(icon, heading, description);
    storyList.append(emptyState);
    return;
  }

  // Ordena una copia para no cambiar el orden de los datos guardados.
  const orderedStories = [...stories].sort((first, second) => (
    priorityOrder[first.priority] - priorityOrder[second.priority]
    || second.points - first.points
  ));

  orderedStories.forEach((story) => {
    const card = document.createElement("article");
    card.className = "story-card";

    const topLine = document.createElement("div");
    topLine.className = "story-topline";
    const title = document.createElement("h3");
    title.className = "story-title";
    title.textContent = story.title;
    const status = createBadge(statusLabels[story.status], `badge-status-${story.status}`);
    topLine.append(title, status);

    const description = document.createElement("p");
    description.className = "story-description";
    description.textContent = story.description;

    const assignee = document.createElement("p");
    assignee.className = "story-assignee";
    const assigneeLabel = document.createElement("span");
    assigneeLabel.textContent = "Responsable";
    const assigneeName = document.createElement("strong");
    // Las historias creadas antes de añadir este campo se muestran como no asignadas.
    assigneeName.textContent = story.responsible || "Sin asignar";
    assignee.append(assigneeLabel, assigneeName);

    const footer = document.createElement("div");
    footer.className = "story-footer";
    const meta = document.createElement("div");
    meta.className = "story-meta";
    meta.append(
      createBadge(`${story.points} pts`, "badge-points"),
      createBadge(priorityLabels[story.priority], `badge-priority-${story.priority}`)
    );

    const actions = document.createElement("div");
    actions.className = "story-actions";
    actions.append(
      createActionButton("Editar", "edit", story.id),
      createActionButton("Eliminar", "delete", story.id, "delete")
    );
    footer.append(meta, actions);
    card.append(topLine, description, assignee, footer);
    storyList.append(card);
  });
}

// Guarda antes de actualizar la vista, para mantenerla sincronizada con los datos persistidos.
function persistStories(nextStories) {
  try {
    window.StoryStorage.saveStories(nextStories);
    stories = nextStories;
    clearMessage();
    renderStories();
    return true;
  } catch (error) {
    showMessage(`No se pudo guardar el backlog en este dispositivo. ${error.message}`);
    return false;
  }
}

function resetForm() {
  form.reset();
  editingId = null;
  formTitle.textContent = "Nueva historia";
  formHint.textContent = "Añade una historia al backlog";
  submitButton.innerHTML = 'Agregar historia <span aria-hidden="true">→</span>';
  cancelEditButton.hidden = true;
}

// Genera identificadores únicos incluso en navegadores sin crypto.randomUUID.
function createId() {
  if (window.crypto && typeof window.crypto.randomUUID === "function") {
    return window.crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  clearMessage();

  if (!form.reportValidity()) {
    return;
  }

  const points = Number(pointsInput.value);
  if (!Number.isInteger(points) || points < 1) {
    showMessage("Los puntos de historia deben ser un número entero mayor que cero.");
    pointsInput.focus();
    return;
  }

  const storyData = {
    title: titleInput.value.trim(),
    description: descriptionInput.value.trim(),
    responsible: responsibleInput.value.trim(),
    points,
    priority: priorityInput.value,
    status: statusInput.value
  };

  if (!storyData.title || !storyData.description) {
    showMessage("Completa el título y la descripción de la historia.");
    return;
  }

  if (editingId) {
    const updatedStories = stories.map((story) => (
      story.id === editingId ? { ...story, ...storyData } : story
    ));
    if (persistStories(updatedStories)) {
      resetForm();
    }
    return;
  }

  const newStory = { id: createId(), ...storyData };
  if (persistStories([...stories, newStory])) {
    resetForm();
  }
});

storyList.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) {
    return;
  }

  const story = stories.find((item) => item.id === button.dataset.id);
  if (!story) {
    return;
  }

  if (button.dataset.action === "edit") {
    clearMessage();
    editingId = story.id;
    titleInput.value = story.title;
    descriptionInput.value = story.description;
    responsibleInput.value = story.responsible || "";
    pointsInput.value = String(story.points);
    priorityInput.value = story.priority;
    statusInput.value = story.status;
    formTitle.textContent = "Editar historia";
    formHint.textContent = "Actualiza los detalles de esta historia";
    submitButton.innerHTML = 'Guardar cambios <span aria-hidden="true">→</span>';
    cancelEditButton.hidden = false;
    titleInput.focus();
    return;
  }

  if (button.dataset.action === "delete") {
    pendingDeleteId = story.id;
    deleteStoryName.textContent = story.title;
    deleteDialog.showModal();
  }
});

cancelDeleteButton.addEventListener("click", () => {
  deleteDialog.close();
});

confirmDeleteButton.addEventListener("click", () => {
  const storyToDelete = stories.find((story) => story.id === pendingDeleteId);
  deleteDialog.close();
  pendingDeleteId = null;

  if (!storyToDelete) {
    return;
  }

  if (
    persistStories(stories.filter((story) => story.id !== storyToDelete.id))
    && editingId === storyToDelete.id
  ) {
    resetForm();
  }
});

// Escape también cierra el diálogo sin borrar la historia.
deleteDialog.addEventListener("close", () => {
  pendingDeleteId = null;
});

cancelEditButton.addEventListener("click", () => {
  clearMessage();
  resetForm();
});

// Lee los datos al iniciar; los errores quedan visibles para que no se pierda contexto.
try {
  stories = window.StoryStorage.getStories();
  renderStories();
} catch (error) {
  renderStories();
  showMessage(`No se pudieron leer las historias guardadas. ${error.message}`);
}
