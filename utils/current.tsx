export const addPoints = (amount: string) => {
  const cleanNumber = amount.replace(/\./g, "");
  return new Intl.NumberFormat("es-CO").format(Number(cleanNumber));
};

export const formatAmount = (amount: number, locale: string = "es-CO"): string => {
  return new Intl.NumberFormat(locale).format(amount);
};

export const parseAmount = (input: string, locale: string = "es-CO"): number => {
  const withoutThousands = input.replace(/\./g, "");
  const normalized = withoutThousands.replace(/,/g, ".");
  const result = parseInt(normalized, 10);
  return isNaN(result) ? 0 : result;
};
