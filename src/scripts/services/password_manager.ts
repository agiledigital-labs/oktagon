/**
 * @param length a number involving the length of the password
 * @returns a string of set length containing random charachters
 */
export const generatePassword = (length: number): string => {
  return length > 0
    ? randomChar() + generatePassword(length - 1)
    : randomChar();
};

// eslint-disable-next-line functional/functional-parameters
export const randomChar = (): string => {
  const ordinal = Math.round(Math.random() * 61);

  return String.fromCharCode(
    ordinal < 10 ? ordinal + 48 : ordinal < 36 ? ordinal + 55 : ordinal + 61
  );
};
