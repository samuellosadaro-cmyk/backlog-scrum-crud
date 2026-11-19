// Centraliza el acceso al almacenamiento local para separar datos e interfaz.
window.StoryStorage = {
  key: "backlog-scrum-historias",

  // Devuelve una lista vacía cuando todavía no se han guardado historias.
  getStories() {
    const savedStories = localStorage.getItem(this.key);
    if (savedStories === null) {
      return [];
    }

    // Si los datos guardados no son válidos, el error se mostrará en la interfaz.
    const stories = JSON.parse(savedStories);
    if (!Array.isArray(stories)) {
      throw new Error("Los datos guardados del backlog no tienen el formato esperado.");
    }
    return stories;
  },

  // Persiste la lista completa para mantener cada operación sencilla.
  saveStories(stories) {
    localStorage.setItem(this.key, JSON.stringify(stories));
  }
};
