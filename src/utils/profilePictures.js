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
];

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
