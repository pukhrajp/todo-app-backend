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
