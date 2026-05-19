// Avatars are generated locally as gradient SVG data URLs. No remote requests,
// works offline, deterministic per user id.

const makeGradientAvatar = (color1, color2) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="${color1}"/><stop offset="100%" stop-color="${color2}"/></linearGradient></defs><rect width="200" height="200" fill="url(#g)"/></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

export const animalAvatars = [
  ['#FF6B6B', '#FFE66D'],
  ['#374151', '#F9FAFB'],
  ['#D97706', '#FED7AA'],
  ['#F97316', '#FDBA74'],
  ['#9CA3AF', '#F3F4F6'],
  ['#10B981', '#A7F3D0'],
  ['#7C2D12', '#FDE68A'],
  ['#1E40AF', '#DBEAFE'],
  ['#DC2626', '#FECACA'],
  ['#7C3AED', '#DDD6FE'],
  ['#A16207', '#FEF3C7'],
  ['#92400E', '#FDE68A'],
  ['#1F2937', '#9CA3AF'],
  ['#E5E7EB', '#F9FAFB'],
  ['#FBBF24', '#FDE68A']
].map(([a, b]) => makeGradientAvatar(a, b));

export const natureAvatars = [
  ['#EC4899', '#FBCFE8'],
  ['#475569', '#CBD5E1'],
  ['#16A34A', '#86EFAC'],
  ['#F97316', '#FED7AA'],
  ['#15803D', '#86EFAC'],
  ['#0EA5E9', '#BAE6FD'],
  ['#166534', '#4ADE80'],
  ['#0284C7', '#7DD3FC']
].map(([a, b]) => makeGradientAvatar(a, b));

export const abstractAvatars = [
  ['#8B5CF6', '#C4B5FD'],
  ['#EC4899', '#F9A8D4'],
  ['#06B6D4', '#67E8F9'],
  ['#F59E0B', '#FCD34D'],
  ['#10B981', '#6EE7B7'],
  ['#EF4444', '#FCA5A5']
].map(([a, b]) => makeGradientAvatar(a, b));

export const imageCategories = {
  animals: { name: 'Animals', icon: '🐾', images: animalAvatars },
  nature: { name: 'Nature', icon: '🌿', images: natureAvatars },
  abstract: { name: 'Abstract', icon: '🎨', images: abstractAvatars }
};

export const getRandomAnimalAvatar = () => {
  const randomIndex = Math.floor(Math.random() * animalAvatars.length);
  return animalAvatars[randomIndex];
};

export const getAnimalAvatarByIndex = (index) => {
  return animalAvatars[index % animalAvatars.length];
};

export const getUserAvatar = (userId) => {
  if (!userId) {
    return getRandomAnimalAvatar();
  }
  const hash = userId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return getAnimalAvatarByIndex(hash);
};

export const isValidImageUrl = (str) => {
  if (!str || typeof str !== 'string') return false;
  if (str.startsWith('data:image/')) return true;
  try {
    new URL(str);
    return true;
  } catch {
    return false;
  }
};

export const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
  });
};
