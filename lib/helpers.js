export function generateOtp() {
  const usedNumbers = new Set();

  while (true) {
    const randomNumber = Math.floor(Math.random() * 900000) + 100000;
    if (!usedNumbers.has(randomNumber)) {
      usedNumbers.add(randomNumber);
      return randomNumber;
    }
  }
}

export function getUserByToken(users, req) {
  const token = req.headers.authorization; // Assuming the token
  if (!token) {
    return null;
  }
  return users.find((u) => {
    if (u.tokens) {
      return u.tokens.includes(token.split(" ")[1]);
    }
    return false;
  });
}

export function getUserByToken1(users, req) {
  const authorizationValue = req.headers.authorization; // Assuming the token is sent in the Authorization header
  const token = authorizationValue ? authorizationValue.split(" ")[1] : null; // Extract
  if (!token) {
    return null;
  }
  const user = users.find((u) => u.tokens && u.tokens.includes(token));
  if (!user) {
    return null;
  }
  return user;
}
