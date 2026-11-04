// A user only has a real rating once somebody has reviewed them

// true if the user has at least one review
export const hasReviews = (user) => Number(user?.reviewsCount || 0) > 0;

// number used for sorting and filtering (0 when there are no reviews)
export const ratingValue = (user) => (hasReviews(user) ? Number(user.rating) || 0 : 0);

// text shown in the app, e.g. "4.8" or "New"
export const ratingText = (user) => (hasReviews(user) ? Number(user.rating).toFixed(1) : 'New');