if (location.protocol === 'file:') {
  // this file is being opened directly from the local filesystem
  // redirect to the dev server
  const filename = location.pathname.split('/').pop();
  const correctUrl = `http://localhost:3000/test/out/${filename}`;
  fetch(correctUrl, { mode: 'no-cors' }) // is the dev server running?
  .then(() => location = correctUrl)     // yes: redirect
  .catch(() => document.body.innerHTML = /* no: show info */ `
    <main>
      <code>npm run dev</code>
      <div>then:</div>
      <a href="${correctUrl}">${correctUrl}</a>
    </main>
  `);
}
