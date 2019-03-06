// This file is executed right before electron start loading the index

process.once('loaded', () => {
  // Set closed in localStorage, so user does not open in the wallet page
  localStorage.setItem('wallet:closed', true);
})
