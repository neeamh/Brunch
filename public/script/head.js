$(document).ready(function() {
  console.log("Document is ready");

  // Function to update active class based on the current URL
  function setActiveNavLink() {
    const currentPath = window.location.pathname;
    $('.nav-link').each(function() {
      const linkPath = $(`${this} a`).attr('href');
      if (currentPath === linkPath) {
        $(`${this} a`).addClass('btn-active');
      } else {
        $(`${this} a`).removeClass('bnt-active');
      }
    });
  }

  // Set active class on initial load
  setActiveNavLink();

  // Update active class on link click
  $(`.nav-link`).click(function() {
    $(`.nav-link .btn-active`).removeClass('btn-active');
    $(`${this} a`).addClass('btn-active');
  });
});