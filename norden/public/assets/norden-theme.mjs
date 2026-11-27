// Both public entry points run this before their first paint.
try {
  document.documentElement.classList.toggle('dark', localStorage.getItem('norden_theme') === 'dark');
} catch { /* The stylesheet supplies the default theme. */ }
