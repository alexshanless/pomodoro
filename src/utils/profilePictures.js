// Animal profile pictures using curated image URLs
export const animalAvatars = [
  'https://images.unsplash.com/photo-1474511320723-9a56873867b5?w=200&h=200&fit=crop', // Fox
  'https://images.unsplash.com/photo-1564349683136-77e08dba1ef7?w=200&h=200&fit=crop', // Panda
  'https://images.unsplash.com/photo-1614027164847-1b28cfe1df60?w=200&h=200&fit=crop', // Lion
  'https://images.unsplash.com/photo-1551969014-7d2c4cddf0b6?w=200&h=200&fit=crop', // Tiger
  'https://images.unsplash.com/photo-1459262838948-3e2de6c1ec80?w=200&h=200&fit=crop', // Koala
  'https://images.unsplash.com/photo-1503665118429-fe1531eb1505?w=200&h=200&fit=crop', // Frog
  'https://images.unsplash.com/photo-1606567595334-d39972c85dbe?w=200&h=200&fit=crop', // Owl
  'https://images.unsplash.com/photo-1551986782-d0169b3f8fa7?w=200&h=200&fit=crop', // Penguin
  'https://images.unsplash.com/photo-1552728089-57bdde30beb3?w=200&h=200&fit=crop', // Parrot
  'https://images.unsplash.com/photo-1545671913-b89ac1b4ac10?w=200&h=200&fit=crop', // Octopus
  'https://images.unsplash.com/photo-1540573133985-87b6da6d54a9?w=200&h=200&fit=crop', // Monkey
  'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=200&h=200&fit=crop', // Dog
  'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=200&h=200&fit=crop', // Cat
  'https://images.unsplash.com/photo-1585110396000-c9ffd4e4b308?w=200&h=200&fit=crop', // Rabbit
  'https://images.unsplash.com/photo-1588943211346-0908a1fb0b01?w=200&h=200&fit=crop', // Bunny
];

// Nature profile pictures
export const natureAvatars = [
  'https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=200&h=200&fit=crop', // Flowers
  'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=200&h=200&fit=crop', // Mountain
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=200&h=200&fit=crop', // Landscape
  'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=200&h=200&fit=crop', // Sunset
  'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=200&h=200&fit=crop', // Forest
  'https://images.unsplash.com/photo-1505142468610-359e7d316be0?w=200&h=200&fit=crop', // Beach
  'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=200&h=200&fit=crop', // Trees
  'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=200&h=200&fit=crop', // Lake
];

// Abstract/Artistic profile pictures
export const abstractAvatars = [
  'https://images.unsplash.com/photo-1557672172-298e090bd0f1?w=200&h=200&fit=crop', // Abstract 1
  'https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?w=200&h=200&fit=crop', // Abstract 2
  'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=200&h=200&fit=crop', // Abstract 3
  'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=200&h=200&fit=crop', // Abstract 4
  'https://images.unsplash.com/photo-1567095761054-7a02e69e5c43?w=200&h=200&fit=crop', // Abstract 5
  'https://images.unsplash.com/photo-1506318137071-a8e063b4bec0?w=200&h=200&fit=crop', // Abstract 6
];

// All categories
export const imageCategories = {
  animals: { name: 'Animals', icon: '🐾', images: animalAvatars },
  nature: { name: 'Nature', icon: '🌿', images: natureAvatars },
  abstract: { name: 'Abstract', icon: '🎨', images: abstractAvatars }
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

// Validate if a string is a valid image URL or data URL
export const isValidImageUrl = (str) => {
  if (!str || typeof str !== 'string') return false;
  // Check if it's a data URL (base64)
  if (str.startsWith('data:image/')) return true;
  // Check if it's a valid URL
  try {
    new URL(str);
    return true;
  } catch {
    return false;
  }
};

// Convert file to base64
export const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
  });
};
