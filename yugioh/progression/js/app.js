document.addEventListener("DOMContentLoaded", () => {
  initializeMenuButtons();
  initializeBackgroundVideo();
  initializePageIntro();
});

function initializeMenuButtons() {
  const menuButtons = document.querySelectorAll(".menu-button");

  menuButtons.forEach((button) => {
    button.addEventListener("click", handleMenuNavigation);
  });
}

function handleMenuNavigation(event) {
  event.preventDefault();

  const targetUrl = event.currentTarget.getAttribute("href");
  if (!targetUrl) return;

  document.body.classList.add("page-fade-out");

  setTimeout(() => {
    window.location.href = targetUrl;
  }, 250);
}

function initializeBackgroundVideo() {
  const bgVideo = document.getElementById("bgVideo");
  if (!bgVideo) return;

  bgVideo.play().catch(() => {
    // Autoplay may be blocked depending on browser policies.
  });
}

function initializePageIntro() {
  document.body.classList.add("page-loaded");
}