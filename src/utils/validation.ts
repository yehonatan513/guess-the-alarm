export const validateUsername = (name: string) => {
  const regex = /^[a-zA-Z0-9א-ת._-]{3,15}$/;
  if (!name) return "אנא הזן שם משתמש";
  if (!regex.test(name)) return "שם משתמש חייב להיות 3-15 תווים (ללא רווחים)";
  return null;
};
