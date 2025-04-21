export const cuisineTranslations: Record<string, string> = {
  // Food cuisines
  'Japanese': 'อาหารญี่ปุ่น',
  'Buffet': 'บุฟเฟ่ต์',
  'Thai': 'อาหารไทย',
  'Chinese': 'อาหารจีน',
  'Italian': 'อาหารอิตาเลียน',
  'Korean': 'อาหารเกาหลี',
  'American': 'อาหารอเมริกัน',
  'Indian': 'อาหารอินเดีย',
  'Fast Food': 'ฟาสต์ฟู้ด',
  'Seafood': 'อาหารทะเล',
  'Vegetarian': 'อาหารมังสวิรัติ',
  'Steak': 'สเต็ก',
  'BBQ': 'บาร์บีคิว',
  'Pizza': 'พิซซ่า',
  'Pasta': 'พาสต้า',
  'Burger': 'เบอร์เกอร์',
  'Cafe': 'คาเฟ่',
  'Bakery': 'เบเกอรี่',
  'Dessert': 'ของหวาน',
  'IceCream': 'ไอศกรีม',
  'Ramen': 'ราเมง',
  'Sushi': 'ซูชิ',
  'Noodles': 'ก๋วยเตี๋ยว',
  'HotPot': 'หม้อไฟ',
  'Shabu': 'ชาบู',
  'BBQBuffet': 'หมูกระทะ',
  'GrillBuffet': 'บุฟเฟ่ต์ปิ้งย่าง',
  'DimSum': 'ติ่มซำ',
  'Esan': 'อาหารอีสาน',
  
  // Default fallback
  'Other': 'อื่นๆ'
};

/**
 * Translates an English cuisine type to Thai
 * @param cuisine The English cuisine type from the database
 * @returns The Thai translation or the original string if no translation exists
 */
export const translateCuisine = (cuisine: string): string => {
  // First try exact match
  if (cuisineTranslations[cuisine]) {
    return cuisineTranslations[cuisine];
  }
  
  // If no exact match, try case-insensitive match
  const lowerCuisine = cuisine.toLowerCase();
  const key = Object.keys(cuisineTranslations).find(
    k => k.toLowerCase() === lowerCuisine
  );
  
  if (key) {
    return cuisineTranslations[key];
  }
  
  // Return original if no translation found
  return cuisine;
};

/**
 * Translates a Thai cuisine type to English
 * @param thaiCuisine The Thai cuisine name
 * @returns The English translation or the original string if no translation exists
 */
export const translateThaiToEnglish = (thaiCuisine: string): string => {
  // First check if it's already English
  if (Object.keys(cuisineTranslations).includes(thaiCuisine)) {
    return thaiCuisine;
  }
  
  // Try to find the Thai cuisine in the values
  const thaiLower = thaiCuisine.toLowerCase();
  const englishKey = Object.keys(cuisineTranslations).find(
    key => cuisineTranslations[key].toLowerCase() === thaiLower
  );
  
  if (englishKey) {
    return englishKey;
  }
  
  // If no translation found, return the original string
  return thaiCuisine;
};

/**
 * Translates an array of English cuisine types to Thai
 * @param cuisines Array of English cuisine types
 * @returns Array of Thai translations
 */
export const translateCuisines = (cuisines: string[]): string[] => {
  return cuisines.map(cuisine => translateCuisine(cuisine));
};