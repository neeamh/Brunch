document.addEventListener('DOMContentLoaded', async () => {
    const postId = document.querySelector('[id^="like-icon-"]').id.split('-').pop();
    try {
      const responseLikeStatus = await fetch(`/posts/${postId}/isLiked`);
      const dataLikeStatus = await responseLikeStatus.json();
      const likeIcon = document.getElementById(`like-icon-${postId}`);
      if (dataLikeStatus.isLiked) {
        likeIcon.classList.remove('fa-heart-o');
        likeIcon.classList.add('fa-heart');
      }
  
      const responseLikeCount = await fetch(`/posts/${postId}/likes`);
      const dataLikeCount = await responseLikeCount.json();
      document.getElementById(`like-count-${postId}`).textContent = dataLikeCount.like_count;
    } catch (error) {
      console.error('Error fetching like status or count:', error);
    }
  });
  