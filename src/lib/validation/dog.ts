export function validateDogInput(input: { name: string; breed: string | null }): string | null {
  if (!input.name || input.name.trim().length === 0) {
    return "Dog name is required";
  }
  if (input.name.length > 50) {
    return "Dog name too long (max 50 characters)";
  }
  if (input.breed && input.breed.length > 100) {
    return "Breed name too long";
  }
  return null;
}
