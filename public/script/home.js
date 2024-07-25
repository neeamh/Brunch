console.log('this is working');
$(document).ready(function() {
  $(".hover-scroll").hover(
    function() {
      document.documentElement.style.setProperty('--scroll-duration', '15s');
    },
    function() {
      document.documentElement.style.setProperty('--scroll-duration', '50s');
    }
  );
});