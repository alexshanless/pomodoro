// Animal emoji profile pictures
export const animalAvatars = [
  '🦊', // Fox
  '🐼', // Panda
  '🦁', // Lion
  '🐯', // Tiger
  '🐨', // Koala
  '🐸', // Frog
  '🦉', // Owl
  '🐧', // Penguin
  '🦜', // Parrot
  '🐙', // Octopus
  '🐵', // Monkey
  '🐶', // Dog
  '🐱', // Cat
  '🐰', // Rabbit
  '🦄', // Unicorn
];

// Food emoji profile pictures
export const foodAvatars = [
  '🍕', // Pizza
  '🍔', // Burger
  '🍣', // Sushi
  '🍩', // Donut
  '🍦', // Ice Cream
  '🍪', // Cookie
  '🍰', // Cake
  '🌮', // Taco
  '🍜', // Ramen
  '☕', // Coffee
  '🧋', // Bubble Tea
  '🍎', // Apple
];

// Nature emoji profile pictures
export const natureAvatars = [
  '🌸', // Cherry Blossom
  '🌺', // Hibiscus
  '🌻', // Sunflower
  '🌹', // Rose
  '🌵', // Cactus
  '🌲', // Pine Tree
  '🍄', // Mushroom
  '⭐', // Star
  '🌙', // Moon
  '☀️', // Sun
  '🌈', // Rainbow
  '⚡', // Lightning
];

// Activity emoji profile pictures
export const activityAvatars = [
  '⚽', // Soccer
  '🏀', // Basketball
  '🎮', // Video Game
  '🎨', // Art
  '🎸', // Guitar
  '📚', // Books
  '✈️', // Airplane
  '🚀', // Rocket
  '🎯', // Bullseye
  '🎭', // Theater
  '🎬', // Movie
  '🎵', // Music
];

// All categories
export const emojiCategories = {
  animals: { name: 'Animals', emojis: animalAvatars },
  food: { name: 'Food & Drink', emojis: foodAvatars },
  nature: { name: 'Nature', emojis: natureAvatars },
  activities: { name: 'Activities', emojis: activityAvatars }
};

// Get a random animal avatar
export const getRandomAnimalAvatar = () => {
  const randomIndex = Math.floor(Math.random() * animalAvatars.length);
  return animalAvatars[randomIndex];
};

// Get avatar by index (for consistency across sessions)
export const getAnimalAvatarByIndex = (index) => {
  return animalAvatars[index % animalAvatars.length];
};

// Get user's avatar (generates a consistent one based on user ID or random for new users)
export const getUserAvatar = (userId) => {
  if (!userId) {
    return getRandomAnimalAvatar();
  }
  // Generate a consistent index based on user ID
  const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return getAnimalAvatarByIndex(hash);
};

// Validate if a string is a valid emoji
export const isValidEmoji = (str) => {
  if (!str || typeof str !== 'string') return false;
  // Simple emoji regex - matches most common emojis
  const emojiRegex = /^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F)$/u;
  return emojiRegex.test(str.trim());
};
