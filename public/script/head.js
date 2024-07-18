$(document).ready(function() {
  console.log("Document is ready");

  // Function to update active class based on the current URL
  function setActiveNavLink() {
    const currentPath = window.location.pathname;
    $('.nav-link').each(function() {
      const linkPath = $(this).attr('href');
      if (currentPath === linkPath) {
        $(this).addClass('btn-active');
      } else {
        $(this).removeClass('btn-active');
      }
    });
  }

  // Set active class on initial load
  setActiveNavLink();

  // Update active class on link click
  $('.nav-link').click(function() {
    $('.nav-link').removeClass('btn-active');
    $(this).addClass('btn-active');
  });
});
