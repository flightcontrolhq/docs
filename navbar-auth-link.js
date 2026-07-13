function hasCookie(name) {
  return document.cookie
    .split(";")
    .some((cookie) => cookie.trim().split("=")[0] === name);
}

function updateAuthLink() {
  const isLoggedIn = hasCookie("rps");
  const label = isLoggedIn ? "Dashboard" : "Start free trial";
  const href = isLoggedIn ? "https://app.ravion.com" : "https://app.ravion.com/signup";

  document.querySelectorAll(".navbar-link, navbar-link").forEach((navbarLink) => {
    const link = navbarLink.matches("a") ? navbarLink : navbarLink.querySelector("a");

    if (!link || !link.href.startsWith("https://app.ravion.com")) return;
    if (link.textContent.trim() !== label) link.textContent = label;
    if (link.getAttribute("href") !== href) link.href = href;
  });
}

updateAuthLink();
new MutationObserver(updateAuthLink).observe(document.body, {
  childList: true,
  subtree: true,
});
