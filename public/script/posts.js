document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[id^="like-icon-"]').forEach(async (element) => {
      const postId = element.id.split('-').pop();
      try {
        const response = await fetch(`/posts/${postId}/isLiked`);
        const data = await response.json();
        if (data.isLiked) {
          element.classList.remove('fa-heart-o');
          element.classList.add('fa-heart');
        }
      } catch (error) {
        console.error('Error fetching like status:', error);
      }
    });
  });
  